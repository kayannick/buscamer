# ============================================================
#
# RÔLE : Enregistre Reservation dans /admin
# ============================================================

from django.contrib import admin
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = [
        'numero_billet', 'utilisateur', 'voyage',
        'numero_siege', 'statut_paiement', 'montant_paye'
    ]
    list_filter = ['statut_paiement']
    readonly_fields = ['numero_billet']  # Ne peut pas être modifié à la main

