# ============================================================
# backend/voyages/models.py
#
# RÔLE : Définit Agence, Bus, Chauffeur, Voyage.
#        Le cœur du catalogue de l'application.
#
# INTERACTIONS :
#   ← Référence : utilisateurs.Utilisateur (Agence.gerant)
#   → Référencé par : reservations/models.py (Reservation.voyage)
#   → Sérialisé par : voyages/serializers.py (Étape 4)
#   → Interrogé par : voyages/views.py (Étape 4)
# ============================================================

from django.db import models
from django.conf import settings  # Pour référencer AUTH_USER_MODEL
from django.db.models import F, Q, CheckConstraint


class Agence(models.Model):
    """
    Représente une compagnie de transport
    (ex: Vatican Express, Touristique Express, Buca Voyages...)
    """

    nom = models.CharField(max_length=100, unique=True)

    # Ville où se trouve le siège principal
    ville_siege = models.CharField(max_length=50)

    telephone = models.CharField(max_length=15)

    # EmailField : valide automatiquement le format email
    email = models.EmailField(blank=True, null=True)

    # Logo de l'agence, affiché côté frontend
    logo = models.ImageField(upload_to='agences/logos/', blank=True, null=True)

    # --------------------------------------------------------
    # ForeignKey vers Utilisateur : QUI gère cette agence ?
    #
    # on_delete=models.SET_NULL : si l'utilisateur "gérant" est
    #   supprimé, l'agence N'EST PAS supprimée, juste gerant=NULL
    #
    # related_name='agence_geree' : permet de faire
    #   utilisateur.agence_geree  (depuis un Utilisateur,
    #   accéder à l'agence qu'il gère)
    # --------------------------------------------------------
    gerant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agence_geree'
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} ({self.ville_siege})"

    class Meta:
        verbose_name = "Agence"
        verbose_name_plural = "Agences"
        ordering = ['nom']  # Tri alphabétique par défaut


class Bus(models.Model):
    """
    Un véhicule appartenant à une Agence.
    """

    class TypeBusChoices(models.TextChoices):
        CLASSIQUE = 'CLASSIQUE', 'Classique'
        VIP = 'VIP', 'VIP'
        BUSINESS = 'BUSINESS', 'Business'

    # ForeignKey vers Agence : relation N:1
    # CASCADE : si l'Agence est supprimée, TOUS ses bus sont supprimés
    agence = models.ForeignKey(
        Agence,
        on_delete=models.CASCADE,
        related_name='bus'  # agence.bus.all() → tous les bus de l'agence
    )

    immatriculation = models.CharField(
        max_length=15,
        unique=True,
        help_text="Format: LT-1234-A"
    )

    # PositiveIntegerField : entier ne pouvant pas être négatif
    capacite = models.PositiveIntegerField(
        help_text="Nombre de places assises"
    )

    type_bus = models.CharField(
        max_length=10,
        choices=TypeBusChoices.choices,
        default=TypeBusChoices.CLASSIQUE
    )

    # BooleanField : true/false. Permet de désactiver un bus
    # (panne, maintenance) sans le supprimer de l'historique
    est_actif = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.immatriculation} - {self.agence.nom} ({self.get_type_bus_display()})"

    class Meta:
        verbose_name = "Bus"
        verbose_name_plural = "Bus"


class Chauffeur(models.Model):
    """
    Un chauffeur attitré à un Bus (relation 1:1).
    """

    nom_complet = models.CharField(max_length=100)

    telephone = models.CharField(max_length=15)

    numero_permis = models.CharField(max_length=30, unique=True)

    # OneToOneField : UN chauffeur ↔ UN bus
    # Différence avec ForeignKey : impose l'UNICITÉ
    # (un bus ne peut pas avoir 2 chauffeurs attitrés simultanément
    #  via ce champ ; pour une relation N:N, il faudrait un autre modèle)
    bus = models.OneToOneField(
        Bus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chauffeur_attitre'
        # Permet : bus.chauffeur_attitre → le Chauffeur (ou None)
    )

    def __str__(self):
        return self.nom_complet

    class Meta:
        verbose_name = "Chauffeur"
        verbose_name_plural = "Chauffeurs"

