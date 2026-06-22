# ============================================================
#
# RÔLE : Traduit Agence, Bus, Chauffeur, Voyage ↔ JSON.
#        Gère la sérialisation IMBRIQUÉE (nested) :
#        un Voyage affiche les détails de son Bus et son Agence,
#        pas juste leurs IDs.
#
# INTERACTIONS :
#   ← Lit : voyages/models.py
#   → Utilisé par : voyages/views.py
# ============================================================

from rest_framework import serializers
from .models import Agence, Bus, Chauffeur, Voyage


class AgenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agence
        fields = ['id', 'nom', 'ville_siege', 'telephone', 'email', 'logo']


class ChauffeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chauffeur
        fields = ['id', 'nom_complet', 'telephone', 'numero_permis']


class BusSerializer(serializers.ModelSerializer):
    """
    Inclut le chauffeur attitré EN ENTIER (objet imbriqué),
    pas juste son ID.
    """

    # --------------------------------------------------------
    # SERIALIZER IMBRIQUÉ (Nested Serializer)
    #
    # Sans ceci, Django renverrait juste :
    #   "chauffeur_attitre": 5  (l'ID)
    #
    # AVEC ceci, Django renvoie :
    #   "chauffeur_attitre": {
    #       "id": 5, "nom_complet": "Paul Biya Jr.", ...
    #   }
    #
    # read_only=True : car on ne crée/modifie pas le chauffeur
    # DEPUIS le serializer Bus (il a son propre endpoint)
    # --------------------------------------------------------
    chauffeur_attitre = ChauffeurSerializer(read_only=True)

    class Meta:
        model = Bus
        fields = [
            'id', 'agence', 'immatriculation', 'capacite',
            'type_bus', 'est_actif', 'chauffeur_attitre'
        ]


class VoyageListSerializer(serializers.ModelSerializer):
    """
    Serializer pour la LISTE des voyages (recherche, page d'accueil).

    Optimisé : affiche les infos ESSENTIELLES + noms lisibles,
    SANS surcharger la réponse avec tous les détails du Bus.
    """

    # --------------------------------------------------------
    # SerializerMethodField : champ CALCULÉ dynamiquement
    # par une méthode get_<nom_du_champ>
    #
    # ENTRÉE  : obj = l'instance Voyage en cours de sérialisation
    # SORTIE  : la valeur à mettre dans le JSON pour ce champ
    # --------------------------------------------------------
    places_disponibles = serializers.SerializerMethodField()

    # source='agence.nom' : va chercher voyage.agence.nom
    # et le place directement dans le champ "agence_nom"
    # → Évite à React de faire un 2ème appel API pour le nom !
    agence_nom = serializers.CharField(source='agence.nom', read_only=True)

    # Pour CharField avec choices, on utilise une SerializerMethodField
    # ou CharField(source='get_<champ>_display')
    ville_depart_display = serializers.CharField(
        source='get_ville_depart_display', read_only=True
    )
    ville_arrivee_display = serializers.CharField(
        source='get_ville_arrivee_display', read_only=True
    )

    type_bus = serializers.CharField(source='bus.type_bus', read_only=True)

    class Meta:
        model = Voyage
        fields = [
            'id', 'agence', 'agence_nom',
            'ville_depart', 'ville_depart_display',
            'ville_arrivee', 'ville_arrivee_display',
            'date_heure_depart', 'duree_estimee',
            'prix', 'statut', 'type_bus', 'places_disponibles'
        ]

    def get_places_disponibles(self, obj):
        """
        ENTRÉE  : obj = instance Voyage
        SORTIE  : entier (nombre de places restantes)

        Appelle simplement la @property définie dans models.py.
        Le serializer "expose" cette logique métier au JSON.
        """
        return obj.places_disponibles


class VoyageDetailSerializer(serializers.ModelSerializer):
    """
    Serializer pour le DÉTAIL d'un voyage (page de réservation).
    Inclut TOUTES les infos : agence complète, bus complet, chauffeur.
    """

    agence = AgenceSerializer(read_only=True)
    bus = BusSerializer(read_only=True)
    places_disponibles = serializers.SerializerMethodField()
    ville_depart_display = serializers.CharField(
        source='get_ville_depart_display', read_only=True
    )
    ville_arrivee_display = serializers.CharField(
        source='get_ville_arrivee_display', read_only=True
    )

    class Meta:
        model = Voyage
        fields = [
            'id', 'agence', 'bus',
            'ville_depart', 'ville_depart_display',
            'ville_arrivee', 'ville_arrivee_display',
            'date_heure_depart', 'duree_estimee',
            'prix', 'statut', 'places_disponibles'
        ]

    def get_places_disponibles(self, obj):
        return obj.places_disponibles


class VoyageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer DÉDIÉ à la CRÉATION/MODIFICATION d'un voyage
    (utilisé par les agents d'agence).

    Différent des serializers ci-dessus : ici 'agence' et 'bus'
    sont des FK MODIFIABLES (on envoie juste leurs IDs),
    pas des objets imbriqués en lecture seule.
    """

    class Meta:
        model = Voyage
        fields = [
            'id', 'agence', 'bus', 'ville_depart', 'ville_arrivee',
            'date_heure_depart', 'duree_estimee', 'prix', 'statut'
        ]

    def validate(self, attrs):
        """
        Réutilise la contrainte métier du modèle au niveau API
        pour donner un message d'erreur PROPRE à React
        (sinon, l'utilisateur verrait une erreur SQL brute en 500).
        """
        if attrs.get('ville_depart') == attrs.get('ville_arrivee'):
            raise serializers.ValidationError(
                "La ville de départ et d'arrivée doivent être différentes."
            )
        return attrs
