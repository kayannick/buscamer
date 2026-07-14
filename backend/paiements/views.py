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



# ============================================================
#  — PAIEMENT ESPÈCES AGENT UNIQUEMENT
#
# NOUVEAU ENDPOINT :
#   PATCH /api/agent/reservations/{id}/valider-especes/
#
# SÉCURITÉ TRIPLE :
#   1. L'utilisateur doit être connecté (IsAuthenticated)
#   2. L'utilisateur doit avoir le role='AGENT'
#   3. La réservation doit appartenir au voyage de SON agence
#      (pas celui d'une autre agence)
#
# FLUX :
#   Agent voit un billet EN_ATTENTE avec mode espèces
#   → clique "Valider paiement espèces"
#   → PATCH /api/agent/reservations/{id}/valider-especes/
#   → Django vérifie que c'est bien son agence
#   → statut_paiement passe à CONFIRME
#   → SMS envoyé au voyageur
# ============================================================

from rest_framework.decorators  import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response    import Response
from django.utils               import timezone
from reservations.models        import Reservation
from voyages.views_agent        import get_agence_agent
from .sms                       import envoyer_sms_confirmation
import logging

logger = logging.getLogger(__name__)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def valider_paiement_especes(request, reservation_id):
    """
    PATCH /api/agent/reservations/{id}/valider-especes/

    Valide un paiement en espèces.
    ACCESSIBLE UNIQUEMENT par l'agent de l'agence concernée.

    BODY : {} (vide, pas de données requises)

    RETOUR :
      { 'succes': true, 'message': '...', 'nouveau_statut': 'CONFIRME' }
    """

    # ── VÉRIFICATION 1 : utilisateur connecté ────────────────
    # (garanti par @permission_classes([IsAuthenticated]))

    # ── VÉRIFICATION 2 : utilisateur est un agent ────────────
    if request.user.role != 'AGENT':
        return Response(
            {'erreur': 'Accès réservé aux agents d\'agence uniquement.'},
            status=403
        )

    # ── VÉRIFICATION 3 : l'agent a une agence ────────────────
    agence = get_agence_agent(request)
    if not agence:
        return Response(
            {'erreur': 'Aucune agence associée à votre compte. '
                       'Contactez l\'administrateur.'},
            status=403
        )

    # ── RÉCUPÉRATION DE LA RÉSERVATION ───────────────────────
    try:
        reservation = Reservation.objects.select_related(
            'voyage', 'voyage__agence', 'utilisateur'
        ).get(id=reservation_id)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Réservation introuvable.'}, status=404)

    # ── VÉRIFICATION 4 : la réservation appartient à son agence
    if reservation.voyage.agence.id != agence.id:
        logger.warning(
            f"Agent {request.user.username} (agence: {agence.nom}) "
            f"a tenté de valider la réservation #{reservation_id} "
            f"de l'agence {reservation.voyage.agence.nom}"
        )
        return Response(
            {'erreur': 'Cette réservation n\'appartient pas à votre agence.'},
            status=403
        )

    # ── VÉRIFICATION 5 : statut compatible ───────────────────
    if reservation.statut_paiement == 'CONFIRME':
        return Response(
            {'erreur': 'Ce billet est déjà confirmé.'},
            status=400
        )
    if reservation.statut_paiement == 'ANNULE':
        return Response(
            {'erreur': 'Ce billet est annulé et ne peut plus être validé.'},
            status=400
        )

    # ── VÉRIFICATION 6 : départ pas encore passé ─────────────
    if reservation.voyage.date_heure_depart <= timezone.now():
        return Response(
            {'erreur': 'Le départ est déjà passé. Validation impossible.'},
            status=400
        )

    # ── VALIDATION ────────────────────────────────────────────
    reservation.statut_paiement = 'CONFIRME'
    reservation.save(update_fields=['statut_paiement'])

    logger.info(
        f"Paiement espèces validé par {request.user.username} "
        f"(agence: {agence.nom}) pour billet "
        f"{str(reservation.numero_billet)[:8].upper()}"
    )

    # ── Envoi SMS de confirmation au voyageur ─────────────────
    try:
        voyage = reservation.voyage
        envoyer_sms_confirmation(
            telephone     = reservation.utilisateur.telephone,
            numero_billet = str(reservation.numero_billet),
            trajet        = (
                f"{voyage.get_ville_depart_display()} → "
                f"{voyage.get_ville_arrivee_display()}"
            ),
            date_depart   = voyage.date_heure_depart.strftime('%d/%m/%Y à %Hh%M'),
            siege         = reservation.numero_siege,
        )
    except Exception as e:
        # L'envoi SMS ne doit pas bloquer la validation
        logger.warning(f"SMS non envoyé après validation espèces: {e}")

    return Response({
        'succes'        : True,
        'message'       : (
            f"Paiement espèces confirmé pour le billet "
            f"{str(reservation.numero_billet)[:8].upper()}. "
            f"SMS envoyé au {reservation.utilisateur.telephone}."
        ),
        'nouveau_statut': 'CONFIRME',
        'billet'        : str(reservation.numero_billet),
    })