class Voyage(models.Model):
    """
    Représente UN trajet programmé : Yaoundé → Douala le 09/06 à 06h30.

    C'est le modèle CENTRAL de l'application : c'est sur lui
    que les utilisateurs cherchent et réservent.
    """

    class StatutChoices(models.TextChoices):
        PROGRAMME = 'PROGRAMME', 'Programmé'
        EN_COURS = 'EN_COURS', 'En cours'
        TERMINE = 'TERMINE', 'Terminé'
        ANNULE = 'ANNULE', 'Annulé'

    # --------------------------------------------------------
    # Liste des grandes villes camerounaises desservies.
    # Utiliser des CHOICES évite les fautes de frappe
    # ("Yaounde" vs "Yaoundé" vs "yaounde" → recherches cassées)
    # --------------------------------------------------------
    class VilleChoices(models.TextChoices):
        YAOUNDE = 'YAOUNDE', 'Yaoundé'
        DOUALA = 'DOUALA', 'Douala'
        BAFOUSSAM = 'BAFOUSSAM', 'Bafoussam'
        BAMENDA = 'BAMENDA', 'Bamenda'
        GAROUA = 'GAROUA', 'Garoua'
        MAROUA = 'MAROUA', 'Maroua'
        BERTOUA = 'BERTOUA', 'Bertoua'
        BUEA = 'BUEA', 'Buea'
        LIMBE = 'LIMBE', 'Limbé'
        EBOLOWA = 'EBOLOWA', 'Ébolowa'

    agence = models.ForeignKey(
        Agence,
        on_delete=models.CASCADE,
        related_name='voyages'
    )

    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='voyages'
    )

    ville_depart = models.CharField(
        max_length=20,
        choices=VilleChoices.choices
    )

    ville_arrivee = models.CharField(
        max_length=20,
        choices=VilleChoices.choices
    )

    # DateTimeField : stocke date ET heure
    # (contrairement à DateField qui ne stocke que la date)
    date_heure_depart = models.DateTimeField()

    # Estimation, car les routes camerounaises ont des aléas !
    duree_estimee = models.DurationField(
        help_text="Durée estimée du trajet (ex: 4h00:00)"
    )

    # DecimalField pour l'ARGENT : JAMAIS FloatField !
    #
    # POURQUOI ? FloatField utilise une représentation binaire
    # qui peut donner 3500.0000000001 au lieu de 3500.00
    # → erreurs d'arrondi catastrophiques sur des calculs financiers.
    #
    # max_digits=10 : 10 chiffres au total
    # decimal_places=2 : dont 2 après la virgule
    # → Valeur max possible : 99 999 999.99 FCFA
    prix = models.DecimalField(max_digits=10, decimal_places=2)

    statut = models.CharField(
        max_length=10,
        choices=StatutChoices.choices,
        default=StatutChoices.PROGRAMME
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    # --------------------------------------------------------
    # MÉTHODE MÉTIER (PROPERTY) : places_disponibles
    #
    # Une "property" se comporte comme un attribut mais
    # est CALCULÉE à la volée, jamais stockée en base.
    #
    # ENTRÉE  : self (l'instance Voyage)
    # SORTIE  : un entier (nombre de places restantes)
    # LOGIQUE : capacité totale du bus MOINS le nombre de
    #           réservations CONFIRMÉES sur ce voyage
    # --------------------------------------------------------
    @property
    def places_disponibles(self):
        # self.reservations vient du related_name défini
        # dans reservations/models.py (Phase 4 ci-dessous)
        nb_reservees = self.reservations.filter(
            statut_paiement='CONFIRME'
        ).count()
        return self.bus.capacite - nb_reservees

    def __str__(self):
        return (
            f"{self.get_ville_depart_display()} → "
            f"{self.get_ville_arrivee_display()} "
            f"({self.date_heure_depart.strftime('%d/%m/%Y %H:%M')})"
        )

    class Meta:
        verbose_name = "Voyage"
        verbose_name_plural = "Voyages"
        ordering = ['date_heure_depart']  # Trie les voyages par date

        # --------------------------------------------------------
        # CONTRAINTE D'INTÉGRITÉ : interdit ville_depart == ville_arrivee
        # Vérifié au niveau de la BASE DE DONNÉES, pas juste Python
        # --------------------------------------------------------
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(ville_depart=models.F('ville_arrivee')),
                name='depart_different_arrivee'
            )
        ]

