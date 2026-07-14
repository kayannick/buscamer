# ============================================================
# 
#  RÔLE : Toutes les vues réservées aux agents d'agence.
#         Un agent ne peut gérer QUE son agence.
#         Toute tentative d'accéder aux données d'une autre
#         agence retourne 403 Forbidden.
# 
#  SÉCURITÉ :
#    - permission_classes = [IsAuthenticated, IsAgent]
#    - Chaque queryset filtre sur request.user.agence_geree
# 
#  ENDPOINTS :
#    GET  /api/agent/dashboard/           → Statistiques complètes
#    GET  /api/agent/voyages/             → Mes voyages
#    POST /api/agent/voyages/             → Créer un voyage
#    PUT  /api/agent/voyages/{id}/        → Modifier un voyage
#    DEL  /api/agent/voyages/{id}/        → Supprimer un voyage
#    GET  /api/agent/reservations/        → Réservations de mon agence
#    GET  /api/agent/bus/                 → Mes bus
#    POST /api/agent/bus/                 → Ajouter un bus
#    GET  /api/agent/voyageurs/           → Voyageurs de mon agence
# 
#   1. get_agence_agent() : utilise filter().first() au lieu
#      de l'accès direct qui retourne un RelatedManager
#   2. Vérification explicite que l'agence existe
#   3. Gestion propre des cas None
# ============================================================

from rest_framework             import status
from rest_framework.decorators  import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response    import Response
from rest_framework.views       import APIView
from django.db.models           import Count, Sum, Avg, Q
from django.db.models.functions import TruncDay, TruncMonth
from django.utils               import timezone
from datetime                   import timedelta

from .models        import Agence, Bus, Voyage, Chauffeur
from .serializers   import (
    VoyageListSerializer, VoyageDetailSerializer,
    VoyageCreateSerializer, BusSerializer,
)
from reservations.models import Reservation


# ════════════════════════════════════════════════════════════
# HELPER — Récupère l'agence de l'agent connecté
# ════════════════════════════════════════════════════════════

def get_agence_agent(request):
    """
    CORRECTION PRINCIPALE :
      Avant : request.user.agence_geree → RelatedManager (erreur 500)
      Après : Agence.objects.filter(gerant=request.user).first()
              → instance Agence ou None (correct)

    ENTRÉE  : request (avec request.user JWT authentifié)
    SORTIE  : instance Agence ou None
    """
    return Agence.objects.filter(gerant=request.user).first()


