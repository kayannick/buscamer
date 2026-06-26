# ============================================================
#
# RÔLE : Intégration réelle MTN MoMo et Orange Money Cameroun.
#
# MTN MOMO :
#   Docs    : https://developer.mtn.com/products/momo-api
#   Sandbox : GRATUITE (inscription requise)
#   Prod    : 0.75% par transaction (minimum 50 FCFA)
#   Headers : X-Reference-Id, X-Target-Environment, Ocp-Apim-Subscription-Key
#
# ORANGE MONEY :
#   Docs    : https://developer.orange.com/apis/om-webpay-cm
#   Sandbox : GRATUITE (inscription requise)
#   Prod    : 1% par transaction
#   Auth    : OAuth2 (client_credentials)
#
# CONFIGURATION REQUISE dans backend/.env :
#   MTN_MOMO_SUBSCRIPTION_KEY=...
#   MTN_MOMO_API_USER=...        (UUID généré par vous)
#   MTN_MOMO_API_KEY=...         (généré par l'API MTN)
#   MTN_MOMO_ENV=sandbox
#   MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
#   ORANGE_CLIENT_ID=...
#   ORANGE_CLIENT_SECRET=...
#   ORANGE_BASE_URL=https://api.orange.com
#   WEBHOOK_BASE_URL=https://buscam-backend.onrender.com
# ============================================================

import uuid
import requests
import logging
from decouple import config

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════
# MTN MOBILE MONEY
# ════════════════════════════════════════════════════════════

