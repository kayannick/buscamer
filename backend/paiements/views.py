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