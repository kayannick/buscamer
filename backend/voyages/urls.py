# ============================================================
#
# RÔLE : Définit les routes de l'app "voyages".
#        Utilise un Router DRF pour générer automatiquement
#        toutes les routes CRUD des ViewSets.
#
# INTERACTIONS :
#   ← Inclus par : buscam_project/urls.py
#   → Pointe vers : views.py (AgenceViewSet, BusViewSet, VoyageViewSet)
# ============================================================

from rest_framework.routers import DefaultRouter
from .views import AgenceViewSet, BusViewSet, VoyageViewSet

# DefaultRouter : génère aussi une page d'accueil HTML listant
# tous les endpoints disponibles (très utile en développement,
# visitez /api/ dans votre navigateur !)
router = DefaultRouter()

# router.register(prefix, viewset, basename)
#
# prefix='voyages' → génère :
#   /voyages/        (list, create)
#   /voyages/{pk}/   (retrieve, update, destroy)
router.register('agences', AgenceViewSet, basename='agence')
router.register('bus', BusViewSet, basename='bus')
router.register('voyages', VoyageViewSet, basename='voyage')

# router.urls : une LISTE de patterns d'URL générée automatiquement
urlpatterns = router.urls
