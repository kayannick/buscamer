# ============================================================
#   get_queryset() doit filtrer STRICTEMENT par request.user.
#   Si IsAuthenticated est actif, request.user est toujours
#   l'utilisateur du token JWT reçu dans le header.
#   Le bug venait peut-être d'un cache ou d'une absence de filtre.
#
#
# LOGIQUE MÉTIER RÉSERVATIONS :
#   - list() annule auto les billets EN_ATTENTE expirés
#   - create() vérifie que le voyage est réservable (> 5h)
#   - Champ heures_avant_expiration calculé dans le serializer
# ============================================================

from rest_framework         import viewsets, permissions
from rest_framework.response import Response
from django.utils            import timezone
from datetime                import timedelta

from .models      import Reservation
from .serializers import ReservationSerializer, ReservationCreateSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(
            utilisateur=self.request.user
        ).select_related(
            'voyage', 'voyage__agence', 'voyage__bus', 'utilisateur',
        ).order_by('-date_reservation')

    def get_serializer_class(self):
        if self.action == 'create': return ReservationCreateSerializer
        return ReservationSerializer

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    def list(self, request, *args, **kwargs):
        """
        Avant de retourner la liste, annule automatiquement
        les réservations EN_ATTENTE dont le départ est dans
        moins de 5 heures.
        """
        self._annuler_billets_expires(request.user)
        return super().list(request, *args, **kwargs)

    def _annuler_billets_expires(self, utilisateur):
        """
        Annule les réservations EN_ATTENTE non payées
        dont le départ est dans moins de 5 heures.
        """
        limite = timezone.now() + timedelta(hours=5)

        Reservation.objects.filter(
            utilisateur            = utilisateur,
            statut_paiement        = 'EN_ATTENTE',
            voyage__date_heure_depart__lte = limite,
        ).update(statut_paiement='ANNULE')

