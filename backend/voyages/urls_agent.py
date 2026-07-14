# ============================================================
# 
# ============================================================

from django.urls import path
from .              import views_agent
from paiements.views import valider_paiement_especes

urlpatterns = [
    # Infos agence (logo, nom) — utilisé par le sidebar
    path('infos/',                             views_agent.agent_infos_agence,         name='agent-infos'),
    # Dashboard
    path('dashboard/',                         views_agent.dashboard_stats,             name='agent-dashboard'),
    # Voyages
    path('voyages/',                           views_agent.AgentVoyagesView.as_view(),  name='agent-voyages'),
    path('voyages/<int:pk>/',                  views_agent.AgentVoyageDetailView.as_view(), name='agent-voyage-detail'),
    # Réservations
    path('reservations/',                      views_agent.agent_reservations,          name='agent-reservations'),
    path('reservations/<int:pk>/statut/',      views_agent.agent_modifier_reservation,  name='agent-reservation-statut'),
     # ── NOUVEAU : validation paiement espèces ────────────────
    path(
        'reservations/<int:reservation_id>/valider-especes/',
        valider_paiement_especes,
        name='agent-valider-especes',
    ),
    # Bus
    path('bus/',                               views_agent.agent_bus,                   name='agent-bus'),
    path('bus/<int:pk>/',                      views_agent.agent_bus_detail,            name='agent-bus-detail'),
    # Voyageurs
    path('voyageurs/',                         views_agent.agent_voyageurs,             name='agent-voyageurs'),
]



# # ============================================================

# # ============================================================

# from django.urls import path
# from .           import views_agent

# urlpatterns = [
#     # Dashboard
#     path('dashboard/',                         views_agent.dashboard_stats,           name='agent-dashboard'),

#     # Voyages
#     path('voyages/',                           views_agent.AgentVoyagesView.as_view(), name='agent-voyages'),
#     path('voyages/<int:pk>/',                  views_agent.AgentVoyageDetailView.as_view(), name='agent-voyage-detail'),

#     # Réservations
#     path('reservations/',                      views_agent.agent_reservations,         name='agent-reservations'),
#     path('reservations/<int:pk>/statut/',      views_agent.agent_modifier_reservation, name='agent-reservation-statut'),

#     # Bus
#     path('bus/',                               views_agent.agent_bus,                  name='agent-bus'),
#     path('bus/<int:pk>/',                      views_agent.agent_bus_detail,           name='agent-bus-detail'),

#     # Voyageurs
#     path('voyageurs/',                         views_agent.agent_voyageurs,            name='agent-voyageurs'),
# ]