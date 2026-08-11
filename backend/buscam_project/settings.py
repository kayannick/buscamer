"""
Django settings for buscam_project.

VERSION : Production-ready (Render.com)
AUTEUR  : BusCam Team

INTERACTIONS :
  Lu par  : manage.py, wsgi.py au démarrage
  Utilise : fichier .env (variables sensibles)
  Déployé : Render.com (PostgreSQL + Whitenoise)
"""

# ============================================================
# IMPORTS
# ============================================================

import os
from datetime import timedelta
from pathlib  import Path
from decouple import config, Csv   # python-decouple → lit le .env


# ============================================================
# SECTION 1 — CHEMINS DE BASE
# ============================================================
#
# BASE_DIR = dossier racine du backend (là où se trouve manage.py)
# Exemple : /home/user/buscam/backend/
#
# Toutes les autres config de chemins se basent sur BASE_DIR.
# On n'écrit JAMAIS de chemin absolu en dur.

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# SECTION 2 — SÉCURITÉ
# ============================================================

# Clé secrète Django (signage cookies, CSRF, sessions).
# JAMAIS exposée. Toujours lue depuis .env.
SECRET_KEY = config('SECRET_KEY')

# DEBUG=True  → stack trace visible, fichiers statiques servis par Django
# DEBUG=False → mode production, erreurs génériques, Whitenoise pour static
# Valeur lue depuis .env : DEBUG=False en prod, DEBUG=True en dev
DEBUG = config('DEBUG', default=False, cast=bool)

# Domaines autorisés à accéder à ce serveur Django.
# En dev  : localhost, 127.0.0.1
# En prod : votre-app.onrender.com + localhost pour les health checks Render
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=Csv()
)


# ============================================================
# SECTION 3 — APPLICATIONS INSTALLÉES
# ============================================================
#
# Ordre conseillé :
#   1. Apps Django natives
#   2. Apps tiers (pip install ...)
#   3. Vos apps métier
#
# Django ne connaît PAS vos apps automatiquement.
# Vous DEVEZ les déclarer ici.

INSTALLED_APPS = [

    # ── Apps Django natives (le noyau) ───────────────────────
    'django.contrib.admin',         # Interface /admin
    'django.contrib.auth',          # Authentification et permissions
    'django.contrib.contenttypes',  # Framework types de contenu
    'django.contrib.sessions',      # Gestion des sessions
    'django.contrib.messages',      # Messages flash
    'django.contrib.staticfiles',   # Gestion fichiers statiques

    # ── Apps tiers ────────────────────────────────────────────
    'rest_framework',               # Django REST Framework (notre API)
    'rest_framework.authtoken',     # Tokens d'authentification DRF
    'rest_framework_simplejwt',     # Authentification JWT (JSON Web Token)
    'corsheaders',                  # CORS : autorise React à parler à Django
    'django_filters',               # Filtres avancés sur les querysets

    # ── Vos applications métier ───────────────────────────────
    'utilisateurs',                 # Voyageurs, agents, authentification
    'voyages',                      # Agences, bus, trajets
    'reservations',                 # Billets et réservations
    'paiements',                    # Paiements Mobile Money (MTN, Orange)
]


# ============================================================
# SECTION 4 — MIDDLEWARES
# ============================================================
#
# Chaque requête HTTP traverse cette liste dans l'ordre.
# La réponse la traverse dans l'ordre INVERSE.
#
# ORDRE CRITIQUE :
#   CorsMiddleware      → EN PREMIER (intercept les preflight OPTIONS)
#   SecurityMiddleware  → Juste après (headers de sécurité)
#   WhiteNoiseMiddleware→ Après Security (sert les fichiers statiques)
#
# Flux : Requête → [Cors → Security → Whitenoise → ... → View]
#        Réponse ← [Cors ← Security ← Whitenoise ← ... ← View]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',              # 1. CORS (en premier)
    'django.middleware.security.SecurityMiddleware',      # 2. Sécurité HTTP
    'whitenoise.middleware.WhiteNoiseMiddleware',         # 3. Fichiers statiques
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ============================================================
# SECTION 5 — ROUTAGE PRINCIPAL
# ============================================================

