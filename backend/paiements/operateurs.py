# ============================================================
#  — ORANGE MONEY CAMEROUN CORRIGÉ
#
# DOCUMENTATION OFFICIELLE :
#   https://developer.orange.com/apis/om-webpay-cm/getting-started
#
# INSCRIPTION (obligatoire avant tout) :
#   1. https://developer.orange.com/
#   2. Sign Up → créer un compte développeur
#   3. My Apps → Create App
#   4. Ajouter l'API : "Orange Money WebPay CM"
#   5. Récupérer : Client ID + Client Secret
#   6. Demander l'accès PRODUCTION (email au support Orange)
#
# TARIFICATION :
#   Sandbox : GRATUIT
#   Production : 1% par transaction (minimum 100 FCFA)
#   Paiement mensuel à Orange sur facture
#
# DIFFÉRENCE SANDBOX vs PRODUCTION :
#   Sandbox  : utilise de FAUX numéros de téléphone
#              (ex: 690000001 = succès, 690000002 = échec)
#   Production : utilise les vrais numéros Orange Cameroun
#
# VARIABLES .env REQUISES :
#   ORANGE_CLIENT_ID=votre_client_id_copié_depuis_developer_portal
#   ORANGE_CLIENT_SECRET=votre_client_secret
#   ORANGE_MERCHANT_KEY=votre_merchant_key (fourni par Orange)
#   ORANGE_NOTIF_TOKEN=votre_notif_token (fourni après webhook setup)
#   ORANGE_ENV=sandbox  (ou 'production')
# ============================================================

import uuid, requests, logging, base64
from decouple import config

logger = logging.getLogger(__name__)

# ── URL DE BASE CORRECTE POUR ORANGE MONEY CAMEROUN ──────────
ORANGE_BASE_URL     = 'https://api.orange.com'
ORANGE_WEBPAY_URL   = f'{ORANGE_BASE_URL}/orange-money-webpay/CM/v1'
ORANGE_OAUTH_URL    = f'{ORANGE_BASE_URL}/oauth/v3/token'


