# ============================================================
# RÔLE : Logique métier pour Agence, Bus, Voyage.
#        Le ViewSet Voyage gère la RECHERCHE FILTRÉE
#        (depart, arrivee, date) demandée par React.
#
# INTERACTIONS :
#   ← Utilise : models.py, serializers.py
#   → Routé par : voyages/urls.py (via DefaultRouter)
# ============================================================
# ============================================================
#
# CORRECTION : l'action sieges_occupes retourne maintenant
# les sièges CONFIRMES ET EN_ATTENTE pour bloquer les deux.
# ============================================================

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Agence, Bus, Voyage
from reservations.models import Reservation
from .serializers import (
    AgenceSerializer, BusSerializer,
    VoyageListSerializer, VoyageDetailSerializer, VoyageCreateSerializer
)


class AgenceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Agence.objects.all()
    serializer_class   = AgenceSerializer
    permission_classes = [permissions.AllowAny]


class BusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Bus.objects.filter(est_actif=True)
    serializer_class   = BusSerializer
    permission_classes = [permissions.IsAuthenticated]


class VoyageViewSet(viewsets.ModelViewSet):
    queryset = Voyage.objects.select_related('agence', 'bus').all()
    permission_classes = [permissions.AllowAny]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['ville_depart', 'ville_arrivee', 'statut', 'agence']

    def get_serializer_class(self):
        if self.action == 'list':
            return VoyageListSerializer
        elif self.action == 'retrieve':
            return VoyageDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VoyageCreateSerializer
        return VoyageListSerializer

    def get_queryset(self):
        queryset    = super().get_queryset()
        date_param  = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(
                date_heure_depart__date=date_param
            )
        return queryset

    @action(
        detail=True,
        methods=['get'],
        url_path='sieges-occupes',
        permission_classes=[permissions.AllowAny]
    )
    def sieges_occupes(self, request, pk=None):
        """
        GET /api/voyages/{id}/sieges-occupes/

        CORRECTION : retourne les sièges CONFIRMES et EN_ATTENTE.
        Le frontend grisera les deux pour éviter les doubles réservations.

        RETOUR : [3, 7, 12, ...]
        """
        voyage = self.get_object()

        sieges = Reservation.objects.filter(
            voyage              = voyage,
            statut_paiement__in = [
                Reservation.StatutPaiementChoices.CONFIRME,
                Reservation.StatutPaiementChoices.EN_ATTENTE,
            ]
        ).values_list('numero_siege', flat=True)

        return Response(list(sieges))