# Django lit d'abord CE fichier urls.py pour distribuer les requêtes.
ROOT_URLCONF = 'buscam_project.urls'


# ============================================================
# SECTION 6 — TEMPLATES (HTML pour /admin uniquement)
# ============================================================
#
# Notre API est "headless" (pas de HTML Django côté voyageur).
# Cette config sert uniquement à l'interface /admin.

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS'   : [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'buscam_project.wsgi.application'


# ============================================================
# SECTION 7 — BASE DE DONNÉES
# ============================================================
#
# LOGIQUE :
#   Sur Render → DATABASE_URL est fourni automatiquement.
#   En local  → on utilise les variables DB_* du .env.
#
# dj-database-url parse l'URL PostgreSQL en dict Django.
# conn_max_age=600 = garde les connexions ouvertes 10 min (performance).

DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    # ── Production Render : utilise l'URL complète ────────────
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age = 600,    # Connexions persistantes 10 min
            ssl_require  = True,   # SSL obligatoire sur Render
        )
    }
else:
    # ── Développement local : variables .env individuelles ────
    DATABASES = {
        'default': {
            'ENGINE'  : 'django.db.backends.postgresql',
            'NAME'    : config('DB_NAME'),
            'USER'    : config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST'    : config('DB_HOST',    default='localhost'),
            'PORT'    : config('DB_PORT',    default='5432'),
            'OPTIONS' : {'options': '-c client_encoding=utf8'},
        }
    }


# ============================================================
# SECTION 8 — VALIDATION DES MOTS DE PASSE
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    # Le MDP ne doit pas ressembler aux infos utilisateur
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    # Minimum 8 caractères
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    # Pas un MDP trop commun (liste noire)
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    # Pas entièrement numérique
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ============================================================
# SECTION 9 — INTERNATIONALISATION ET FUSEAU HORAIRE
# ============================================================

LANGUAGE_CODE = 'fr-fr'          # Interface Django en français
TIME_ZONE     = 'Africa/Douala'  # Fuseau du Cameroun (UTC+1)
USE_I18N      = True             # Active la traduction
USE_TZ        = True             # Stockage en UTC, affichage en Africa/Douala


# ============================================================
# SECTION 10 — FICHIERS STATIQUES ET MÉDIAS
# ============================================================
#
# Fichiers STATIQUES : CSS, JS, images de l'admin Django
#   → collectés par "python manage.py collectstatic"
#   → servis par Whitenoise (pas besoin de Nginx)
#
# Fichiers MÉDIAS : uploads utilisateurs (logos agences, photos)
#   → En production sur Render : utiliser Cloudinary ou S3
#     (Render efface les fichiers uploadés à chaque déploiement)

# URL d'accès aux fichiers statiques
STATIC_URL  = '/static/'
# Dossier où collectstatic rassemble tous les fichiers statiques
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Whitenoise : compression + cache des fichiers statiques
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# URL d'accès aux médias uploadés
MEDIA_URL  = '/media/'
# Dossier de stockage des médias (backend/media/)
MEDIA_ROOT = BASE_DIR / 'media'


# ============================================================
# SECTION 11 — CLÉ PRIMAIRE PAR DÉFAUT
# ============================================================

# BigAutoField = entier 64-bit (évite de manquer d'IDs)
# AutoField classique = 32-bit (max ~2 milliards de lignes)
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================================
# SECTION 12 — MODÈLE UTILISATEUR PERSONNALISÉ
# ============================================================
#
# Utilise VOTRE modèle Utilisateur (avec rôles VOYAGEUR/AGENT/ADMIN)
# au lieu du User Django par défaut.
#
# ⚠️ CRITIQUE : doit être défini AVANT la première migration.
# Changer après coup casse la base de données.

