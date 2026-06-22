# ============================================================

#
# RÔLE : Gère la création et la consultation des réservations.
#        SÉCURITÉ CRITIQUE : un utilisateur ne voit/modifie
#        QUE SES PROPRES réservations.
#
# INTERACTIONS :
#   ← Utilise : models.py, serializers.py
#   → Routé par : reservations/urls.py
# ============================================================

from rest_framework import viewsets, permissions
from .models import Reservation
from .serializers import ReservationSerializer, ReservationCreateSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    """
    Endpoints :
      GET  /api/reservations/       → MES réservations uniquement
      GET  /api/reservations/{id}/  → détail (si c'est la mienne)
      POST /api/reservations/       → créer une nouvelle réservation
    """

    permission_classes = [permissions.IsAuthenticated]
    # IsAuthenticated : il FAUT être connecté pour réserver
    # (cohérent : on doit savoir QUI réserve)

    def get_queryset(self):
        """
        SÉCURITÉ FONDAMENTALE.

        ENTRÉE  : self.request.user (l'utilisateur authentifié via JWT)
        SORTIE  : QuerySet filtré sur CET utilisateur uniquement

        Sans cette surcharge, Reservation.objects.all() renverrait
        les réservations de TOUT LE MONDE → faille de sécurité majeure
        (un utilisateur verrait les billets des autres) !
        """
        return Reservation.objects.filter(
            utilisateur=self.request.user
        ).select_related('voyage', 'voyage__agence', 'voyage__bus')

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservationCreateSerializer
        return ReservationSerializer

    def perform_create(self, serializer):
        """
        SURCHARGE de perform_create().

        ENTRÉE  : serializer = instance DÉJÀ VALIDÉE
                  (validate() du ReservationCreateSerializer
                   a déjà été exécutée avec succès à ce stade)
        SORTIE  : rien (None) — sauvegarde l'objet en BDD

        C'EST ICI qu'on injecte l'utilisateur connecté.
        Rappel : 'utilisateur' n'était PAS dans les fields
        du ReservationCreateSerializer (Phase 1) — c'est VOLONTAIRE.

        serializer.save(utilisateur=...) :
        équivaut à faire
          Reservation.objects.create(
              **validated_data,
              utilisateur=self.request.user
          )
        """
        serializer.save(utilisateur=self.request.user)
