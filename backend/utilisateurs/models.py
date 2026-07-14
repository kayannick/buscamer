
# ============================================================
# RÔLE : Définit la structure de la table des utilisateurs.
#        Remplace le modèle User par défaut de Django.
#
# INTERACTIONS :
#   ← Configuré dans : settings.py (AUTH_USER_MODEL)
#   → Utilisé par : voyages/models.py (Agence.gerant)
#                    reservations/models.py (Reservation.utilisateur)
#   → Sérialisé par : utilisateurs/serializers.py (Étape 4)
# ============================================================

from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """
    Modèle utilisateur personnalisé pour BusCam.

    HÉRITE DE AbstractUser, donc possède déjà :
    username, email, password, first_name, last_name,
    is_active, is_staff, date_joined, etc.

    ON AJOUTE les champs spécifiques au contexte camerounais.
    """

    # --------------------------------------------------------
    # CHOICES : définit un menu déroulant de valeurs possibles
    # Format : (valeur_stockée_en_BDD, label_affiché_humain)
    # --------------------------------------------------------
    class RoleChoices(models.TextChoices):
        VOYAGEUR = 'VOYAGEUR', 'Voyageur'
        AGENT = 'AGENT', 'Agent d\'agence'
        ADMIN = 'ADMIN', 'Administrateur'

    # CharField : texte court, max_length OBLIGATOIRE
    # unique=True : deux utilisateurs ne peuvent pas avoir le même numéro
    telephone = models.CharField(
        max_length=15,
        unique=True,
        null=True,
        blank=True,
        help_text="Format: 6XXXXXXXX (sans le +237)"
    )

    # CNI = Carte Nationale d'Identité
    # blank=True : champ optionnel dans les formulaires
    # null=True  : peut être NULL en base de données
    cni = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Numéro CNI"
    )

    # Champ avec choix limités, valeur par défaut = VOYAGEUR
    role = models.CharField(
        max_length=10,
        choices=RoleChoices.choices,
        default=RoleChoices.VOYAGEUR
    )

    # ImageField : nécessite Pillow (installé en Étape 2)
    # upload_to : sous-dossier dans MEDIA_ROOT
    photo_profil = models.ImageField(
        upload_to='profils/',
        blank=True,
        null=True
    )

    # DateTimeField avec auto_now_add :
    # rempli AUTOMATIQUEMENT à la CRÉATION, jamais modifiable après
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """
        MÉTHODE __str__ :
        - ENTRÉE  : aucune (appelée sur self)
        - SORTIE  : une chaîne de caractères
        - UTILITÉ : c'est ce qui s'affiche dans l'admin Django
                    et quand vous faites print(utilisateur)

        Sans cette méthode, Django afficherait :
        "Utilisateur object (1)" — pas très utile !
        """
        return f"{self.get_full_name()} ({self.telephone}) - {self.role}"

    class Meta:
        """
        Meta : options de configuration du modèle (pas un champ !)
        verbose_name : nom singulier dans l'admin
        verbose_name_plural : nom pluriel (Django ajoute 's' sinon,
                              ce qui donnerait "Utilisateurs" → ok ici,
                              mais utile pour les mots irréguliers)
        """
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

