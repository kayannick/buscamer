# ============================================================
#
# RÔLE : Stocke les transactions de paiement Mobile Money.
#
# INTERACTIONS :
#   ← Liée à : reservations.Reservation (FK)
#   → Utilisée par : paiements/views.py, paiements/serializers.py
# ============================================================

from django.db import models
from reservations.models import Reservation
import uuid


class Paiement(models.Model):

    class MethodeChoices(models.TextChoices):
        MTN_MOMO     = 'MTN_MOMO',     'MTN Mobile Money'
        ORANGE_MONEY = 'ORANGE_MONEY', 'Orange Money'
        CASH         = 'CASH',         'Espèces'

    class StatutChoices(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        CONFIRME   = 'CONFIRME',   'Confirmé'
        ECHOUE     = 'ECHOUE',     'Échoué'
        REMBOURSE  = 'REMBOURSE',  'Remboursé'

    # ── Champs principaux ─────────────────────────────────────
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name='paiement',
    )

    methode = models.CharField(
        max_length=15,
        choices=MethodeChoices.choices,
    )

    # Numéro de téléphone utilisé pour le paiement
    telephone_paiement = models.CharField(max_length=15)

    montant = models.DecimalField(max_digits=10, decimal_places=2)

    statut = models.CharField(
        max_length=12,
        choices=StatutChoices.choices,
        default=StatutChoices.EN_ATTENTE,
    )

    # Référence unique de la transaction (générée par notre système)
    reference_interne = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    # Référence retournée par l'opérateur (MTN ou Orange)
    # Null au début, remplie quand l'opérateur confirme
    reference_operateur = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    # Dates
    date_initiation  = models.DateTimeField(auto_now_add=True)
    date_confirmation = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Paiement {self.reference_interne} — {self.statut}"

    class Meta:
        verbose_name        = 'Paiement'
        verbose_name_plural = 'Paiements'
        ordering            = ['-date_initiation']