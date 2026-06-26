# ============================================================
#
# ENDPOINTS :
#   POST /api/paiements/initier/           → initie MTN ou Orange
#   POST /api/paiements/webhook/mtn/       → confirmation MTN
#   POST /api/paiements/webhook/orange/    → confirmation Orange
#   GET  /api/paiements/statut/{id}/       → polling frontend
# ============================================================

from rest_framework          import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils            import timezone
from django.http             import HttpResponse

from .models                 import Paiement
from .operateurs             import MTNMoMoClient, OrangeMoneyClient
from .sms                    import envoyer_sms_confirmation
from reservations.models     import Reservation
import logging, io

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initier_paiement(request):
    """
    POST /api/paiements/initier/

    Initie un paiement MTN MoMo ou Orange Money.
    Crée l'objet Paiement EN_ATTENTE puis appelle l'opérateur.
    """
    reservation_id = request.data.get('reservation')
    methode        = request.data.get('methode')
    telephone      = request.data.get('telephone', '').replace(' ', '')
    montant        = request.data.get('montant')

    if not all([reservation_id, methode, telephone, montant]):
        return Response({'erreur': 'Tous les champs sont obligatoires.'}, status=400)

    try:
        reservation = Reservation.objects.get(id=reservation_id, utilisateur=request.user)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Réservation introuvable.'}, status=404)

    # Vérifie si déjà payé
    if hasattr(reservation, 'paiement') and reservation.paiement.statut == 'CONFIRME':
        return Response({'erreur': 'Cette réservation est déjà payée.'}, status=400)

    # Crée (ou récupère) l'objet Paiement
    paiement, _ = Paiement.objects.get_or_create(
        reservation = reservation,
        defaults    = {
            'methode'            : methode,
            'telephone_paiement' : telephone,
            'montant'            : montant,
            'statut'             : Paiement.StatutChoices.EN_ATTENTE,
        }
    )
    # Met à jour si déjà existant
    if paiement.statut == Paiement.StatutChoices.ECHOUE:
        paiement.methode             = methode
        paiement.telephone_paiement  = telephone
        paiement.statut              = Paiement.StatutChoices.EN_ATTENTE
        paiement.save()

    # ── Appel à l'opérateur ───────────────────────────────────
    if methode == 'MTN_MOMO':
        client    = MTNMoMoClient()
        resultat  = client.request_to_pay(montant, telephone, paiement.reference_interne)
    elif methode == 'ORANGE_MONEY':
        client    = OrangeMoneyClient()
        resultat  = client.initiate_payment(montant, telephone, paiement.reference_interne)
    else:
        return Response({'erreur': 'Méthode de paiement inconnue.'}, status=400)

    if resultat.get('succes'):
        return Response({
            'succes'               : True,
            'reference_transaction': str(paiement.reference_interne),
            'message'              : resultat.get('message', ''),
            'payment_url'          : resultat.get('payment_url'),  # Orange uniquement
        })
    else:
        paiement.statut = Paiement.StatutChoices.ECHOUE
        paiement.save()
        return Response({'erreur': resultat.get('message', 'Erreur opérateur.')}, status=503)


@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_mtn(request):
    """
    POST /api/paiements/webhook/mtn/

    Reçu par MTN MoMo quand l'utilisateur a validé (ou rejeté).
    MTN envoie : { externalId, status, ... }
    """
    external_id      = request.data.get('externalId') or request.data.get('referenceId')
    statut_operateur = request.data.get('status', '')
    reference_op     = request.data.get('financialTransactionId', '')

    logger.info(f"Webhook MTN reçu: externalId={external_id}, status={statut_operateur}")

    try:
        paiement = Paiement.objects.select_related('reservation', 'reservation__utilisateur').get(
            reference_interne=external_id
        )
    except Paiement.DoesNotExist:
        return Response({'erreur': 'Paiement introuvable.'}, status=404)

    if statut_operateur == 'SUCCESSFUL':
        _confirmer_paiement(paiement, reference_op)
    elif statut_operateur in ['FAILED', 'REJECTED', 'TIMEOUT']:
        paiement.statut              = Paiement.StatutChoices.ECHOUE
        paiement.reference_operateur = reference_op
        paiement.save()

    return Response({'succes': True})


@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_orange(request):
    """
    POST /api/paiements/webhook/orange/

    Reçu par Orange Money après paiement.
    Orange envoie : { status, txnid, orderid, ... }
    """
    statut_operateur = request.data.get('status', '')
    order_id         = request.data.get('orderid', '')
    txn_id           = request.data.get('txnid', '')

    logger.info(f"Webhook Orange reçu: orderid={order_id}, status={statut_operateur}")

    try:
        paiement = Paiement.objects.select_related('reservation', 'reservation__utilisateur').get(
            reference_interne__startswith=order_id[:16]
        )
    except Paiement.DoesNotExist:
        return Response({'erreur': 'Paiement introuvable.'}, status=404)

    if statut_operateur == 'SUCCESS':
        _confirmer_paiement(paiement, txn_id)
    else:
        paiement.statut = Paiement.StatutChoices.ECHOUE
        paiement.save()

    return Response({'succes': True})


