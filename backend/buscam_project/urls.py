"""
URL configuration for buscam_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# ============================================================
#
# RÔLE : Point d'entrée RACINE de toutes les URLs du projet.
#        Distribue le trafic vers les bonnes apps.
#
# INTERACTIONS :
#   ← Configuré dans : settings.py (ROOT_URLCONF)
#   → Inclut : utilisateurs/urls.py, voyages/urls.py,
#               reservations/urls.py
# ============================================================

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Interface d'administration Django
    path('admin/', admin.site.urls),

    # --------------------------------------------------------
    # include() : délègue TOUT ce qui suit le préfixe
    # au fichier urls.py de l'app concernée.
    #
    # Exemple : requête vers /api/voyages/
    #   1. Django retire 'api/'   → reste 'voyages/'
    #   2. Django retire 'voyages/' (préfixe de cette ligne)
    #      → reste ''
    #   3. voyages/urls.py reçoit '' → router le route vers
    #      VoyageViewSet.list()
    # --------------------------------------------------------
    path('api/utilisateurs/', include('utilisateurs.urls')),
    path('api/', include('voyages.urls')),       # → /api/voyages/, /api/agences/, /api/bus/
    path('api/', include('reservations.urls')),  # → /api/reservations/
    path('api/paiements/', include('paiements.urls')),
    
    # Ajouter cette ligne dans urlpatterns :
    path('api/agent/', include('voyages.urls_agent')),
]

# --------------------------------------------------------
# Servir les fichiers médias (photos uploadées) en DÉVELOPPEMENT
# uniquement (DEBUG=True). En production, un serveur web
# dédié (Nginx) s'en charge.
# --------------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
