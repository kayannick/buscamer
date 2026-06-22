# ============================================================
#
# RÔLE : Routes d'authentification et de gestion de profil.
#
# Pas de Router ici car InscriptionView et ProfilView
# sont des generics.XxxAPIView, pas des ViewSets.
# ============================================================

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import InscriptionView, ProfilView

urlpatterns = [
    # POST /api/utilisateurs/inscription/
    path('inscription/', InscriptionView.as_view(), name='inscription'),

    # GET/PUT/PATCH /api/utilisateurs/profil/
    path('profil/', ProfilView.as_view(), name='profil'),

    # ----------------------------------------------------------
    # ENDPOINTS FOURNIS PAR SIMPLEJWT (pas besoin de les coder !)
    #
    # POST /api/utilisateurs/token/
    #   Body  : {"username": "jean", "password": "secret"}
    #   Réponse : {"access": "eyJ...", "refresh": "eyJ..."}
    #
    # POST /api/utilisateurs/token/refresh/
    #   Body  : {"refresh": "eyJ..."}
    #   Réponse : {"access": "eyJ..."}  (nouveau token d'accès)
    # ----------------------------------------------------------
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