# ============================================================


#
# DESIGN INSPIRÉ DES MEILLEURS BILLETS MODERNES :
#   - Carte de style boarding pass (billet d'avion)
#   - Zone principale + souche détachable
#   - Dégradé de couleur propre à l'agence
#   - Typographie hiérarchisée
#   - Séparateur pointillé avec indication
#   - QR visuel (cercles) représentant le numéro de billet
#   - Pied de page avec contacts agence
#
#  
#   - Pas de polygon() → beginPath/drawPath uniquement
#   - Pas de setDash() sans argument → setDash([])
#   - saveState/restoreState pour l'alpha
# ============================================================

import io
import logging
import traceback
from django.http              import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from reservations.models       import Reservation

logger = logging.getLogger(__name__)


def _verifier_token_jwt(request):
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions     import InvalidToken, TokenError
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    try:
        jwt_auth  = JWTAuthentication()
        validated = jwt_auth.get_validated_token(
            jwt_auth.get_raw_token(jwt_auth.get_header(request))
        )
        return jwt_auth.get_user(validated)
    except Exception:
        return None


def _format_duree(duree):
    try:
        total = int(duree.total_seconds())
        return f"{total // 3600}h{(total % 3600) // 60:02d}"
    except Exception:
        return '-'


@csrf_exempt
def generer_billet_pdf(request, reservation_id):
    """
    GET /api/reservations/{id}/billet-pdf/
    Génère un billet premium style boarding pass.
    Vue Django standard — pas DRF (évite erreur 406).
    """
    if request.method != 'GET':
        return JsonResponse({'erreur': 'Méthode non autorisée.'}, status=405)

    utilisateur = _verifier_token_jwt(request)
    if not utilisateur:
        return JsonResponse({'erreur': 'Authentification requise.'}, status=401)

    try:
        from reportlab.pdfgen        import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib           import colors
        from reportlab.lib.units     import mm
    except ImportError:
        return JsonResponse({'erreur': 'Service PDF indisponible.'}, status=503)

    try:
        reservation = Reservation.objects.select_related(
            'voyage', 'voyage__agence', 'voyage__bus', 'utilisateur'
        ).get(id=reservation_id, utilisateur=utilisateur)
    except Reservation.DoesNotExist:
        return JsonResponse({'erreur': 'Billet introuvable.'}, status=404)

    if reservation.statut_paiement != 'CONFIRME':
        return JsonResponse(
            {'erreur': 'Billet disponible après confirmation du paiement.'},
            status=400
        )

    voyage       = reservation.voyage
    agence       = voyage.agence
    billet_id    = str(reservation.numero_billet).upper()
    billet_court = billet_id[:8]

    # ── Palette couleurs selon agence ────────────────────────
    PALETTES = {
        0: ('#0F3D2E', '#D4A017'),  # Vert profond + Or antique
        1: ('#1A2E5A', '#C9A227'),  # Bleu marine + Doré
        2: ('#4A1528', '#E8923A'),  # Bordeaux + Cuivre
        3: ('#1B3A1F', '#6CB33F'),  # Vert forêt + Vert clair
        4: ('#1C1654', '#E05C1A'),  # Indigo + Orange
    }
    cp, cs = PALETTES[agence.id % 5]

    # ── Couleurs dérivées ─────────────────────────────────────
    cp_light  = cp + '22'    # version très transparente (non supporté par HexColor)
    # → utiliser saveState/setFillAlpha à la place

    try:
        buffer = io.BytesIO()
        w, h   = A4              # 595 x 842 points
        c      = canvas.Canvas(buffer, pagesize=A4)
        c.setTitle(f"Billet {agence.nom} - {billet_court}")

        # ════════════════════════════════════════════════════
        # FOND GÉNÉRAL
        # ════════════════════════════════════════════════════
        c.setFillColor(colors.HexColor('#F5F5F0'))
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Bordure extérieure double
        c.setStrokeColor(colors.HexColor(cp))
        c.setLineWidth(4)
        c.rect(10, 10, w - 20, h - 20, fill=0, stroke=1)
        c.setStrokeColor(colors.HexColor(cs))
        c.setLineWidth(1)
        c.rect(15, 15, w - 30, h - 30, fill=0, stroke=1)

        # ════════════════════════════════════════════════════
        # EN-TÊTE PREMIUM — fond pleine largeur
        # ════════════════════════════════════════════════════
        header_h = 140
        header_y = h - header_h - 10

        # Fond en-tête couleur principale
        c.setFillColor(colors.HexColor(cp))
        c.rect(10, header_y, w - 20, header_h, fill=1, stroke=0)

        # Bande secondaire en bas de l'en-tête
        c.setFillColor(colors.HexColor(cs))
        c.rect(10, header_y, w - 20, 6, fill=1, stroke=0)

        # Motif géométrique décoratif (losanges)
        c.saveState()
        c.setStrokeColor(colors.white)
        c.setFillAlpha(0)
        c.setStrokeAlpha(0.08)
        c.setLineWidth(1.2)
        for i in range(8):
            x0 = 10 + i * 74
            cy = header_y + header_h / 2
            c.polygon_path = None  # Reset
            p = c.beginPath()
            p.moveTo(x0 + 37, header_y + header_h - 8)
            p.lineTo(x0 + 70, cy)
            p.lineTo(x0 + 37, header_y + 8)
            p.lineTo(x0 + 4,  cy)
            p.close()
            c.drawPath(p, fill=0, stroke=1)
        c.restoreState()

        # ── Logo / Initiale agence ────────────────────────────
        logo_x, logo_y = 30, header_y + 45
        logo_size = 52

        # Fond carré blanc arrondi
        c.setFillColor(colors.white)
        c.roundRect(logo_x, logo_y, logo_size, logo_size, 10, fill=1, stroke=0)

        # Initiale en couleur primaire
        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 28)
        initiale = (agence.nom[0] if agence.nom else 'B').upper()
        c.drawCentredString(logo_x + logo_size / 2, logo_y + 14, initiale)

        # ── Nom et infos agence ───────────────────────────────
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 20)
        c.drawString(logo_x + logo_size + 18, header_y + 87, agence.nom.upper())

        c.saveState()
        c.setFillAlpha(0.7)
        c.setFont('Helvetica', 9)
        c.drawString(logo_x + logo_size + 18, header_y + 70,
                     f"{agence.ville_siege}  ·  {agence.telephone or ''}")
        c.restoreState()

        # ── Badge "BILLET OFFICIEL" ───────────────────────────
        badge_w, badge_h_val = 165, 26
        badge_x = w - badge_w - 30
        badge_y = header_y + 80

        c.setFillColor(colors.HexColor(cs))
        c.roundRect(badge_x, badge_y, badge_w, badge_h_val, 6, fill=1, stroke=0)

        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 9)
        c.drawCentredString(badge_x + badge_w / 2, badge_y + 9,
                            'BILLET DE VOYAGE OFFICIEL')

        # ── Numéro billet court ───────────────────────────────
        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.55)
        c.setFont('Courier-Bold', 9)
        c.drawRightString(w - 30, header_y + 18, f'Ref : {billet_court}')
        c.restoreState()

        # ── BusCam watermark ──────────────────────────────────
        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.08)
        c.setFont('Helvetica-Bold', 60)
        c.drawCentredString(w / 2, header_y + 35, 'BUSCAM')
        c.restoreState()

        # ════════════════════════════════════════════════════
        # SECTION TRAJET — style boarding pass
        # ════════════════════════════════════════════════════
        trajet_y = header_y - 105

        # Fond section trajet
        c.setFillColor(colors.white)
        c.roundRect(20, trajet_y, w - 40, 95, 10, fill=1, stroke=0)

        # Bordure subtile
        c.setStrokeColor(colors.HexColor('#E0E0E0'))
        c.setLineWidth(0.75)
        c.roundRect(20, trajet_y, w - 40, 95, 10, fill=0, stroke=1)

        # Bande colorée gauche (style boarding pass)
        c.setFillColor(colors.HexColor(cp))
        c.roundRect(20, trajet_y, 6, 95, 10, fill=1, stroke=0)

        # ── Ville départ ──────────────────────────────────────
        dep_x = 45
        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 32)
        c.drawString(dep_x, trajet_y + 54, voyage.get_ville_depart_display().upper())

        c.setFillColor(colors.HexColor('#888888'))
        c.setFont('Helvetica', 8)
        c.drawString(dep_x, trajet_y + 42, 'DÉPART')

        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 22)
        c.drawString(dep_x, trajet_y + 18,
                     voyage.date_heure_depart.strftime('%H:%M'))

        c.setFillColor(colors.HexColor('#888888'))
        c.setFont('Helvetica', 8)
        c.drawString(dep_x, trajet_y + 8,
                     voyage.date_heure_depart.strftime('%d %b %Y').upper())

        # ── Séparateur central avec durée ─────────────────────
        mx = w / 2

        # Ligne gauche
        c.setStrokeColor(colors.HexColor('#CCCCCC'))
        c.setLineWidth(1)
        c.line(dep_x + 180, trajet_y + 62, mx - 45, trajet_y + 62)

        # Capsule centrale
        cap_w, cap_h_val = 82, 28
        cap_x = mx - cap_w / 2
        cap_y = trajet_y + 48

        c.setFillColor(colors.HexColor(cp))
        c.roundRect(cap_x, cap_y, cap_w, cap_h_val, 14, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 8)
        c.drawCentredString(mx, cap_y + 17, 'BUSCAM')
        c.setFont('Helvetica', 7)
        c.drawCentredString(mx, cap_y + 7, _format_duree(voyage.duree_estimee))

        # Triangle flèche droite (beginPath — pas polygon)
        c.setFillColor(colors.HexColor(cs))
        fleche = c.beginPath()
        fleche.moveTo(cap_x + cap_w + 4, trajet_y + 65)
        fleche.lineTo(cap_x + cap_w + 14, trajet_y + 62)
        fleche.lineTo(cap_x + cap_w + 4, trajet_y + 59)
        fleche.close()
        c.drawPath(fleche, fill=1, stroke=0)

        # Ligne droite
        c.setStrokeColor(colors.HexColor('#CCCCCC'))
        c.line(cap_x + cap_w + 16, trajet_y + 62, w - 130, trajet_y + 62)

        # ── Ville arrivée ─────────────────────────────────────
        arr_x = w - 40
        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 32)
        c.drawRightString(arr_x, trajet_y + 54,
                          voyage.get_ville_arrivee_display().upper())

        c.setFillColor(colors.HexColor('#888888'))
        c.setFont('Helvetica', 8)
        c.drawRightString(arr_x, trajet_y + 42, 'ARRIVÉE')

        c.setFillColor(colors.HexColor(cp))
        c.setFont('Helvetica-Bold', 22)
        c.drawRightString(arr_x, trajet_y + 18, 'À DESTINATION')

        c.setFillColor(colors.HexColor(cs))
        c.setFont('Helvetica-Bold', 8)
        c.drawRightString(arr_x, trajet_y + 8,
                          f"SIÈGE  N°{reservation.numero_siege}")

        # ════════════════════════════════════════════════════
        # GRILLE INFOS PASSAGER — 2 colonnes
        # ════════════════════════════════════════════════════
        grille_y  = trajet_y - 130
        col_left  = 30
        col_right = w / 2 + 15
        row_h     = 42

        infos = [
            # (label_gauche, valeur_gauche, label_droite, valeur_droite)
            (
                'PASSAGER',
                utilisateur.get_full_name() or utilisateur.username,
                'BUS',
                voyage.bus.immatriculation,
            ),
            (
                'TÉLÉPHONE',
                utilisateur.telephone or '-',
                'CLASSE',
                voyage.bus.get_type_bus_display(),
            ),
            (
                'SIÈGE',
                f'N°  {reservation.numero_siege}',
                'MONTANT',
                f"{int(reservation.montant_paye):,} FCFA".replace(',', ' '),
            ),
            (
                'AGENCE',
                agence.nom,
                'STATUT',
                'CONFIRMÉ  ET  PAYÉ',
            ),
        ]

        for i, (lg, vg, ld, vd) in enumerate(infos):
            row_y = grille_y - i * row_h

            # Fond lignes alternées
            if i % 2 == 0:
                c.saveState()
                c.setFillColor(colors.HexColor(cp))
                c.setFillAlpha(0.04)
                c.roundRect(20, row_y - 6, w - 40, row_h - 2, 4, fill=1, stroke=0)
                c.restoreState()

            # Séparateur vertical
            c.setStrokeColor(colors.HexColor('#E8E8E8'))
            c.setLineWidth(1)
            c.line(w / 2 + 8, row_y - 4, w / 2 + 8, row_y + 28)

            # Col gauche
            c.setFillColor(colors.HexColor('#AAAAAA'))
            c.setFont('Helvetica', 7)
            c.drawString(col_left + 10, row_y + 22, lg)

            # Valeur gauche — couleur accent si siège ou statut
            val_color = cp if lg in ('SIÈGE',) else '#1A1A1A'
            c.setFillColor(colors.HexColor(val_color))
            c.setFont('Helvetica-Bold', 11)
            c.drawString(col_left + 10, row_y + 8, str(vg))

            # Col droite
            c.setFillColor(colors.HexColor('#AAAAAA'))
            c.setFont('Helvetica', 7)
            c.drawString(col_right, row_y + 22, ld)

            val_color_d = cs if ld in ('MONTANT', 'STATUT') else '#1A1A1A'
            c.setFillColor(colors.HexColor(val_color_d))
            c.setFont('Helvetica-Bold', 11)
            c.drawString(col_right, row_y + 8, str(vd))

        # ════════════════════════════════════════════════════
        # SOUCHE DÉTACHABLE
        # ════════════════════════════════════════════════════
        souche_y = grille_y - 4 * row_h - 20

        # Ligne pointillée
        c.saveState()
        c.setStrokeColor(colors.HexColor('#C0C0C0'))
        c.setLineWidth(0.8)
        c.setDash(6, 4)
        c.line(20, souche_y + 10, w - 20, souche_y + 10)
        c.setDash([])
        c.restoreState()

        # Texte ligne pointillée
        c.setFillColor(colors.HexColor('#BBBBBB'))
        c.setFont('Helvetica', 7)
        c.drawCentredString(w / 2, souche_y + 13, 'CONSERVER  CE  COUPON')

        # ── Fond souche ───────────────────────────────────────
        souche_h = 95
        c.setFillColor(colors.HexColor(cp))
        c.roundRect(20, souche_y - souche_h - 5, w - 40, souche_h, 10, fill=1, stroke=0)

        # Motif points dans la souche
        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.06)
        for xi in range(0, int(w), 18):
            for yi in range(0, souche_h, 18):
                c.circle(20 + xi, souche_y - souche_h - 5 + yi, 1.5, fill=1, stroke=0)
        c.restoreState()

        # ── Contenu souche gauche ─────────────────────────────
        sx = 40
        sy = souche_y - souche_h + 15

        c.setFillColor(colors.HexColor(cs))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(sx, souche_y - 20, 'N° DE BILLET')

        c.setFillColor(colors.white)
        c.setFont('Courier-Bold', 11)
        # Affichage billet sur 2 lignes si besoin
        if len(billet_id) <= 22:
            c.drawString(sx, souche_y - 36, billet_id)
        else:
            c.drawString(sx, souche_y - 36, billet_id[:22])
            c.setFont('Courier-Bold', 9)
            c.drawString(sx, souche_y - 50, billet_id[22:])

        # Date départ dans la souche
        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.65)
        c.setFont('Helvetica', 8)
        c.drawString(sx, souche_y - 68,
                     voyage.date_heure_depart.strftime('%A %d %B %Y — %H:%M').capitalize())
        c.restoreState()

        # ── Montant à droite dans la souche ──────────────────
        montant_str = f"{int(reservation.montant_paye):,} FCFA".replace(',', ' ')

        c.setFillColor(colors.HexColor(cs))
        c.setFont('Helvetica-Bold', 22)
        c.drawRightString(w - 40, souche_y - 30, montant_str)

        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.6)
        c.setFont('Helvetica', 8)
        c.drawRightString(w - 40, souche_y - 50, 'MONTANT  PAYÉ')
        c.restoreState()

        # Siège dans la souche (grand)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 36)
        c.drawRightString(w - 40, souche_y - 78, f'{reservation.numero_siege}')
        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.55)
        c.setFont('Helvetica', 8)
        c.drawRightString(w - 40, souche_y - 90, 'SIÈGE')
        c.restoreState()

        # ════════════════════════════════════════════════════
        # INSTRUCTIONS + PIED DE PAGE
        # ════════════════════════════════════════════════════
        inst_y = souche_y - souche_h - 25

        # Fond instructions
        c.setFillColor(colors.HexColor('#FFFBF0'))
        c.roundRect(20, inst_y - 52, w - 40, 62, 6, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#E8C84A'))
        c.setLineWidth(0.75)
        c.roundRect(20, inst_y - 52, w - 40, 62, 6, fill=0, stroke=1)

        c.setFillColor(colors.HexColor('#8B6914'))
        c.setFont('Helvetica-Bold', 8)
        c.drawString(35, inst_y + 2, 'INFORMATIONS IMPORTANTES')

        inst_textes = [
            'Presentez ce billet a l\'agent lors de l\'embarquement',
            'Arrivez au moins 30 minutes avant l\'heure de depart indiquee',
            'Ce billet est personnel, nominatif et non cessible a un tiers',
        ]
        c.setFillColor(colors.HexColor('#3A3A3A'))
        c.setFont('Helvetica', 8)
        for j, texte in enumerate(inst_textes):
            c.drawString(35, inst_y - 12 - j * 13, f'•  {texte}')

        # ── Pied de page ──────────────────────────────────────
        c.setFillColor(colors.HexColor(cp))
        c.rect(10, 10, w - 20, 36, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(25, 33, 'BusCam')

        c.saveState()
        c.setFillColor(colors.white)
        c.setFillAlpha(0.55)
        c.setFont('Helvetica', 7)
        c.drawString(25, 21, 'Plateforme officielle de reservation de bus au Cameroun')

        contact_parts = [p for p in [agence.telephone, agence.email] if p]
        contact_str   = '  ·  '.join(contact_parts) if contact_parts else 'www.buscam.cm'
        c.drawRightString(w - 25, 33, agence.nom.upper())
        c.drawRightString(w - 25, 21, contact_str)
        c.restoreState()

        c.showPage()
        c.save()

    except Exception as e:
        logger.error(f"Erreur PDF {reservation_id}: {e}\n{traceback.format_exc()}")
        return JsonResponse({'erreur': f'Erreur PDF : {str(e)}'}, status=500)

    # ── Réponse ───────────────────────────────────────────────
    buffer.seek(0)
    contenu = buffer.getvalue()

    nom_safe    = ''.join(ch for ch in agence.nom if ch.isalnum() or ch in '-_')[:12]
    nom_fichier = f"BusCam-{nom_safe}-{billet_court}.pdf"

    response = HttpResponse(contenu, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
    response['Content-Length']      = len(contenu)
    response['Access-Control-Allow-Origin']   = '*'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return response