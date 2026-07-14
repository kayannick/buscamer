# ============================================================
#
# COMMENT ENREGISTRER UN AGENT DANS UNE AGENCE :
#
# ÉTAPE 1 : Créer l'agence
#   http://localhost:8000/admin/voyages/agence/add/
#   Remplir : nom, ville_siege, telephone, email
#   NE PAS encore choisir le gérant (l'utilisateur n'existe pas encore)
#
# ÉTAPE 2 : Créer l'utilisateur agent
#   http://localhost:8000/admin/utilisateurs/utilisateur/add/
#   username, password (x2), téléphone
#   IMPORTANT : dans la section "Informations personnelles" :
#     role = AGENT
#
# ÉTAPE 3 : Lier l'agent à l'agence
#   http://localhost:8000/admin/voyages/agence/
#   Cliquez sur l'agence créée
#   Champ "Gérant" : sélectionnez l'utilisateur créé
#   Sauvegarder
#
# RÉSULTAT : Agence.objects.filter(gerant=user).first() → retourne l'agence
# ============================================================

from django.contrib  import admin
from .models         import Agence, Bus, Chauffeur, Voyage


@admin.register(Agence)
class AgenceAdmin(admin.ModelAdmin):
    list_display   = ['nom', 'ville_siege', 'telephone', 'gerant', 'nb_bus']
    search_fields  = ['nom', 'ville_siege']
    list_filter    = ['ville_siege']
    # Affiche le champ gérant pour lier l'agent à l'agence
    raw_id_fields  = ['gerant']

    def nb_bus(self, obj):
        return obj.bus.count()
    nb_bus.short_description = 'Nb bus'


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ['immatriculation', 'agence', 'capacite', 'type_bus', 'est_actif']
    list_filter  = ['type_bus', 'est_actif', 'agence']


@admin.register(Chauffeur)
class ChauffeurAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'telephone', 'numero_permis', 'bus']


@admin.register(Voyage)
class VoyageAdmin(admin.ModelAdmin):
    list_display  = ['ville_depart', 'ville_arrivee', 'date_heure_depart', 'prix', 'statut', 'places_disponibles']
    list_filter   = ['statut', 'ville_depart', 'ville_arrivee', 'agence']
    search_fields = ['agence__nom']


