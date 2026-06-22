# ============================================================
#
# RÔLE : Traduit Reservation ↔ JSON.
#        Contient la LOGIQUE MÉTIER LA PLUS SENSIBLE :
#        vérifier la disponibilité AVANT de créer une réservation.
#
# INTERACTIONS :
#   ← Lit : reservations/models.py, voyages/models.py
#   → Utilisé par : reservations/views.py
# ============================================================

from rest_framework import serializers
from .models import Reservation
from voyages.models import Voyage
from voyages.serializers import VoyageListSerializer


class ReservationSerializer(serializers.ModelSerializer):
    """
    Serializer pour AFFICHER une réservation
    (ex: "Mes billets" dans le profil utilisateur).
    """

    # Affiche le voyage COMPLET (imbriqué), pas juste son ID
    voyage = VoyageListSerializer(read_only=True)

    # Affiche le nom de l'utilisateur sans exposer tout l'objet
    utilisateur_nom = serializers.CharField(
        source='utilisateur.get_full_name', read_only=True
    )

    class Meta:
        model = Reservation
        fields = [
            'id', 'voyage', 'utilisateur_nom', 'numero_siege',
            'numero_billet', 'statut_paiement', 'montant_paye',
            'date_reservation'
        ]
        read_only_fields = ['numero_billet', 'date_reservation']


class ReservationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer DÉDIÉ À LA CRÉATION d'une réservation.

    C'EST ICI QUE SE JOUE LA RÈGLE MÉTIER CRITIQUE :
    empêcher de réserver un siège déjà pris, ou un voyage complet.
    """

    class Meta:
        model = Reservation
        fields = ['voyage', 'numero_siege', 'montant_paye']
        # 'utilisateur' n'est PAS dans fields : il sera injecté
        # automatiquement dans la View (Phase 2) depuis request.user
        # → Impossible pour un utilisateur de réserver "pour quelqu'un d'autre"

    def validate(self, attrs):
        """
        ENTRÉE  : attrs = {'voyage': <Voyage instance>,
                            'numero_siege': 23,
                            'montant_paye': Decimal('3500.00')}
        SORTIE  : attrs (si tout est valide)

        VÉRIFICATIONS EFFECTUÉES :
          1. Le voyage a-t-il encore des places disponibles ?
          2. Le numéro de siège est-il dans la plage valide (1 à capacité) ?
          3. Ce siège est-il déjà réservé (CONFIRMÉ) sur ce voyage ?
        """
        voyage = attrs['voyage']
        numero_siege = attrs['numero_siege']

        # Vérif 1 : Voyage encore ouvert aux réservations
        if voyage.statut != Voyage.StatutChoices.PROGRAMME:
            raise serializers.ValidationError(
                "Ce voyage n'accepte plus de réservations."
            )

        # Vérif 2 : Numéro de siège dans la plage du bus
        if not (1 <= numero_siege <= voyage.bus.capacite):
            raise serializers.ValidationError(
                f"Le numéro de siège doit être entre 1 et {voyage.bus.capacite}."
            )

        # Vérif 3 : Siège déjà pris ?
        # .exists() : retourne True/False SANS charger l'objet
        # (plus rapide qu'un .filter().count() > 0)
        siege_pris = Reservation.objects.filter(
            voyage=voyage,
            numero_siege=numero_siege,
            statut_paiement=Reservation.StatutPaiementChoices.CONFIRME
        ).exists()

        if siege_pris:
            raise serializers.ValidationError(
                f"Le siège n°{numero_siege} est déjà réservé sur ce voyage."
            )

        return attrs
