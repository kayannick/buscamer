# ============================================================

#
# RÔLE : Logique métier pour Agence, Bus, Voyage.
#        Le ViewSet Voyage gère la RECHERCHE FILTRÉE
#        (depart, arrivee, date) demandée par React.
#
# INTERACTIONS :
#   ← Utilise : models.py, serializers.py
#   → Routé par : voyages/urls.py (via DefaultRouter)
# ============================================================

from rest_framework.decorators import action
from rest_framework.response   import Response
from reservations.models       import Reservation

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Agence, Bus, Voyage
from .serializers import (
    AgenceSerializer, BusSerializer,
    VoyageListSerializer, VoyageDetailSerializer, VoyageCreateSerializer
)


class AgenceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints :
      GET /api/agences/       → liste de toutes les agences
      GET /api/agences/{id}/  → détail d'une agence

    ReadOnlyModelViewSet : SEULEMENT list + retrieve.
    Les agences sont créées via /admin, pas via l'API publique.
    """
    queryset = Agence.objects.all()
    serializer_class = AgenceSerializer
    permission_classes = [permissions.AllowAny]


class BusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/bus/  → utile pour qu'un agent voie sa flotte
    """
    queryset = Bus.objects.filter(est_actif=True)
    serializer_class = BusSerializer
    permission_classes = [permissions.IsAuthenticated]


class VoyageViewSet(viewsets.ModelViewSet):
    """
    Endpoints complets :
      GET    /api/voyages/                → recherche/liste
      GET    /api/voyages/{id}/           → détail
      POST   /api/voyages/                → création (agents)
      PUT    /api/voyages/{id}/           → modification
      DELETE /api/voyages/{id}/           → suppression
    """

    queryset = Voyage.objects.select_related('agence', 'bus').all()
    # select_related('agence', 'bus') :
    #   Sans ça, accéder à voyage.agence.nom déclenche UNE requête SQL
    #   SUPPLÉMENTAIRE par voyage (problème "N+1 queries" !)
    #   select_related fait une JOIN SQL en UNE SEULE requête.

    permission_classes = [permissions.AllowAny]
    # AllowAny : tout le monde peut RECHERCHER des voyages,
    # même sans compte (logique : on veut convertir les visiteurs !)

    # --------------------------------------------------------
    # CONFIGURATION DU FILTRAGE
    #
    # DjangoFilterBackend lit les query params de l'URL :
    #   /api/voyages/?ville_depart=YAOUNDE&ville_arrivee=DOUALA
    # et les transforme automatiquement en :
    #   Voyage.objects.filter(ville_depart='YAOUNDE', ville_arrivee='DOUALA')
    # --------------------------------------------------------
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ville_depart', 'ville_arrivee', 'statut', 'agence']

    def get_serializer_class(self):
        """
        SURCHARGE : choisit le serializer SELON L'ACTION en cours.

        ENTRÉE  : self.action (rempli automatiquement par DRF :
                  'list', 'retrieve', 'create', 'update'...)
        SORTIE  : une CLASSE de serializer (pas une instance !)

        POURQUOI ? On veut :
          - une réponse LÉGÈRE pour la liste (VoyageListSerializer)
          - une réponse COMPLÈTE pour le détail (VoyageDetailSerializer)
          - un format ADAPTÉ À L'ÉCRITURE pour create/update
            (VoyageCreateSerializer, qui accepte des IDs pour agence/bus)
        """
        if self.action == 'list':
            return VoyageListSerializer
        elif self.action == 'retrieve':
            return VoyageDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VoyageCreateSerializer
        return VoyageListSerializer  # valeur par défaut de sécurité

    def get_queryset(self):
        """
        SURCHARGE : permet d'ajouter une logique de filtrage
        AU-DELÀ de ce que DjangoFilterBackend fait automatiquement.

        Exemple : filtrer par DATE (date_heure_depart__date),
        ce que DjangoFilterBackend ne fait pas nativement
        sans configuration spéciale.

        ENTRÉE  : self.request (disponible via self)
        SORTIE  : un QuerySet (potentiellement filtré)
        """
        queryset = super().get_queryset()

        date_param = self.request.query_params.get('date')
        if date_param:
            # __date : extrait juste la partie DATE d'un DateTimeField
            # Permet de chercher tous les voyages du 09/06/2026
            # peu importe l'heure exacte.
            queryset = queryset.filter(date_heure_depart__date=date_param)

        return queryset
    
    
    @action(detail=True, methods=['get'], url_path='sieges-occupes',
            permission_classes=[permissions.AllowAny])
    def sieges_occupes(self, request, pk=None):
        """
        Endpoint : GET /api/voyages/{id}/sieges-occupes/

        RÔLE : Renvoie la liste des NUMÉROS de sièges déjà confirmés
               pour ce voyage, sans exposer les données personnelles.

        ENTRÉE  : pk (id du voyage dans l'URL)
        SORTIE  : [3, 7, 12, 23, ...]  (liste d'entiers)

        UTILISÉ PAR : GrilleDesSeats.jsx (pour griser les sièges pris)
        """
        voyage = self.get_object()

        sieges = Reservation.objects.filter(
            voyage=voyage,
            statut_paiement=Reservation.StatutPaiementChoices.CONFIRME
        ).values_list('numero_siege', flat=True)
        # values_list(..., flat=True) : retourne une liste plate
        # [3, 7, 12] au lieu de [(3,), (7,), (12,)]

        return Response(list(sieges))

