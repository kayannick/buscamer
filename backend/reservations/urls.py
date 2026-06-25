# ============================================================

# ============================================================

from rest_framework.routers import DefaultRouter
from .views import ReservationViewSet

from django.urls  import path
from rest_framework.routers import DefaultRouter
from .views       import ReservationViewSet
from paiements.views import generer_billet_pdf  # ← import

router = DefaultRouter()
router.register('reservations', ReservationViewSet, basename='reservation')

urlpatterns = router.urls


router = DefaultRouter()
router.register('reservations', ReservationViewSet, basename='reservation')

urlpatterns = router.urls + [
    # Téléchargement du billet PDF
    path(
        'reservations/<int:reservation_id>/billet-pdf/',
        generer_billet_pdf,
        name='billet-pdf'
    ),
]