class OrangeMoneyClient:
    """
    Client CORRIGÉ pour l'API Orange Money WebPay Cameroun.

    FLUX CORRECT :
      1. get_access_token() → OAuth2 avec client_id + client_secret
      2. webpayment()       → Initie la transaction, retourne payment_url
      3. L'utilisateur est redirigé vers payment_url pour valider
      4. Orange appelle notre webhook avec le résultat
    """

    def __init__(self):
        self.client_id     = config('ORANGE_CLIENT_ID',     default='')
        self.client_secret = config('ORANGE_CLIENT_SECRET', default='')
        self.merchant_key  = config('ORANGE_MERCHANT_KEY',  default='')
        self.notif_token   = config('ORANGE_NOTIF_TOKEN',   default='')
        self.env           = config('ORANGE_ENV',           default='sandbox')
        self.callback_url  = (
            config('WEBHOOK_BASE_URL', default='http://localhost:8000')
            + '/api/paiements/webhook/orange/'
        )

    def get_access_token(self):
        """
        OAuth2 Client Credentials — MÉTHODE CORRECTE pour Orange CM.

        IMPORTANT : utilise Basic Auth avec Base64(client_id:client_secret)
        PAS de JSON body, utilise application/x-www-form-urlencoded.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Orange Money : CLIENT_ID ou CLIENT_SECRET manquant dans .env")
            return None

        # Encodage Base64 correct
        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode('utf-8')
        ).decode('utf-8')

        try:
            response = requests.post(
                ORANGE_OAUTH_URL,
                data    = {'grant_type': 'client_credentials'},
                headers = {
                    'Authorization': f'Basic {credentials}',
                    'Content-Type' : 'application/x-www-form-urlencoded',
                    'Accept'       : 'application/json',
                },
                timeout = 15,
            )

            if response.status_code == 200:
                token = response.json().get('access_token')
                logger.info("Orange Money : token obtenu avec succès")
                return token
            else:
                logger.error(
                    f"Orange Money get_token erreur {response.status_code}: "
                    f"{response.text[:200]}"
                )
                # Message d'aide selon le code d'erreur
                if response.status_code == 401:
                    logger.error(
                        "SOLUTION : Vérifiez ORANGE_CLIENT_ID et "
                        "ORANGE_CLIENT_SECRET dans votre .env. "
                        "Ces valeurs se trouvent sur "
                        "https://developer.orange.com/myapps"
                    )
                return None

        except requests.Timeout:
            logger.error("Orange Money : timeout lors de l'obtention du token")
            return None
        except requests.RequestException as e:
            logger.error(f"Orange Money get_token exception: {e}")
            return None

    def initiate_payment(self, montant, telephone, reference_interne):
        """
        Initie un paiement WebPay Orange Money Cameroun.

        ENTRÉE :
          montant           : Decimal (ex: 3500.00)
          telephone         : str (ex: "699000000")
          reference_interne : UUID

        RETOUR :
          dict {
            'succes'     : bool,
            'payment_url': str (URL vers laquelle rediriger l'utilisateur),
            'message'    : str
          }
        """
        token = self.get_access_token()
        if not token:
            return {
                'succes' : False,
                'message': 'Impossible d\'obtenir le token Orange Money. '
                           'Vérifiez vos credentials dans .env'
            }

        # L'order_id doit être unique et alphanumériqu (max 20 chars)
        order_id = str(reference_interne).replace('-', '')[:20]

        payload = {
            'merchant_key' : self.merchant_key,
            'currency'     : 'XAF',
            'order_id'     : order_id,
            'amount'       : int(montant),           # Orange veut un entier
            'return_url'   : self.callback_url,
            'cancel_url'   : self.callback_url + '?cancel=1',
            'notif_url'    : self.callback_url,      # URL webhook
            'lang'         : 'fr',
            'reference'    : str(reference_interne), # Notre référence interne
        }

        try:
            response = requests.post(
                f'{ORANGE_WEBPAY_URL}/webpayment',
                json    = payload,
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Content-Type' : 'application/json',
                    'Accept'       : 'application/json',
                },
                timeout = 20,
            )

            if response.status_code == 200:
                data        = response.json()
                payment_url = data.get('payment_url')
                notif_token = data.get('notif_token', '')

                logger.info(
                    f"Orange Money paiement initié: order_id={order_id}, "
                    f"payment_url={payment_url}"
                )
                return {
                    'succes'     : True,
                    'payment_url': payment_url,
                    'notif_token': notif_token,
                    'message'    : f"Redirigez l'utilisateur vers : {payment_url}",
                }
            else:
                logger.error(
                    f"Orange WebPay erreur {response.status_code}: "
                    f"{response.text[:300]}"
                )
                return {
                    'succes' : False,
                    'message': f"Erreur Orange Money ({response.status_code}). "
                               f"Vérifiez ORANGE_MERCHANT_KEY dans .env"
                }

        except requests.Timeout:
            return {'succes': False, 'message': 'Timeout Orange Money. Réessayez.'}
        except requests.RequestException as e:
            logger.error(f"Orange WebPay exception: {e}")
            return {'succes': False, 'message': 'Erreur réseau Orange Money.'}


# ── GUIDE COMPLET OBTENTION CREDENTIALS ORANGE MONEY CM ──────
"""
ÉTAPES POUR OBTENIR LE TOKEN ORANGE MONEY CAMEROUN :
══════════════════════════════════════════════════════

ÉTAPE 1 : Inscription sur le portail développeur Orange
  URL : https://developer.orange.com/
  → Cliquer "Sign Up" (coin haut droit)
  → Remplir : nom, email, téléphone, pays = Cameroon
  → Confirmer l'email reçu

ÉTAPE 2 : Créer une application
  → Connectez-vous sur https://developer.orange.com/
  → "My Apps" → "Create an App"
  → Nom : BusCam
  → Description : Plateforme de réservation de bus

ÉTAPE 3 : Ajouter l'API Orange Money WebPay CM
  → Dans votre app, cliquez "Add an API"
  → Cherchez : "Orange Money WebPay Cameroun"
  → Cliquez "Subscribe" → choisir "Sandbox" d'abord
  → Copier :
      Client ID     → dans .env : ORANGE_CLIENT_ID=...
      Client Secret → dans .env : ORANGE_CLIENT_SECRET=...

ÉTAPE 4 : Obtenir le Merchant Key
  → Sur le portail, aller dans "API Keys" de votre app
  → Copier la "Merchant Key"
  → Dans .env : ORANGE_MERCHANT_KEY=...

ÉTAPE 5 : Tester en sandbox
  Numéros de test Orange sandbox :
    690000001 → Succès immédiat
    690000002 → Échec
    690000003 → Timeout
  → ORANGE_ENV=sandbox dans .env

ÉTAPE 6 : Passer en production
  → Envoyer un email à : orangemoney_cm@orange.com
  → Objet : "Demande d'accès production WebPay CM"
  → Joindre : RC du commerce + CNI gérant + captures d'écran app
  → Délai : 5 à 10 jours ouvrés

VARIABLES .env FINALES :
  ORANGE_CLIENT_ID=abc123def456
  ORANGE_CLIENT_SECRET=xyz789uvw012
  ORANGE_MERCHANT_KEY=merchant_abc123
  ORANGE_NOTIF_TOKEN=notif_xyz789
  ORANGE_ENV=sandbox
"""


# ════════════════════════════════════════════════════════════
# MTN MOMO (inchangé, fonctionne correctement)
# ════════════════════════════════════════════════════════════
class MTNMoMoClient:
    def __init__(self):
        self.subscription_key = config('MTN_MOMO_SUBSCRIPTION_KEY', default='')
        self.api_user         = config('MTN_MOMO_API_USER', default=str(uuid.uuid4()))
        self.api_key          = config('MTN_MOMO_API_KEY', default='')
        self.env              = config('MTN_MOMO_ENV', default='sandbox')
        self.base_url         = config('MTN_MOMO_BASE_URL', default='https://sandbox.momodeveloper.mtn.com')
        self.callback_url     = config('WEBHOOK_BASE_URL', default='http://localhost:8000') + '/api/paiements/webhook/mtn/'

    def _headers(self):
        return {
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'X-Target-Environment'     : self.env,
            'Content-Type'             : 'application/json',
        }

    def get_access_token(self):
        credentials = base64.b64encode(
            f"{self.api_user}:{self.api_key}".encode()
        ).decode()
        try:
            r = requests.post(
                f"{self.base_url}/collection/token/",
                headers={**self._headers(), 'Authorization': f'Basic {credentials}'},
                timeout=10,
            )
            r.raise_for_status()
            return r.json().get('access_token')
        except requests.RequestException as e:
            logger.error(f"MTN get_token error: {e}")
            return None

    def request_to_pay(self, montant, telephone, reference_interne):
        token = self.get_access_token()
        if not token:
            return {'succes': False, 'message': 'Token MTN MoMo introuvable.'}

        ref = str(reference_interne)
        try:
            r = requests.post(
                f"{self.base_url}/collection/v1_0/requesttopay",
                json={
                    'amount'     : str(int(montant)),
                    'currency'   : 'XAF',
                    'externalId' : ref,
                    'payer'      : {'partyIdType': 'MSISDN', 'partyId': f'237{telephone}'},
                    'payerMessage': 'Paiement BusCam',
                    'payeeNote'  : f'Réservation {ref[:8].upper()}',
                },
                headers={
                    **self._headers(),
                    'Authorization'  : f'Bearer {token}',
                    'X-Reference-Id' : ref,
                    'X-Callback-Url' : self.callback_url,
                },
                timeout=15,
            )
            if r.status_code == 202:
                return {'succes': True, 'reference': ref, 'message': f"SMS envoyé au +237{telephone}"}
            return {'succes': False, 'message': f"Erreur MTN ({r.status_code})"}
        except requests.RequestException as e:
            logger.error(f"MTN request_to_pay error: {e}")
            return {'succes': False, 'message': 'Erreur réseau MTN MoMo.'}

    def get_payment_status(self, reference_interne):
        token = self.get_access_token()
        if not token: return None
        try:
            r = requests.get(
                f"{self.base_url}/collection/v1_0/requesttopay/{reference_interne}",
                headers={**self._headers(), 'Authorization': f'Bearer {token}'},
                timeout=10,
            )
            return r.json().get('status') if r.status_code == 200 else None
        except requests.RequestException:
            return None
