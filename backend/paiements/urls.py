# ============================================================
# backend/paiements/urls.py
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # POST /api/paiements/initier/ → initier un paiement
    path('initier/',  views.initier_paiement,  name='paiement-initier'),

    # POST /api/paiements/webhook/ → webhook opérateur
    path('webhook/',  views.webhook_paiement,  name='paiement-webhook'),
]