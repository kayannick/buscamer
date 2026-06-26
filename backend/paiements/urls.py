
# # ============================================================

# # ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('initier/',                     views.initier_paiement, name='paiement-initier'),
    path('webhook/mtn/',                 views.webhook_mtn,      name='webhook-mtn'),
    path('webhook/orange/',              views.webhook_orange,   name='webhook-orange'),
    path('statut/<int:reservation_id>/', views.statut_paiement,  name='paiement-statut'),
]