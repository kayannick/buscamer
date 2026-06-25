# ============================================================
# backend/paiements/views.py
#
# RÔLE : Endpoints pour initier et confirmer les paiements.
#
# ENDPOINTS :
#   POST /api/paiements/initier/  → Initie une transaction Mobile Money
#   POST /api/paiements/webhook/  → Reçoit la confirmation de l'opérateur
#
# COMMENT ÇA MARCHE (Flow Mobile Money) :
#
#   1. Frontend → POST /api/paiements/initier/
#      { reservation, methode, telephone, montant }
#
#   2. Django crée un objet Paiement(statut=EN_ATTENTE)
#      et appelle l'API de l'opérateur (MTN ou Orange)
#
#   3. L'opérateur envoie un SMS à l'utilisateur
#
#   4. L'utilisateur valide sur son téléphone
#
#   5. L'opérateur appelle notre webhook :
#      POST /api/paiements/webhook/
#      { reference_operateur, statut: "SUCCESS", ... }
#
#   6. Django met à jour Paiement.statut → CONFIRME
#      et Reservation.statut_paiement → CONFIRME
#
# NOTE : En développement, le webhook est simulé.
#        En production, l'URL du webhook doit être enregistrée
#        dans le portail développeur MTN/Orange.
#
# INTERACTIONS :
#   ← Utilise : paiements/models.py, reservations/models.py
#   ← Routé par : paiements/urls.py
# ============================================================

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Paiement
from reservations.models import Reservation
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initier_paiement(request):
    """
    Initier une transaction de paiement Mobile Money.

    ENDPOINT : POST /api/paiements/initier/

    BODY :
      {
        "reservation"  : 5,           (ID de la réservation)
        "methode"      : "MTN_MOMO",  (ou "ORANGE_MONEY")
        "telephone"    : "699000000", (numéro sans +237)
        "montant"      : "3500.00"
      }

    RETOUR (succès) :
      {
        "succes"               : true,
        "reference_transaction": "uuid...",
        "message"              : "SMS envoyé au 699000000"
      }
    """
    reservation_id = request.data.get('reservation')
    methode        = request.data.get('methode')
    telephone      = request.data.get('telephone')
    montant        = request.data.get('montant')

    # ── Validation des données ────────────────────────────────
    if not all([reservation_id, methode, telephone, montant]):
        return Response(
            {'erreur': 'Tous les champs sont obligatoires.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier que la réservation appartient à l'utilisateur
    try:
        reservation = Reservation.objects.get(
            id           = reservation_id,
            utilisateur  = request.user,
        )
    except Reservation.DoesNotExist:
        return Response(
            {'erreur': 'Réservation introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Vérifier qu'un paiement n'existe pas déjà
    if hasattr(reservation, 'paiement') and \
       reservation.paiement.statut == Paiement.StatutChoices.CONFIRME:
        return Response(
            {'erreur': 'Cette réservation est déjà payée.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Création de l'objet Paiement ──────────────────────────
    paiement = Paiement.objects.create(
        reservation        = reservation,
        methode            = methode,
        telephone_paiement = telephone,
        montant            = montant,
        statut             = Paiement.StatutChoices.EN_ATTENTE,
    )

    # ── Appel à l'API de l'opérateur ─────────────────────────
    # En DÉVELOPPEMENT : on simule le succès immédiatement
    # En PRODUCTION : remplacez par l'appel réel à l'API MTN/Orange
    #
    # MTN MoMo API (sandbox) :
    #   https://developer.mtn.com/products/momo-api
    #   Endpoint : POST /collection/v1_0/requesttopay
    #
    # Orange Money Cameroun :
    #   https://developer.orange.com/apis/om-webpay-cm/getting-started
    #   Endpoint : POST /orange-money-webpay/CM/v1/webpayment

    succes_simulation = True  # ← Remplacer par l'appel API réel

    if succes_simulation:
        logger.info(
            f"Paiement {paiement.reference_interne} initié "
            f"via {methode} pour {telephone}"
        )
        return Response({
            'succes'               : True,
            'reference_transaction': str(paiement.reference_interne),
            'message'              : f"SMS envoyé au +237 {telephone}. "
                                     f"Validez le paiement sur votre téléphone.",
        })
    else:
        # L'appel API a échoué
        paiement.statut = Paiement.StatutChoices.ECHOUE
        paiement.save()
        return Response(
            {'erreur': 'Échec de la connexion à l\'opérateur. Réessayez.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_paiement(request):
    """
    Webhook appelé par l'opérateur (MTN ou Orange) pour confirmer
    ou infirmer un paiement.

    ENDPOINT : POST /api/paiements/webhook/

    ⚠️ SÉCURITÉ : En production, vérifiez la signature de la requête
    avec la clé secrète fournie par l'opérateur (header X-Signature).

    BODY (exemple MTN) :
      {
        "reference_interne"   : "uuid...",
        "reference_operateur" : "MTN-TXN-12345",
        "statut"              : "SUCCESS"  (ou "FAILED")
      }
    """
    reference_interne   = request.data.get('reference_interne')
    reference_operateur = request.data.get('reference_operateur')
    statut_operateur    = request.data.get('statut')

    # ── Trouver le paiement ───────────────────────────────────
    try:
        paiement = Paiement.objects.select_related('reservation').get(
            reference_interne=reference_interne
        )
    except Paiement.DoesNotExist:
        logger.warning(f"Webhook reçu pour référence inconnue: {reference_interne}")
        return Response({'erreur': 'Paiement introuvable.'}, status=404)

    # ── Mettre à jour selon la réponse de l'opérateur ─────────
    if statut_operateur == 'SUCCESS':
        # Paiement confirmé par l'opérateur
        paiement.statut              = Paiement.StatutChoices.CONFIRME
        paiement.reference_operateur = reference_operateur
        paiement.date_confirmation   = timezone.now()
        paiement.save()

        # Confirmer aussi la réservation
        reservation = paiement.reservation
        reservation.statut_paiement = 'CONFIRME'
        reservation.save()

        logger.info(
            f"Paiement {reference_interne} confirmé. "
            f"Réservation #{reservation.id} → CONFIRME"
        )
        return Response({'succes': True, 'message': 'Paiement confirmé.'})

    else:
        # Paiement échoué ou annulé
        paiement.statut              = Paiement.StatutChoices.ECHOUE
        paiement.reference_operateur = reference_operateur
        paiement.save()

        logger.warning(f"Paiement {reference_interne} échoué: {statut_operateur}")
        return Response({'succes': False, 'message': 'Paiement échoué.'})
    
    
    
# ===========================================================
# Nouveaux endpoints : statut + PDF + SMS
# ============================================================

from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
import io

# pip install reportlab
# Ajouter 'reportlab' dans requirements.txt


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statut_paiement(request, reservation_id):
    """
    GET /api/paiements/statut/{reservation_id}/

    RÔLE : Permet au frontend de vérifier (polling) si le paiement
           a été confirmé par l'opérateur via webhook.

    RETOUR :
      { "statut": "EN_ATTENTE" | "CONFIRME" | "ECHOUE" }
    """
    try:
        reservation = Reservation.objects.get(
            id         = reservation_id,
            utilisateur = request.user,
        )
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Réservation introuvable.'}, status=404)

    # Retourne le statut de paiement de la réservation
    return Response({ 'statut': reservation.statut_paiement })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generer_billet_pdf(request, reservation_id):
    """
    GET /api/reservations/{id}/billet-pdf/

    RÔLE : Génère et retourne un PDF du billet de voyage.
           Uniquement accessible par le propriétaire du billet.

    RETOUR : fichier PDF binaire (Content-Type: application/pdf)
    """
    try:
        reservation = Reservation.objects.select_related(
            'voyage', 'voyage__agence', 'voyage__bus', 'utilisateur'
        ).get(id=reservation_id, utilisateur=request.user)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Billet introuvable.'}, status=404)

    if reservation.statut_paiement != 'CONFIRME':
        return Response(
            {'erreur': 'Le billet n\'est disponible qu\'après confirmation du paiement.'},
            status=400
        )

    # ── Génération du PDF avec ReportLab ─────────────────────
    buffer = io.BytesIO()
    p      = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # ── Fond vert en-tête ─────────────────────────────────────
    p.setFillColor(colors.HexColor('#1B4332'))
    p.rect(0, height - 120, width, 120, fill=True, stroke=False)

    # ── Logo texte ────────────────────────────────────────────
    p.setFillColor(colors.white)
    p.setFont('Helvetica-Bold', 28)
    p.drawString(40, height - 55, 'BusCam')

    p.setFillColor(colors.HexColor('#F4A100'))
    p.setFont('Helvetica', 12)
    p.drawString(40, height - 75, 'Billet de voyage officiel')

    # ── Numéro de billet ──────────────────────────────────────
    p.setFillColor(colors.white)
    p.setFont('Helvetica', 9)
    p.drawRightString(width - 40, height - 55, f'N° {str(reservation.numero_billet).upper()[:18]}')

    # ── Trajet principal ──────────────────────────────────────
    voyage = reservation.voyage
    p.setFillColor(colors.HexColor('#1B4332'))
    p.setFont('Helvetica-Bold', 22)
    p.drawString(40, height - 180, voyage.get_ville_depart_display())

    p.setFont('Helvetica', 16)
    p.drawString(width // 2 - 20, height - 175, '→')

    p.setFont('Helvetica-Bold', 22)
    p.drawRightString(width - 40, height - 180, voyage.get_ville_arrivee_display())

    # ── Ligne séparatrice ─────────────────────────────────────
    p.setStrokeColor(colors.HexColor('#E5E7EB'))
    p.line(40, height - 200, width - 40, height - 200)

    # ── Grille d'informations ─────────────────────────────────
    infos = [
        ('Date de départ',    voyage.date_heure_depart.strftime('%d/%m/%Y à %Hh%M')),
        ('Agence',            voyage.agence.nom),
        ('Bus',               voyage.bus.immatriculation),
        ('Type',              voyage.bus.get_type_bus_display()),
        ('N° de siège',       f'Siège {reservation.numero_siege}'),
        ('Voyageur',          reservation.utilisateur.get_full_name() or reservation.utilisateur.username),
        ('Téléphone',         reservation.utilisateur.telephone),
        ('Montant payé',      f'{reservation.montant_paye} FCFA'),
        ('Statut',            'CONFIRMÉ ✓'),
    ]

    y = height - 240
    for label, valeur in infos:
        p.setFillColor(colors.HexColor('#6B7280'))
        p.setFont('Helvetica', 9)
        p.drawString(40, y, label.upper())

        p.setFillColor(colors.HexColor('#1C1C1E'))
        p.setFont('Helvetica-Bold', 11)
        p.drawString(200, y, str(valeur))

        y -= 28

    # ── Numéro de billet complet (bas de page) ────────────────
    p.setStrokeColor(colors.HexColor('#E5E7EB'))
    p.line(40, y - 10, width - 40, y - 10)

    p.setFillColor(colors.HexColor('#6B7280'))
    p.setFont('Helvetica', 8)
    p.drawString(40, y - 30, 'N° BILLET COMPLET :')

    p.setFillColor(colors.HexColor('#1B4332'))
    p.setFont('Helvetica-Bold', 10)
    p.drawString(40, y - 48, str(reservation.numero_billet).upper())

    # ── Pied de page ──────────────────────────────────────────
    p.setFillColor(colors.HexColor('#9CA3AF'))
    p.setFont('Helvetica', 8)
    p.drawString(40, 40, 'BusCam — Plateforme de réservation de bus au Cameroun')
    p.drawRightString(width - 40, 40, 'support@buscam.cm | +237 6 99 00 00 00')

    p.showPage()
    p.save()

    buffer.seek(0)

    # ── Réponse HTTP avec le PDF ──────────────────────────────
    nom_fichier = f"BusCam-Billet-{str(reservation.numero_billet)[:8].upper()}.pdf"
    response    = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'

    return response    
    