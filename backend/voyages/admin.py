# ============================================================
# backend/voyages/admin.py
#
# RÔLE : Enregistre Agence, Bus, Chauffeur, Voyage dans /admin
# ============================================================

from django.contrib import admin
from .models import Agence, Bus, Chauffeur, Voyage


@admin.register(Agence)
class AgenceAdmin(admin.ModelAdmin):
    # list_display : colonnes affichées dans la liste
    list_display = ['nom', 'ville_siege', 'telephone', 'gerant']
    search_fields = ['nom', 'ville_siege']  # Active la barre de recherche


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ['immatriculation', 'agence', 'capacite', 'type_bus', 'est_actif']
    list_filter = ['type_bus', 'est_actif', 'agence']  # Filtres dans la sidebar


@admin.register(Chauffeur)
class ChauffeurAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'telephone', 'numero_permis', 'bus']


@admin.register(Voyage)
class VoyageAdmin(admin.ModelAdmin):
    list_display = [
        'ville_depart', 'ville_arrivee', 'date_heure_depart',
        'prix', 'statut', 'places_disponibles'
    ]
    list_filter = ['statut', 'ville_depart', 'ville_arrivee', 'agence']
