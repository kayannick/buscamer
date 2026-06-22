# ============================================================
#
# RÔLE : Traduit Utilisateur (Python) ↔ JSON.
#        Gère AUSSI la création de compte (inscription)
#        et la validation des mots de passe.
#
# INTERACTIONS :
#   ← Lit : utilisateurs/models.py (Utilisateur)
#   → Utilisé par : utilisateurs/views.py
# ============================================================

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    """
    Serializer pour AFFICHER les infos d'un utilisateur
    (ex: dans le profil, ou dans une liste d'agents).

    ⚠️ NE JAMAIS inclure 'password' ici !
    """

    class Meta:
        model = Utilisateur
        # Liste EXPLICITE des champs exposés en JSON.
        # Tout champ du modèle NON listé ici est INVISIBLE pour l'API.
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'telephone', 'cni', 'role', 'photo_profil'
        ]
        # Champs présents dans la réponse JSON mais
        # IMPOSSIBLES à modifier via l'API (sécurité)
        read_only_fields = ['id', 'role']


class InscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer DÉDIÉ à la création de compte.
    Différent de UtilisateurSerializer car il gère :
      - le mot de passe (écriture uniquement)
      - la confirmation du mot de passe
      - le hashage sécurisé
    """

    # write_only=True : ce champ est ACCEPTÉ en entrée (POST)
    # mais JAMAIS renvoyé en sortie (sécurité : pas de password en JSON!)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]  # Vérifie robustesse (Section 8 settings.py)
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Utilisateur
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'telephone', 'cni'
        ]

    def validate(self, attrs):
        """
        VALIDATION CROISÉE entre plusieurs champs.

        ENTRÉE  : attrs = dict des données déjà validées individuellement
                  ex: {'username': 'jean', 'password': 'abc123',
                       'password2': 'abc123', ...}
        SORTIE  : attrs (si valide) OU lève une ValidationError

        Appelée APRÈS la validation de chaque champ individuel,
        mais AVANT la sauvegarde en base.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Les deux mots de passe ne correspondent pas."}
            )
        return attrs

    def create(self, validated_data):
        """
        SURCHARGE de la méthode create() par défaut.

        ENTRÉE  : validated_data = dict validé (sans password2,
                  on le retire manuellement ci-dessous)
        SORTIE  : une instance Utilisateur SAUVEGARDÉE en BDD

        POURQUOI surcharger ? Par défaut, ModelSerializer.create()
        ferait : Utilisateur.objects.create(**validated_data)
        → Le mot de passe serait stocké EN CLAIR. DANGER !

        On utilise create_user() qui HASHE le mot de passe
        automatiquement (algorithme PBKDF2 par défaut).
        """
        validated_data.pop('password2')  # Retire le champ de confirmation

        utilisateur  =  Utilisateur.objects.create_user(
            username = validated_data['username'],
            email    = validated_data['email'],
            password = validated_data['password'],  # create_user HASHE ici
            first_name = validated_data.get('first_name', ''),
            last_name  = validated_data.get('last_name', ''),
            telephone  = validated_data['telephone'],
            cni=validated_data.get('cni'),
        )
        return utilisateur