def _confirmer_paiement(paiement, reference_operateur):
    """
    Fonction partagée : confirme un paiement et envoie le SMS.
    Appelée par les deux webhooks (MTN et Orange).
    """
    paiement.statut              = Paiement.StatutChoices.CONFIRME
    paiement.reference_operateur = reference_operateur
    paiement.date_confirmation   = timezone.now()
    paiement.save()

    reservation = paiement.reservation
    reservation.statut_paiement = 'CONFIRME'
    reservation.save()

    # Envoi SMS de confirmation
    voyage = reservation.voyage
    envoyer_sms_confirmation(
        telephone     = paiement.telephone_paiement,
        numero_billet = str(reservation.numero_billet),
        trajet        = f"{voyage.get_ville_depart_display()} → {voyage.get_ville_arrivee_display()}",
        date_depart   = voyage.date_heure_depart.strftime('%d/%m/%Y a %Hh%M'),
        siege         = reservation.numero_siege,
    )
    logger.info(f"Paiement {paiement.reference_interne} confirmé → Réservation #{reservation.id}")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statut_paiement(request, reservation_id):
    """GET /api/paiements/statut/{reservation_id}/"""
    try:
        reservation = Reservation.objects.get(id=reservation_id, utilisateur=request.user)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Introuvable.'}, status=404)
    return Response({'statut': reservation.statut_paiement})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generer_billet_pdf(request, reservation_id):
    """GET /api/reservations/{id}/billet-pdf/"""
    try:
        from reportlab.pdfgen      import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib         import colors

        reservation = Reservation.objects.select_related(
            'voyage', 'voyage__agence', 'voyage__bus', 'utilisateur'
        ).get(id=reservation_id, utilisateur=request.user)

        if reservation.statut_paiement != 'CONFIRME':
            return Response({'erreur': 'Billet disponible uniquement après confirmation du paiement.'}, status=400)

        buffer = io.BytesIO()
        p      = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # En-tête vert
        p.setFillColor(colors.HexColor('#1B4332'))
        p.rect(0, height - 110, width, 110, fill=True, stroke=False)

        p.setFillColor(colors.white)
        p.setFont('Helvetica-Bold', 26)
        p.drawString(40, height - 50, 'BusCam')
        p.setFillColor(colors.HexColor('#F4A100'))
        p.setFont('Helvetica', 11)
        p.drawString(40, height - 68, 'Billet de voyage officiel')

        # Numéro billet (coin haut droite)
        p.setFillColor(colors.white)
        p.setFont('Helvetica', 8)
        p.drawRightString(width - 40, height - 50, f"N° {str(reservation.numero_billet).upper()[:18]}")

        # Trajet
        voyage = reservation.voyage
        p.setFillColor(colors.HexColor('#1B4332'))
        p.setFont('Helvetica-Bold', 20)
        p.drawString(40, height - 165, voyage.get_ville_depart_display())
        p.setFont('Helvetica', 15)
        p.drawString(width // 2 - 15, height - 160, '→')
        p.setFont('Helvetica-Bold', 20)
        p.drawRightString(width - 40, height - 165, voyage.get_ville_arrivee_display())

        # Séparateur
        p.setStrokeColor(colors.HexColor('#E5E7EB'))
        p.line(40, height - 185, width - 40, height - 185)

        # Infos
        infos = [
            ('Date de départ',  voyage.date_heure_depart.strftime('%d/%m/%Y à %Hh%M')),
            ('Agence',          voyage.agence.nom),
            ('Bus',             voyage.bus.immatriculation),
            ('Siège',           f'N°{reservation.numero_siege}'),
            ('Voyageur',        reservation.utilisateur.get_full_name() or reservation.utilisateur.username),
            ('Téléphone',       reservation.utilisateur.telephone),
            ('Montant payé',    f'{int(reservation.montant_paye):,} FCFA'.replace(',', ' ')),
            ('Statut',          'CONFIRMÉ ✓'),
        ]
        y = height - 225
        for label, valeur in infos:
            p.setFillColor(colors.HexColor('#6B7280'))
            p.setFont('Helvetica', 9)
            p.drawString(40, y, label.upper())
            p.setFillColor(colors.HexColor('#1C1C1E'))
            p.setFont('Helvetica-Bold', 11)
            p.drawString(200, y, str(valeur))
            y -= 26

        # Billet complet (bas)
        p.setStrokeColor(colors.HexColor('#E5E7EB'))
        p.line(40, y - 10, width - 40, y - 10)
        p.setFillColor(colors.HexColor('#6B7280'))
        p.setFont('Helvetica', 8)
        p.drawString(40, y - 28, 'N° BILLET COMPLET :')
        p.setFillColor(colors.HexColor('#1B4332'))
        p.setFont('Helvetica-Bold', 9)
        p.drawString(40, y - 44, str(reservation.numero_billet).upper())

        # Pied de page
        p.setFillColor(colors.HexColor('#9CA3AF'))
        p.setFont('Helvetica', 8)
        p.drawString(40, 35, 'BusCam — Plateforme de réservation de bus au Cameroun')
        p.drawRightString(width - 40, 35, 'support@buscam.cm | +237 6 99 00 00 00')

        p.showPage()
        p.save()
        buffer.seek(0)

        nom = f"BusCam-{str(reservation.numero_billet)[:8].upper()}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    except ImportError:
        return Response({'erreur': 'ReportLab non installé. Faites : pip install reportlab'}, status=500)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Billet introuvable.'}, status=404)

