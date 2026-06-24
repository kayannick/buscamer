# ============================================================
#
#   La validation anti-double-réservation doit inclure
#   les statuts EN_ATTENTE ET CONFIRME (pas seulement CONFIRME).
#   Un siège EN_ATTENTE de paiement doit aussi être bloqué
#   le temps que le paiement soit validé (ou expire).
# ============================================================

from rest_framework import serializers
from .models import Reservation
from voyages.models import Voyage
from voyages.serializers import VoyageListSerializer


class ReservationSerializer(serializers.ModelSerializer):
    """
    Serializer pour AFFICHER une réservation (GET).
    Inclut les infos du voyage imbriquées.
    """
    voyage         = VoyageListSerializer(read_only=True)
    utilisateur_nom = serializers.CharField(
        source='utilisateur.get_full_name',
        read_only=True
    )

    class Meta:
        model  = Reservation
        fields = [
            'id', 'voyage', 'utilisateur_nom', 'numero_siege',
            'numero_billet', 'statut_paiement', 'montant_paye',
            'date_reservation',
        ]
        read_only_fields = ['numero_billet', 'date_reservation']


class ReservationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer pour CRÉER une réservation (POST).

    CORRECTION : on bloque les sièges EN_ATTENTE ET CONFIRME.
    Un siège EN_ATTENTE expire après 15 minutes (à implémenter
    avec Celery en production).
    """

    class Meta:
        model  = Reservation
        fields = ['voyage', 'numero_siege', 'montant_paye']

    def validate(self, attrs):
        voyage       = attrs['voyage']
        numero_siege = attrs['numero_siege']

        # ── Vérif 1 : Voyage encore ouvert ───────────────────
        if voyage.statut != Voyage.StatutChoices.PROGRAMME:
            raise serializers.ValidationError(
                "Ce voyage n'accepte plus de réservations."
            )

        # ── Vérif 2 : Siège dans la plage valide ─────────────
        if not (1 <= numero_siege <= voyage.bus.capacite):
            raise serializers.ValidationError(
                f"Le siège doit être entre 1 et {voyage.bus.capacite}."
            )

        # ── Vérif 3 : Siège déjà pris ────────────────────────
        # CORRECTION : on vérifie CONFIRME et EN_ATTENTE
        # Un siège EN_ATTENTE de paiement est temporairement réservé
        siege_pris = Reservation.objects.filter(
            voyage       = voyage,
            numero_siege = numero_siege,
            statut_paiement__in = [
                Reservation.StatutPaiementChoices.CONFIRME,
                Reservation.StatutPaiementChoices.EN_ATTENTE,
            ]
        ).exists()

        if siege_pris:
            raise serializers.ValidationError(
                f"Le siège N°{numero_siege} est déjà réservé ou "
                f"en cours de réservation. Choisissez un autre siège."
            )

        return attrs