AUTH_USER_MODEL = 'utilisateurs.Utilisateur'


# ============================================================
# SECTION 13 — CORS (Cross-Origin Resource Sharing)
# ============================================================
#
# CORS permet à React (port 5173) de parler à Django (port 8000).
# Sans CORS, le navigateur bloque les requêtes "cross-origin".
#
# En production : React est sur Vercel, Django sur Render.
# FRONTEND_URL dans .env = https://buscam.vercel.app
#
# CORS_ALLOWED_ORIGINS : liste blanche stricte des domaines autorisés.
# CORS_ALLOW_ALL_ORIGINS = False : on n'autorise PAS tout le monde.

CORS_ALLOWED_ORIGINS = [
    # URLs de développement local
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    # URL de production (lue depuis .env)
    config('FRONTEND_URL', default='http://localhost:5173'),
]

# Supprime les doublons si FRONTEND_URL est déjà localhost:5173
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS))

CORS_ALLOW_CREDENTIALS = True   # Autorise les cookies cross-origin
CORS_ALLOW_ALL_ORIGINS = False  # Sécurité : liste blanche uniquement

# En-têtes autorisés dans les requêtes entrantes
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',       # Pour les tokens JWT (Bearer ...)
    'content-type',        # Pour envoyer du JSON
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Méthodes HTTP autorisées
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',   # Requête "preflight" du navigateur
    'PATCH',
    'POST',
    'PUT',
]


# ============================================================
# SECTION 14 — DJANGO REST FRAMEWORK (DRF)
# ============================================================
#
# DRF a son propre dictionnaire de configuration.
# Ces paramètres s'appliquent à TOUS les endpoints de l'API.
# Chaque ViewSet peut les surcharger individuellement.
#
# AUTHENTIFICATION : Comment DRF identifie l'utilisateur ?
#   JWTAuthentication  → lit le header "Authorization: Bearer <token>"
#   SessionAuthentication → lit le cookie de session (pour /admin)
#
# PERMISSION : Qui peut accéder ?
#   IsAuthenticated → token JWT valide requis (défaut)
#   AllowAny → accessible sans connexion (surcharge dans les views publiques)
#
# PAGINATION : Évite de renvoyer 10 000 voyages d'un coup.
#   PageNumberPagination → ?page=1, ?page=2...
#   PAGE_SIZE = 20 → 20 résultats par page

REST_FRAMEWORK = {

    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],

    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        # BrowsableAPIRenderer retiré en production (sécurité + performance)
        # Réactivez-le en dev si vous voulez l'interface navigable DRF
    ],

    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],

    'DEFAULT_PAGINATION_CLASS' : 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE'                : 20,
}


# ============================================================
# SECTION 15 — JWT (JSON Web Token) — SimpleJWT
# ============================================================
#
# FONCTIONNEMENT :
#   1. L'utilisateur se connecte → Django retourne 2 tokens :
#      - access_token  : valide 60 min → inclus dans chaque requête
#      - refresh_token : valide 7 jours → permet de renouveler l'access
#
#   2. React stocke les tokens dans localStorage
#   3. Chaque requête inclut : Authorization: Bearer <access_token>
#   4. Django vérifie la signature → identifie l'utilisateur
#
#   ROTATE_REFRESH_TOKENS = True :
#     Chaque fois qu'on renouvelle l'access, on reçoit AUSSI
#     un nouveau refresh (rotation de sécurité).
#
#   BLACKLIST_AFTER_ROTATION = True :
#     L'ancien refresh est mis en liste noire (ne peut plus servir).
#     Empêche la réutilisation d'un token volé.

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME' : timedelta(minutes=60),   # Access : 1 heure
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),       # Refresh : 7 jours
    'ROTATE_REFRESH_TOKENS' : True,    # Nouveau refresh à chaque rotation
    'BLACKLIST_AFTER_ROTATION': True,  # Ancien refresh invalidé
    'AUTH_HEADER_TYPES'     : ('Bearer',),  # "Authorization: Bearer ..."
    'AUTH_TOKEN_CLASSES'    : ('rest_framework_simplejwt.tokens.AccessToken',),
}


