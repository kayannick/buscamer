# ============================================================
# backend/reservations/models.py
#
# RÔLE : Représente UN billet acheté par UN voyageur
#        pour UN voyage spécifique.
#
# INTERACTIONS :
#   ← Référence : voyages.Voyage (FK)
#   ← Référence : utilisateurs.Utilisateur (FK)
#   → Lu par : voyages.models.Voyage.places_disponibles (property)
#   → Sérialisé par : reservations/serializers.py (Étape 4)
# ============================================================

from django.db import models
from django.conf import settings
from voyages.models import Voyage  # Import inter-app !
import uuid


class Reservation(models.Model):
    """
    Le pont entre un Utilisateur et un Voyage.
    Représente un billet réservé (payé ou non).
    """

    class StatutPaiementChoices(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente de paiement'
        CONFIRME = 'CONFIRME', 'Confirmé'
        ANNULE = 'ANNULE', 'Annulé'
        REMBOURSE = 'REMBOURSE', 'Remboursé'

    # related_name='reservations' → voyage.reservations.all()
    # C'EST CE QUI EST UTILISÉ dans Voyage.places_disponibles !
    voyage = models.ForeignKey(
        Voyage,
        on_delete=models.CASCADE,
        related_name='reservations'
    )

    # related_name='reservations' → utilisateur.reservations.all()
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )

    numero_siege = models.PositiveIntegerField(
        help_text="Numéro de siège dans le bus (1 à capacité_bus)"
    )

    # --------------------------------------------------------
    # numero_billet : identifiant UNIQUE et IMPRÉVISIBLE
    #
    # uuid.uuid4 génère un identifiant comme :
    # "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    #
    # default=uuid.uuid4 : Django appelle cette fonction
    # CHAQUE FOIS qu'un nouvel objet est créé
    # (⚠️ sans les parenthèses ! uuid.uuid4 PAS uuid.uuid4())
    #
    # editable=False : invisible et non modifiable dans
    # les formulaires admin/API
    # --------------------------------------------------------
    numero_billet = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    statut_paiement = models.CharField(
        max_length=12,
        choices=StatutPaiementChoices.choices,
        default=StatutPaiementChoices.EN_ATTENTE
    )

    montant_paye = models.DecimalField(max_digits=10, decimal_places=2)

    date_reservation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Billet {self.numero_billet} - {self.utilisateur.username}"

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        ordering = ['-date_reservation']  # Plus récentes en premier

        # --------------------------------------------------------
        # CONTRAINTE D'UNICITÉ COMPOSITE :
        # Empêche DEUX réservations sur le MÊME siège
        # pour le MÊME voyage.
        #
        # C'est LA RÈGLE MÉTIER LA PLUS IMPORTANTE de l'app !
        # Sans ça → double réservation = conflit le jour du départ.
        # --------------------------------------------------------
        constraints = [
            models.UniqueConstraint(
                fields=['voyage', 'numero_siege'],
                condition=models.Q(statut_paiement='CONFIRME'),
                name='siege_unique_par_voyage_si_confirme'
            )
        ]