class MTNMoMoClient:
    """
    Client pour l'API MTN MoMo Collection (paiement entrant).

    FLUX SANDBOX :
      1. create_api_user()   → crée un utilisateur API
      2. create_api_key()    → génère une clé API
      3. get_access_token()  → obtient un token Bearer
      4. request_to_pay()    → initie la demande de paiement
      5. get_payment_status()→ vérifie le statut

    FLUX PRODUCTION :
      Même flux, mais MTN_MOMO_API_USER et MTN_MOMO_API_KEY
      sont fournis par le portail MTN Developer.
    """

    def __init__(self):
        self.subscription_key = config('MTN_MOMO_SUBSCRIPTION_KEY', default='')
        self.api_user         = config('MTN_MOMO_API_USER', default=str(uuid.uuid4()))
        self.api_key          = config('MTN_MOMO_API_KEY', default='')
        self.env              = config('MTN_MOMO_ENV', default='sandbox')
        self.base_url         = config('MTN_MOMO_BASE_URL', default='https://sandbox.momodeveloper.mtn.com')
        self.callback_url     = config('WEBHOOK_BASE_URL', default='http://localhost:8000') + '/api/paiements/webhook/mtn/'

    def _headers_de_base(self):
        """Headers communs à toutes les requêtes MTN."""
        return {
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'X-Target-Environment'     : self.env,
            'Content-Type'             : 'application/json',
        }

    def get_access_token(self):
        """
        Obtient un token Bearer pour les appels API MTN.

        RETOUR : str (token) ou None en cas d'erreur
        """
        import base64
        credentials = base64.b64encode(
            f"{self.api_user}:{self.api_key}".encode()
        ).decode()

        try:
            response = requests.post(
                f"{self.base_url}/collection/token/",
                headers={
                    **self._headers_de_base(),
                    'Authorization': f'Basic {credentials}',
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json().get('access_token')
        except requests.RequestException as e:
            logger.error(f"MTN MoMo get_access_token error: {e}")
            return None

    def request_to_pay(self, montant, telephone, reference_interne):
        """
        Initie une demande de paiement MTN MoMo.

        ENTRÉE :
          montant           : Decimal (ex: 3500.00)
          telephone         : str (ex: "699000000")
          reference_interne : UUID (notre référence unique)

        RETOUR :
          dict { 'succes': bool, 'reference': str, 'message': str }
        """
        token = self.get_access_token()
        if not token:
            return {'succes': False, 'message': 'Impossible d\'obtenir le token MTN.'}

        # X-Reference-Id = identifiant unique de la transaction
        # (doit être un UUID, on utilise notre reference_interne)
        reference_str = str(reference_interne)

        payload = {
            "amount"     : str(int(montant)),   # MTN veut un entier en string
            "currency"   : "XAF",               # Franc CFA BEAC
            "externalId" : reference_str,
            "payer"      : {
                "partyIdType": "MSISDN",
                "partyId"    : f"237{telephone}",  # Ajoute l'indicatif
            },
            "payerMessage": "Paiement BusCam — Billet de bus",
            "payeeNote"   : f"Réservation {reference_str[:8].upper()}",
        }

        try:
            response = requests.post(
                f"{self.base_url}/collection/v1_0/requesttopay",
                json=payload,
                headers={
                    **self._headers_de_base(),
                    'Authorization'   : f'Bearer {token}',
                    'X-Reference-Id'  : reference_str,
                    'X-Callback-Url'  : self.callback_url,
                },
                timeout=15,
            )

            # 202 Accepted = demande reçue (pas encore confirmée)
            if response.status_code == 202:
                logger.info(f"MTN MoMo request_to_pay accepté: {reference_str}")
                return {
                    'succes'   : True,
                    'reference': reference_str,
                    'message'  : f"SMS envoyé au +237 {telephone}. Tapez votre PIN MoMo.",
                }
            else:
                logger.error(f"MTN MoMo error {response.status_code}: {response.text}")
                return {'succes': False, 'message': f"Erreur MTN ({response.status_code})."}

        except requests.RequestException as e:
            logger.error(f"MTN MoMo request_to_pay exception: {e}")
            return {'succes': False, 'message': 'Erreur de connexion à MTN MoMo.'}

    def get_payment_status(self, reference_interne):
        """
        Vérifie le statut d'une transaction MTN MoMo.

        RETOUR : 'SUCCESSFUL' | 'FAILED' | 'PENDING' | None
        """
        token = self.get_access_token()
        if not token:
            return None

        try:
            response = requests.get(
                f"{self.base_url}/collection/v1_0/requesttopay/{reference_interne}",
                headers={
                    **self._headers_de_base(),
                    'Authorization': f'Bearer {token}',
                },
                timeout=10,
            )
            if response.status_code == 200:
                return response.json().get('status')
            return None
        except requests.RequestException as e:
            logger.error(f"MTN get_payment_status error: {e}")
            return None


# ════════════════════════════════════════════════════════════
# ORANGE MONEY
# ════════════════════════════════════════════════════════════

class OrangeMoneyClient:
    """
    Client pour l'API Orange Money Web Pay Cameroun.

    FLUX :
      1. get_access_token()  → OAuth2 client_credentials
      2. initiate_payment()  → initie la transaction
      3. Webhook reçu        → confirmation par Orange
    """

    def __init__(self):
        self.client_id     = config('ORANGE_CLIENT_ID',     default='')
        self.client_secret = config('ORANGE_CLIENT_SECRET', default='')
        self.base_url      = config('ORANGE_BASE_URL',      default='https://api.orange.com')
        self.callback_url  = config('WEBHOOK_BASE_URL',     default='http://localhost:8000') + '/api/paiements/webhook/orange/'
        self.merchant_key  = config('ORANGE_MERCHANT_KEY',  default='')

    def get_access_token(self):
        """
        OAuth2 Client Credentials pour Orange Money.

        RETOUR : str (token) ou None
        """
        import base64
        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        try:
            response = requests.post(
                f"{self.base_url}/oauth/v3/token",
                data={'grant_type': 'client_credentials'},
                headers={
                    'Authorization': f'Basic {credentials}',
                    'Content-Type' : 'application/x-www-form-urlencoded',
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json().get('access_token')
        except requests.RequestException as e:
            logger.error(f"Orange Money get_access_token error: {e}")
            return None

    def initiate_payment(self, montant, telephone, reference_interne):
        """
        Initie un paiement Orange Money WebPay.

        RETOUR :
          dict { 'succes': bool, 'payment_url': str, 'message': str }
        """
        token = self.get_access_token()
        if not token:
            return {'succes': False, 'message': 'Impossible d\'obtenir le token Orange.'}

        payload = {
            "merchant_key" : self.merchant_key,
            "currency"     : "XAF",
            "order_id"     : str(reference_interne)[:16],  # Max 16 chars
            "amount"       : int(montant),
            "return_url"   : self.callback_url,
            "cancel_url"   : self.callback_url + '?cancel=1',
            "notif_url"    : self.callback_url,
            "lang"         : "fr",
            "reference"    : str(reference_interne),
        }

        try:
            response = requests.post(
                f"{self.base_url}/orange-money-webpay/CM/v1/webpayment",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type' : 'application/json',
                },
                timeout=15,
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    'succes'     : True,
                    'payment_url': data.get('payment_url', ''),
                    'notif_token': data.get('notif_token', ''),
                    'message'    : f"Redirigez l'utilisateur vers : {data.get('payment_url')}",
                }
            else:
                logger.error(f"Orange Money error {response.status_code}: {response.text}")
                return {'succes': False, 'message': f"Erreur Orange ({response.status_code})."}

        except requests.RequestException as e:
            logger.error(f"Orange Money initiate_payment exception: {e}")
            return {'succes': False, 'message': 'Erreur de connexion à Orange Money.'}