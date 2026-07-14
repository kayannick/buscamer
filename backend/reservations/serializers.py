# # ============================================================
# #
# #   La validation anti-double-réservation doit inclure
# #   les statuts EN_ATTENTE ET CONFIRME (pas seulement CONFIRME).
# #   Un siège EN_ATTENTE de paiement doit aussi être bloqué
# #   le temps que le paiement soit validé (ou expire).
#
# AJOUTS :
#   - heures_avant_expiration : pour le compte à rebours frontend
#   - est_reservable : validation que voyage accepte encore réservations
# ============================================================

from rest_framework import serializers
from django.utils   import timezone
from datetime       import timedelta
from .models        import Reservation
from voyages.models import Voyage
from voyages.serializers import VoyageListSerializer


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer lecture — inclut les infos calculées."""

    voyage                  = VoyageListSerializer(read_only=True)
    utilisateur_nom         = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    heures_avant_expiration = serializers.SerializerMethodField()
    est_expire              = serializers.SerializerMethodField()

    class Meta:
        model  = Reservation
        fields = [
            'id', 'voyage', 'utilisateur_nom',
            'numero_siege', 'numero_billet',
            'statut_paiement', 'montant_paye',
            'date_reservation',
            'heures_avant_expiration', 'est_expire',
        ]
        read_only_fields = ['numero_billet', 'date_reservation']

    def get_heures_avant_expiration(self, obj):
        """
        Heures restantes avant annulation automatique.
        Uniquement pour les réservations EN_ATTENTE.
        Retourne None si déjà confirmé ou annulé.
        """
        if obj.statut_paiement != 'EN_ATTENTE':
            return None

        depart     = obj.voyage.date_heure_depart
        expiration = depart - timedelta(hours=5)
        restant    = expiration - timezone.now()

        if restant.total_seconds() <= 0:
            return 0
        return round(restant.total_seconds() / 3600, 2)

    def get_est_expire(self, obj):
        """
        True si le billet EN_ATTENTE est sur le point d'être annulé
        (départ dans moins de 5h) ou si le départ est passé.
        """
        if obj.statut_paiement not in ('EN_ATTENTE', 'ANNULE'):
            return False
        limite = timezone.now() + timedelta(hours=5)
        return obj.voyage.date_heure_depart <= limite


class ReservationCreateSerializer(serializers.ModelSerializer):
    """Serializer création — valide les règles métier."""

    class Meta:
        model  = Reservation
        fields = ['voyage', 'numero_siege', 'montant_paye']

    def validate(self, attrs):
        voyage       = attrs['voyage']
        numero_siege = attrs['numero_siege']
        maintenant   = timezone.now()
        cinq_heures  = maintenant + timedelta(hours=5)

        # ── Règle 1 : Voyage doit être PROGRAMME ──────────────
        if voyage.statut != 'PROGRAMME':
            raise serializers.ValidationError(
                f"Ce voyage n'est plus disponible (statut: {voyage.get_statut_display()})."
            )

        # ── Règle 2 : Départ dans plus de 5h ──────────────────
        if voyage.date_heure_depart <= cinq_heures:
            heures = (voyage.date_heure_depart - maintenant).total_seconds() / 3600
            if heures <= 0:
                msg = "Ce voyage est déjà parti."
            else:
                msg = f"Impossible de réserver. Le départ est dans moins de 5h ({round(heures, 1)}h)."
            raise serializers.ValidationError(msg)

        # ── Règle 3 : Siège dans la plage valide ──────────────
        if not (1 <= numero_siege <= voyage.bus.capacite):
            raise serializers.ValidationError(
                f"Le siège doit être entre 1 et {voyage.bus.capacite}."
            )

        # ── Règle 4 : Siège non déjà pris ────────────────────
        # Bloque CONFIRME + EN_ATTENTE valides (pas expirées)
        siege_pris = Reservation.objects.filter(
            voyage       = voyage,
            numero_siege = numero_siege,
        ).filter(
            __import__('django.db.models', fromlist=['Q']).Q(statut_paiement='CONFIRME') |
            __import__('django.db.models', fromlist=['Q']).Q(
                statut_paiement='EN_ATTENTE',
                voyage__date_heure_depart__gt=cinq_heures,
            )
        ).exists()

        if siege_pris:
            raise serializers.ValidationError(
                f"Le siège N°{numero_siege} est déjà réservé."
            )

        return attrs

