
# ============================================================

# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Initier un paiement
     # POST /api/paiements/initier/ → initier un paiement
    path('initier/',                       views.initier_paiement,  name='paiement-initier'),
    # Webhook opérateur (MTN/Orange appellent cette URL)
        # POST /api/paiements/webhook/ → webhook opérateur
    path('webhook/',                       views.webhook_paiement,  name='paiement-webhook'),
    # Polling statut depuis le frontend
    path('statut/<int:reservation_id>/',   views.statut_paiement,   name='paiement-statut'),
]