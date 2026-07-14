# ============================================================
#
# RÔLE : Enregistre le modèle Utilisateur dans /admin
#        pour pouvoir créer/voir/modifier des utilisateurs
#        via une interface graphique (utile pour tester !)
# ============================================================

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur


class UtilisateurAdmin(UserAdmin):
    # Ajouter les champs 'telephone', 'cni' et 'role' dans l'interface admin
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {'fields': ('telephone', 'cni', 'role')}),
    )

# UserAdmin : interface admin spécialisée pour les modèles
# qui héritent de AbstractUser (gère le hashage des mots de passe etc.)
admin.site.register(Utilisateur, UtilisateurAdmin)