def agence_requise(func):
    """
    Décorateur : vérifie que l'agent a une agence.
    Retourne 403 si l'agence est introuvable.
    Usage : @agence_requise
    """
    def wrapper(request, *args, **kwargs):
        agence = get_agence_agent(request)
        if not agence:
            return Response(
                {'erreur': 'Aucune agence associée à ce compte. '
                           'Contactez l\'administrateur.'},
                status=403
            )
        return func(request, *args, agence=agence, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


# ════════════════════════════════════════════════════════════
# ENDPOINT : Infos de l'agence (logo, nom, stats rapides)
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_infos_agence(request):
    """
    GET /api/agent/infos/
    Retourne le nom, logo et stats basiques de l'agence de l'agent.
    Utilisé par le sidebar pour afficher le logo.
    """
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    return Response({
        'id'         : agence.id,
        'nom'        : agence.nom,
        'ville_siege': agence.ville_siege,
        'telephone'  : agence.telephone,
        'email'      : agence.email,
        'logo'       : request.build_absolute_uri(agence.logo.url) if agence.logo else None,
        'nb_bus'     : Bus.objects.filter(agence=agence, est_actif=True).count(),
        'nb_voyages' : Voyage.objects.filter(agence=agence, statut='PROGRAMME').count(),
    })


# ════════════════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/agent/dashboard/?periode=jour|semaine|mois|trimestre|semestre|annee
    """
    # ── CORRECTION : utilise filter().first() ────────────────
    agence = get_agence_agent(request)
    if not agence:
        return Response(
            {'erreur': 'Aucune agence associée à ce compte.'},
            status=403
        )

    periode = request.query_params.get('periode', 'mois')
    now     = timezone.now()

    debut = {
        'jour'      : now - timedelta(days=1),
        'semaine'   : now - timedelta(weeks=1),
        'mois'      : now - timedelta(days=30),
        'trimestre' : now - timedelta(days=90),
        'semestre'  : now - timedelta(days=180),
        'annee'     : now - timedelta(days=365),
    }.get(periode, now - timedelta(days=30))

    # ── Querysets ─────────────────────────────────────────────
    # CORRECTION : passe agence (instance) pas agence_id
    voyages      = Voyage.objects.filter(agence=agence)
    voyages_p    = voyages.filter(date_heure_depart__gte=debut)
    reservations = Reservation.objects.filter(voyage__agence=agence)
    resa_p       = reservations.filter(date_reservation__gte=debut)
    resa_conf    = resa_p.filter(statut_paiement='CONFIRME')

    stats_globales = {
        'total_voyages'          : voyages_p.count(),
        'voyages_programmes'     : voyages_p.filter(statut='PROGRAMME').count(),
        'voyages_termines'       : voyages_p.filter(statut='TERMINE').count(),
        'voyages_annules'        : voyages_p.filter(statut='ANNULE').count(),
        'total_reservations'     : resa_p.count(),
        'reservations_confirmees': resa_conf.count(),
        'reservations_attente'   : resa_p.filter(statut_paiement='EN_ATTENTE').count(),
        'total_passagers'        : resa_conf.count(),
        'chiffre_affaires'       : float(
            resa_conf.aggregate(t=Sum('montant_paye'))['t'] or 0
        ),
        'revenu_moyen_voyage'    : float(
            resa_conf.aggregate(m=Avg('montant_paye'))['m'] or 0
        ),
        'taux_remplissage_moyen' : _calcul_taux_remplissage(agence, debut, now),
    }

    bus_actifs = Bus.objects.filter(agence=agence, est_actif=True)
    stats_bus  = {
        'total_bus'      : Bus.objects.filter(agence=agence).count(),
        'bus_actifs'     : bus_actifs.count(),
        'capacite_totale': bus_actifs.aggregate(t=Sum('capacite'))['t'] or 0,
    }

    evolution        = _calcul_evolution(resa_conf, periode)
    top_destinations = list(
        voyages_p.values('ville_arrivee')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:5]
    )
    top_voyages   = _top_voyages(agence, debut, now)
    prochains     = voyages.filter(
        statut='PROGRAMME',
        date_heure_depart__gte=now,
        date_heure_depart__lte=now + timedelta(days=7),
    ).order_by('date_heure_depart')[:5]

    return Response({
        'agence'           : agence.nom,
        'agence_logo'      : request.build_absolute_uri(agence.logo.url) if agence.logo else None,
        'periode'          : periode,
        'date_debut'       : debut.isoformat(),
        'date_fin'         : now.isoformat(),
        'stats_globales'   : stats_globales,
        'stats_bus'        : stats_bus,
        'evolution'        : evolution,
        'top_destinations' : top_destinations,
        'top_voyages'      : top_voyages,
        'prochains_voyages': VoyageListSerializer(prochains, many=True).data,
    })


def _calcul_taux_remplissage(agence, debut, fin):
    voyages = Voyage.objects.filter(
        agence=agence,
        date_heure_depart__gte=debut,
        date_heure_depart__lte=fin,
    )
    if not voyages.exists():
        return 0
    total = 0
    for v in voyages:
        if v.bus.capacite > 0:
            conf   = Reservation.objects.filter(voyage=v, statut_paiement='CONFIRME').count()
            total += (conf / v.bus.capacite) * 100
    return round(total / voyages.count(), 1)


def _calcul_evolution(reservations_qs, periode):
    trunc = TruncDay('date_reservation') if periode in ['jour', 'semaine'] else TruncMonth('date_reservation')
    return list(
        reservations_qs
        .annotate(date=trunc)
        .values('date')
        .annotate(nb_reservations=Count('id'), chiffre_affaires=Sum('montant_paye'))
        .order_by('date')
        .values('date', 'nb_reservations', 'chiffre_affaires')
    )


def _top_voyages(agence, debut, fin):
    return list(
        Voyage.objects.filter(agence=agence, date_heure_depart__gte=debut)
        .annotate(nb_confirmes=Count(
            'reservations',
            filter=Q(reservations__statut_paiement='CONFIRME')
        ))
        .order_by('-nb_confirmes')[:5]
        .values('id', 'ville_depart', 'ville_arrivee', 'date_heure_depart', 'prix', 'nb_confirmes')
    )


# ════════════════════════════════════════════════════════════
# VOYAGES
# ════════════════════════════════════════════════════════════

class AgentVoyagesView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_agence(self, request):
        agence = get_agence_agent(request)
        if not agence:
            return None, Response({'erreur': 'Aucune agence associée.'}, status=403)
        return agence, None

    def get(self, request):
        agence, err = self._get_agence(request)
        if err: return err
        statut = request.query_params.get('statut')
        qs     = Voyage.objects.filter(agence=agence).order_by('date_heure_depart')
        if statut: qs = qs.filter(statut=statut)
        return Response(VoyageListSerializer(qs, many=True).data)

    def post(self, request):
        agence, err = self._get_agence(request)
        if err: return err
        data          = request.data.copy()
        data['agence'] = agence.id
        serializer    = VoyageCreateSerializer(data=data)
        if serializer.is_valid():
            voyage = serializer.save()
            return Response(VoyageDetailSerializer(voyage).data, status=201)
        return Response(serializer.errors, status=400)


class AgentVoyageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_voyage(self, request, pk):
        agence = get_agence_agent(request)
        if not agence:
            return None
        try:
            return Voyage.objects.get(id=pk, agence=agence)
        except Voyage.DoesNotExist:
            return None

    def get(self, request, pk):
        voyage = self._get_voyage(request, pk)
        if not voyage: return Response({'erreur': 'Voyage introuvable.'}, status=404)
        return Response(VoyageDetailSerializer(voyage).data)

    def put(self, request, pk):
        voyage = self._get_voyage(request, pk)
        if not voyage: return Response({'erreur': 'Voyage introuvable.'}, status=404)
        serializer = VoyageCreateSerializer(voyage, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        voyage = self._get_voyage(request, pk)
        if not voyage: return Response({'erreur': 'Voyage introuvable.'}, status=404)
        if voyage.reservations.filter(statut_paiement='CONFIRME').exists():
            return Response(
                {'erreur': 'Impossible de supprimer un voyage avec des réservations confirmées.'},
                status=400
            )
        voyage.delete()
        return Response(status=204)


# ════════════════════════════════════════════════════════════
# RÉSERVATIONS
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_reservations(request):
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    qs = Reservation.objects.filter(
        voyage__agence=agence
    ).select_related('voyage', 'utilisateur', 'voyage__bus').order_by('-date_reservation')

    voyage_id = request.query_params.get('voyage_id')
    statut    = request.query_params.get('statut')
    if voyage_id: qs = qs.filter(voyage_id=voyage_id)
    if statut:    qs = qs.filter(statut_paiement=statut)

    data = [{
        'id'              : r.id,
        'numero_billet'   : str(r.numero_billet),
        'numero_siege'    : r.numero_siege,
        'statut_paiement' : r.statut_paiement,
        'montant_paye'    : float(r.montant_paye),
        'date_reservation': r.date_reservation.isoformat(),
        'voyageur'        : {
            'id'       : r.utilisateur.id,
            'nom'      : r.utilisateur.get_full_name() or r.utilisateur.username,
            'telephone': r.utilisateur.telephone,
            'email'    : r.utilisateur.email,
        },
        'voyage': {
            'id'              : r.voyage.id,
            'ville_depart'    : r.voyage.get_ville_depart_display(),
            'ville_arrivee'   : r.voyage.get_ville_arrivee_display(),
            'date_heure_depart': r.voyage.date_heure_depart.isoformat(),
        },
    } for r in qs[:100]]

    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def agent_modifier_reservation(request, pk):
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    try:
        reservation = Reservation.objects.get(id=pk, voyage__agence=agence)
    except Reservation.DoesNotExist:
        return Response({'erreur': 'Réservation introuvable.'}, status=404)

    nouveau_statut = request.data.get('statut_paiement')
    if nouveau_statut not in ['CONFIRME', 'ANNULE', 'REMBOURSE']:
        return Response({'erreur': 'Statut invalide.'}, status=400)

    reservation.statut_paiement = nouveau_statut
    reservation.save()
    return Response({'succes': True, 'nouveau_statut': nouveau_statut})


# ════════════════════════════════════════════════════════════
# BUS
# ════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agent_bus(request):
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    if request.method == 'GET':
        bus = Bus.objects.filter(agence=agence)
        return Response(BusSerializer(bus, many=True).data)

    data          = request.data.copy()
    data['agence'] = agence.id
    serializer    = BusSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def agent_bus_detail(request, pk):
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    try:
        bus = Bus.objects.get(id=pk, agence=agence)
    except Bus.DoesNotExist:
        return Response({'erreur': 'Bus introuvable.'}, status=404)

    if request.method == 'PUT':
        serializer = BusSerializer(bus, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    bus.est_actif = False
    bus.save()
    return Response(status=204)


# ════════════════════════════════════════════════════════════
# VOYAGEURS
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_voyageurs(request):
    agence = get_agence_agent(request)
    if not agence:
        return Response({'erreur': 'Aucune agence associée.'}, status=403)

    from utilisateurs.models import Utilisateur
    voyageurs = Utilisateur.objects.filter(
        reservations__voyage__agence=agence
    ).distinct().annotate(
        nb_voyages    = Count('reservations'),
        total_depense = Sum(
            'reservations__montant_paye',
            filter=Q(reservations__statut_paiement='CONFIRME')
        ),
    ).order_by('-nb_voyages')

    return Response([{
        'id'              : u.id,
        'nom'             : u.get_full_name() or u.username,
        'telephone'       : u.telephone,
        'email'           : u.email,
        'nb_voyages'      : u.nb_voyages,
        'total_depense'   : float(u.total_depense or 0),
        'date_inscription': u.date_joined.isoformat(),
    } for u in voyageurs[:50]])
