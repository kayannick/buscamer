# ============================================================
# RÔLE : Logique métier pour Agence, Bus, Voyage.
#        Le ViewSet Voyage gère la RECHERCHE FILTRÉE
#        (depart, arrivee, date) demandée par React.
#
# INTERACTIONS :
#   ← Utilise : models.py, serializers.py
#   → Routé par : voyages/urls.py (via DefaultRouter)
#
# get_queryset() met à jour les statuts automatiquement
#   - Filtre les voyages publics : départ futur uniquement
#   - Action sieges_occupes : exclut les réservations expirées
# ============================================================

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime                import timedelta
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
    """
    Voyages accessibles au public.
    Affiche UNIQUEMENT les voyages futurs (départ > maintenant).
    """
    queryset           = Voyage.objects.select_related('agence', 'bus').all()
    permission_classes = [permissions.AllowAny]
    filter_backends    = [DjangoFilterBackend]

    def get_serializer_class(self):
        if self.action == 'list':     return VoyageListSerializer
        if self.action == 'retrieve': return VoyageDetailSerializer
        return VoyageCreateSerializer

    def get_queryset(self):
        """
        Retourne les voyages selon les filtres.

        LOGIQUE PUBLIQUE :
          Sans filtre date → tous les voyages dont le départ
          est dans le futur (statut PROGRAMME).
          Avec filtre date → cette date précise uniquement.
        """
        maintenant = timezone.now()

        # Met à jour automatiquement les statuts dépassés
        self._mettre_a_jour_statuts_expires()

        queryset = Voyage.objects.select_related('agence', 'bus')

        date_param    = self.request.query_params.get('date')
        ville_depart  = self.request.query_params.get('ville_depart')
        ville_arrivee = self.request.query_params.get('ville_arrivee')

        if date_param:
            # Filtre sur une date précise
            queryset = queryset.filter(
                date_heure_depart__date=date_param,
                date_heure_depart__gt=maintenant,  # encore futur à cette date
            )
        else:
            # Tous les voyages futurs programmés
            queryset = queryset.filter(
                date_heure_depart__gt=maintenant,
                statut='PROGRAMME',
            )

        if ville_depart:  queryset = queryset.filter(ville_depart=ville_depart)
        if ville_arrivee: queryset = queryset.filter(ville_arrivee=ville_arrivee)

        return queryset.order_by('date_heure_depart')

    def _mettre_a_jour_statuts_expires(self):
        """
        Met à jour silencieusement les voyages dont la date est passée.
        PROGRAMME → EN_COURS → TERMINE selon l'heure actuelle.
        """
        maintenant = timezone.now()

        # PROGRAMME → EN_COURS (départ passé mais pas encore terminé)
        Voyage.objects.filter(
            statut='PROGRAMME',
            date_heure_depart__lte=maintenant,
        ).update(statut='EN_COURS')

        # EN_COURS → TERMINE (arrivée estimée passée)
        # On utilise une approximation : départ + 12h max
        limite_termine = maintenant - timedelta(hours=12)
        Voyage.objects.filter(
            statut='EN_COURS',
            date_heure_depart__lte=limite_termine,
        ).update(statut='TERMINE')

    @action(
        detail=True, methods=['get'],
        url_path='sieges-occupes',
        permission_classes=[permissions.AllowAny]
    )
    def sieges_occupes(self, request, pk=None):
        """
        GET /api/voyages/:id/sieges-occupes/

        Retourne les sièges occupés.
        Exclut les réservations EN_ATTENTE expirées (5h avant départ).
        """
        voyage     = self.get_object()
        maintenant = timezone.now()

        # Sièges bloqués : CONFIRME ou EN_ATTENTE valides (pas expirées)
        sieges = Reservation.objects.filter(
            voyage=voyage,
        ).filter(
            # CONFIRME = toujours bloqué
            # EN_ATTENTE = bloqué seulement si départ dans + de 5h
            models.Q(statut_paiement='CONFIRME') |
            models.Q(
                statut_paiement='EN_ATTENTE',
                voyage__date_heure_depart__gt=maintenant + timedelta(hours=5),
            )
        ).values_list('numero_siege', flat=True)

        return Response(list(sieges))
