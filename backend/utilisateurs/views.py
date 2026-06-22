# ============================================================
#
# RÔLE : Gère l'inscription, le profil utilisateur.
#        L'authentification (login) est gérée par SimpleJWT
#        directement dans urls.py (pas besoin de View custom).
#
# INTERACTIONS :
#   ← Utilise : serializers.py (InscriptionSerializer, UtilisateurSerializer)
#   → Routé par : utilisateurs/urls.py
# ============================================================

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
