# ============================================================
#   get_queryset() doit filtrer STRICTEMENT par request.user.
#   Si IsAuthenticated est actif, request.user est toujours
#   l'utilisateur du token JWT reçu dans le header.
#   Le bug venait peut-être d'un cache ou d'une absence de filtre.
# ============================================================

from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import Reservation
from .serializers import ReservationSerializer, ReservationCreateSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    """
    Endpoints réservations.
    SÉCURITÉ ABSOLUE : chaque utilisateur ne voit QUE ses billets.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        CORRECTION CRITIQUE :
        Filtre TOUJOURS par request.user (l'utilisateur du token JWT).

        Ajout de select_related pour éviter les requêtes N+1 :
        - voyage__agence : nom de l'agence dans le serializer
        - voyage__bus    : type et capacité du bus
        - utilisateur    : infos du voyageur

        Ajout de order_by explicite pour éviter les warnings Django.
        """
        return Reservation.objects.filter(
            utilisateur=self.request.user  # ← FILTRE STRICT
        ).select_related(
            'voyage',
            'voyage__agence',
            'voyage__bus',
            'utilisateur',
        ).order_by('-date_reservation')   # Plus récentes en premier

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservationCreateSerializer
        return ReservationSerializer

    def perform_create(self, serializer):
        """
        Injecte request.user lors de la création.
        L'utilisateur ne peut PAS se désigner lui-même via l'API.
        """
        serializer.save(utilisateur=self.request.user)