# ============================================================
# SECTION 16 — LOGGING (journaux d'erreurs)
# ============================================================
#
# En production, les erreurs ne s'affichent plus dans le navigateur.
# Cette config les écrit dans un fichier log sur le serveur.
# Sur Render : les logs sont visibles dans le Dashboard → Logs.

LOGGING = {
    'version'                 : 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style' : '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style' : '{',
        },
    },
    'handlers': {
        # Affiche dans la console (visible dans Render Dashboard → Logs)
        'console': {
            'class'    : 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level'   : 'WARNING',    # Seulement WARN + ERROR + CRITICAL
    },
    'loggers': {
        'django': {
            'handlers'  : ['console'],
            'level'     : config('DJANGO_LOG_LEVEL', default='WARNING'),
            'propagate' : False,
        },
        # Vos apps métier → logs INFO et au-dessus
        'paiements'   : {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'reservations': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'voyages'     : {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}


# ============================================================
# SECTION 17 — VARIABLES MÉTIER (paiements, SMS, notifications)
# ============================================================
#
# Toutes ces valeurs viennent du .env (jamais en dur dans le code).
# En dev : .env local
# En prod : variables d'environnement Render (Dashboard → Environment)

# ── MTN Mobile Money ──────────────────────────────────────────
MTN_MOMO_SUBSCRIPTION_KEY = config('MTN_MOMO_SUBSCRIPTION_KEY', default='')
MTN_MOMO_API_USER         = config('MTN_MOMO_API_USER',         default='')
MTN_MOMO_API_KEY          = config('MTN_MOMO_API_KEY',          default='')
MTN_MOMO_ENV              = config('MTN_MOMO_ENV',              default='sandbox')
MTN_MOMO_BASE_URL         = config('MTN_MOMO_BASE_URL',         default='https://sandbox.momodeveloper.mtn.com')

# ── Orange Money Cameroun ─────────────────────────────────────
ORANGE_CLIENT_ID     = config('ORANGE_CLIENT_ID',     default='')
ORANGE_CLIENT_SECRET = config('ORANGE_CLIENT_SECRET', default='')
ORANGE_MERCHANT_KEY  = config('ORANGE_MERCHANT_KEY',  default='')
ORANGE_ENV           = config('ORANGE_ENV',           default='sandbox')
ORANGE_BASE_URL      = config('ORANGE_BASE_URL',      default='https://api.orange.com')

# ── Africa's Talking (SMS principal) ──────────────────────────
AT_USERNAME  = config('AT_USERNAME',  default='sandbox')
AT_API_KEY   = config('AT_API_KEY',   default='')
AT_SENDER_ID = config('AT_SENDER_ID', default='BusCam')
AT_ENV       = config('AT_ENV',       default='sandbox')

# ── Twilio (SMS fallback) ──────────────────────────────────────
TWILIO_ACCOUNT_SID  = config('TWILIO_ACCOUNT_SID',  default='')
TWILIO_AUTH_TOKEN   = config('TWILIO_AUTH_TOKEN',   default='')
TWILIO_PHONE_NUMBER = config('TWILIO_PHONE_NUMBER', default='')

# ── WhatsApp Business API ──────────────────────────────────────
WHATSAPP_TOKEN           = config('WHATSAPP_TOKEN',           default='')
WHATSAPP_PHONE_NUMBER_ID = config('WHATSAPP_PHONE_NUMBER_ID', default='')
WHATSAPP_BUSINESS_ID     = config('WHATSAPP_BUSINESS_ID',     default='')

# ── URL du backend (pour les webhooks paiement) ───────────────
WEBHOOK_BASE_URL = config('WEBHOOK_BASE_URL', default='http://localhost:8000')

# ── URL du frontend ───────────────────────────────────────────
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')