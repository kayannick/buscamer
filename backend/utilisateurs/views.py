# ============================================================
#
# RÔLE : Gère l'inscription, le profil utilisateur.
#        L'authentification (login) est gérée par SimpleJWT
#        directement dans urls.py (pas besoin de View custom).
#
# INTERACTIONS :
#   ← Utilise : serializers.py (InscriptionSerializer, UtilisateurSerializer)
#   → Routé par : utilisateurs/urls.py
#
# MODIFICATION : La vue de connexion (obtention token JWT)
# doit retourner le role dans la réponse pour que le frontend
# puisse rediriger selon le rôle sans faire un appel supplémentaire.

# AJOUT : BusCamTokenSerializer retourne le rôle dans la réponse
# JWT pour que le frontend puisse rediriger sans appel supplémentaire.
# ============================================================

from rest_framework_simplejwt.views      import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework                      import serializers

from rest_framework import generics, permissions
from .models import Utilisateur
from .serializers import InscriptionSerializer, UtilisateurSerializer


class InscriptionView(generics.CreateAPIView):
    """
    Endpoint : POST /api/utilisateurs/inscription/

    generics.CreateAPIView : vue PRÉFABRIQUÉE qui ne gère
    QUE la création (POST). Pas besoin de tout un ViewSet ici.

    FLUX :
      1. React envoie POST avec {username, email, password, ...}
      2. DRF appelle automatiquement InscriptionSerializer(data=request.data)
      3. .is_valid() déclenche validate() du serializer
      4. .save() déclenche create() du serializer
      5. DRF renvoie le nouvel utilisateur créé (sans password) + status 201
    """
    queryset = Utilisateur.objects.all() 
    serializer_class = InscriptionSerializer

    # AllowAny : n'importe qui (même non connecté) peut s'inscrire !
    # Override le DEFAULT_PERMISSION_CLASSES (IsAuthenticated) de settings.py
    permission_classes = [permissions.AllowAny]


class ProfilView(generics.RetrieveUpdateAPIView):
    """
    Endpoint : GET/PUT/PATCH /api/utilisateurs/profil/

    RetrieveUpdateAPIView : voir ET modifier UN SEUL objet
    (pas de liste, pas de suppression).

    Pas de pk dans l'URL : on renvoie TOUJOURS le profil
    de l'utilisateur CONNECTÉ (request.user).
    """
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        SURCHARGE de get_object().

        ENTRÉE  : self (avec self.request disponible)
        SORTIE  : l'instance Utilisateur à sérialiser

        Par défaut, DRF chercherait un objet via un 'pk' dans l'URL
        (ex: /profil/5/). Ici on n'en a pas besoin :
        request.user EST DÉJÀ l'utilisateur identifié par le token JWT.

        D'où vient request.user ?
        → JWTAuthentication (settings.py) décode le token,
          retrouve l'Utilisateur correspondant, et l'attache
          à request.user AVANT que cette méthode soit appelée.
        """
        return self.request.user



class BusCamTokenSerializer(TokenObtainPairSerializer):
    """
    Surcharge JWT : ajoute role + nom dans la réponse de connexion.
    Permet au frontend de rediriger immédiatement selon le rôle.
    """

    def validate(self, attrs):
        # Appel du validate parent (génère access + refresh tokens)
        data = super().validate(attrs)

        # Ajoute les infos utilisateur dans la réponse
        data['role']       = self.user.role
        data['username']   = self.user.username
        data['first_name'] = self.user.first_name
        data['last_name']  = self.user.last_name

        return data


class BusCamTokenObtainPairView(TokenObtainPairView):
    serializer_class = BusCamTokenSerializer