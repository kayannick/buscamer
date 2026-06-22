# ============================================================
#
# RÔLE : Enregistre le modèle Utilisateur dans /admin
#        pour pouvoir créer/voir/modifier des utilisateurs
#        via une interface graphique (utile pour tester !)
# ============================================================

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur

# UserAdmin : interface admin spécialisée pour les modèles
# qui héritent de AbstractUser (gère le hashage des mots de passe etc.)
admin.site.register(Utilisateur, UserAdmin)
