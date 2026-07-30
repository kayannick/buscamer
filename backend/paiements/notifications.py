# ============================================================
# backend/paiements/notifications.py
#
# RÔLE : Service centralisé pour tous les envois de messages.
#        SMS via Africa's Talking (principal) + Twilio (fallback)
#        WhatsApp via Meta Business API
#
# PATTERN UTILISÉ : Stratégie avec fallback
#   → Essaie Africa's Talking d'abord
#   → Si échec → essaie Twilio
#   → Toujours log le résultat
#
# RÉUTILISABLE DANS D'AUTRES PROJETS :
#   Changez juste les templates de messages
#   et le reste fonctionne pareil
# ============================================================

import logging
from decouple import config

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════
# TEMPLATES DE MESSAGES
# Centralisés ici pour facile modification future
# ════════════════════════════════════════════════════════════

def template_confirmation_paiement(nom, numero_billet, trajet, date_depart, siege, montant):
    """
    Template SMS de confirmation de paiement.

    POURQUOI SÉPARER LES TEMPLATES :
      - Facile à modifier sans toucher la logique
      - Facile à tester
      - Peut être stocké en BDD pour personnalisation admin
    """
    billet_court = str(numero_billet)[:8].upper()
    return (
        f"✅ BusCam - Paiement confirme!\n"
        f"Billet: {billet_court}\n"
        f"Trajet: {trajet}\n"
        f"Depart: {date_depart}\n"
        f"Siege: N{siege}\n"
        f"Montant: {montant} FCFA\n"
        f"Bon voyage, {nom}!"
    )


def template_confirmation_especes(nom, numero_billet, trajet, date_depart, siege, montant):
    """Template spécifique pour paiement en espèces."""
    billet_court = str(numero_billet)[:8].upper()
    return (
        f"✅ BusCam - Billet confirme (especes)!\n"
        f"Billet: {billet_court}\n"
        f"Trajet: {trajet}\n"
        f"Depart: {date_depart}\n"
        f"Siege: N{siege}\n"
        f"Montant: {montant} FCFA\n"
        f"Presentez ce billet a l'agent.\n"
        f"Bon voyage, {nom}!"
    )


def template_rappel_paiement(nom, numero_billet, trajet, date_depart, heures_restantes):
    """Rappel si paiement en attente."""
    billet_court = str(numero_billet)[:8].upper()
    return (
        f"⚠️ BusCam - Rappel paiement!\n"
        f"Billet: {billet_court}\n"
        f"Trajet: {trajet} - {date_depart}\n"
        f"Il vous reste {heures_restantes}h pour payer.\n"
        f"Apres ce delai, votre reservation sera annulee."
    )


def template_annulation(nom, trajet, date_depart):
    """Notification d'annulation."""
    return (
        f"❌ BusCam - Reservation annulee.\n"
        f"Trajet: {trajet} - {date_depart}\n"
        f"Votre reservation a ete annulee.\n"
        f"Contactez-nous: support@buscam.cm"
    )


# ════════════════════════════════════════════════════════════
# SERVICE AFRICA'S TALKING (SMS principal)
# ════════════════════════════════════════════════════════════

class AfricasTalkingSMS:
    """
    Service SMS via Africa's Talking.

    POURQUOI AFRICA'S TALKING :
      - Conçu pour l'Afrique (meilleure livraison au Cameroun)
      - Prix compétitif (~15-20 FCFA/SMS)
      - API simple et bien documentée
      - Support local
    """

    def __init__(self):
        self.username  = config('AT_USERNAME',  default='sandbox')
        self.api_key   = config('AT_API_KEY',   default='')
        self.sender_id = config('AT_SENDER_ID', default='BusCam')
        self.env       = config('AT_ENV',       default='sandbox')
        self._client   = None

    def _get_client(self):
        """
        Initialise le client Africa's Talking.
        Lazy initialization : ne crée le client qu'à la première utilisation.
        """
        if self._client is None:
            try:
                import africastalking
                africastalking.initialize(self.username, self.api_key)
                self._client = africastalking.SMS
            except ImportError:
                logger.error("Africa's Talking non installé. pip install africastalking")
                return None
        return self._client

    def formater_numero(self, telephone):
        """
        Formate le numéro au format international.

        EXEMPLES :
          "699000000" → "+237699000000"
          "237699000000" → "+237699000000"
          "+237699000000" → "+237699000000"
        """
        # Nettoie le numéro
        tel = telephone.strip().replace(' ', '').replace('-', '')

        # Retire les préfixes existants
        if tel.startswith('+237'):
            return tel
        if tel.startswith('237'):
            return f'+{tel}'
        # Assume numéro camerounais si 9 chiffres
        if len(tel) == 9:
            return f'+237{tel}'

        return f'+{tel}'

    def envoyer(self, telephone, message):
        """
        Envoie un SMS.

        RETOUR : { succes: bool, message_id: str, erreur: str }
        """
        client = self._get_client()
        if not client:
            return {'succes': False, 'erreur': "Client AT non initialisé"}

        numero_formate = self.formater_numero(telephone)

        try:
            reponse = client.send(
                message    = message,
                recipients = [numero_formate],
                sender_id  = self.sender_id,
            )

            # Africa's Talking retourne une liste de résultats
            recipients = reponse.get('SMSMessageData', {}).get('Recipients', [])

            if recipients and recipients[0].get('status') == 'Success':
                message_id = recipients[0].get('messageId', '')
                logger.info(f"SMS AT envoyé à {numero_formate} | ID: {message_id}")
                return {
                    'succes'     : True,
                    'message_id' : message_id,
                    'provider'   : 'africas_talking',
                }
            else:
                erreur = recipients[0].get('status', 'Erreur inconnue') if recipients else 'Aucun destinataire'
                logger.error(f"SMS AT échec pour {numero_formate}: {erreur}")
                return {'succes': False, 'erreur': erreur}

        except Exception as e:
            logger.error(f"Exception SMS AT {numero_formate}: {e}")
            return {'succes': False, 'erreur': str(e)}


# ════════════════════════════════════════════════════════════
# SERVICE TWILIO (SMS fallback)
# ════════════════════════════════════════════════════════════

class TwilioSMS:
    """
    Service SMS via Twilio.
    Utilisé comme fallback si Africa's Talking échoue.

    PATTERN FALLBACK :
      Si le service principal échoue, on essaie le service
      de secours automatiquement. L'utilisateur ne voit pas
      la différence.
    """

    def __init__(self):
        self.account_sid   = config('TWILIO_ACCOUNT_SID',  default='')
        self.auth_token    = config('TWILIO_AUTH_TOKEN',   default='')
        self.phone_number  = config('TWILIO_PHONE_NUMBER', default='')

    def formater_numero(self, telephone):
        """Même logique que AfricasTalkingSMS."""
        tel = telephone.strip().replace(' ', '').replace('-', '')
        if tel.startswith('+237'): return tel
        if tel.startswith('237'):  return f'+{tel}'
        if len(tel) == 9:          return f'+237{tel}'
        return f'+{tel}'

    def envoyer(self, telephone, message):
        """Envoie un SMS via Twilio."""
        if not all([self.account_sid, self.auth_token, self.phone_number]):
            return {'succes': False, 'erreur': 'Credentials Twilio manquants'}

        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)

            msg = client.messages.create(
                body = message,
                from_= self.phone_number,
                to   = self.formater_numero(telephone),
            )

            logger.info(f"SMS Twilio envoyé à {telephone} | SID: {msg.sid}")
            return {
                'succes'     : True,
                'message_id' : msg.sid,
                'provider'   : 'twilio',
            }

        except ImportError:
            return {'succes': False, 'erreur': 'Twilio non installé. pip install twilio'}
        except Exception as e:
            logger.error(f"Exception SMS Twilio {telephone}: {e}")
            return {'succes': False, 'erreur': str(e)}


# ════════════════════════════════════════════════════════════
# SERVICE WHATSAPP BUSINESS API
# ════════════════════════════════════════════════════════════

class WhatsAppBusiness:
    """
    Service WhatsApp via Meta Business API.

    AVANTAGES WHATSAPP :
      - Messages plus riches (images, boutons, listes)
      - Lecture confirmée (double coche bleue)
      - Gratuit pour l'utilisateur
      - Très utilisé au Cameroun

    PRÉREQUIS :
      - Compte Meta Business vérifié
      - Numéro WhatsApp Business actif
      - Templates de messages approuvés par Meta
        (obligatoire pour les messages initiaux)
    """

    def __init__(self):
        self.token           = config('WHATSAPP_TOKEN',           default='')
        self.phone_number_id = config('WHATSAPP_PHONE_NUMBER_ID', default='')
        self.base_url        = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"

    def formater_numero(self, telephone):
        """Format WhatsApp : sans le + (ex: 237699000000)."""
        tel = telephone.strip().replace(' ', '').replace('-', '').replace('+', '')
        if tel.startswith('237'):
            return tel
        if len(tel) == 9:
            return f'237{tel}'
        return tel

    def envoyer_texte(self, telephone, message):
        """
        Envoie un message texte WhatsApp.

        NOTE : Fonctionne seulement si l'utilisateur a déjà
        contacté votre numéro Business dans les 24h (fenêtre de service).
        Pour les premiers messages → utiliser send_template().
        """
        if not self.token or not self.phone_number_id:
            return {'succes': False, 'erreur': 'Credentials WhatsApp manquants'}

        import requests

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type"   : "individual",
            "to"               : self.formater_numero(telephone),
            "type"             : "text",
            "text"             : {"preview_url": False, "body": message}
        }

        try:
            reponse = requests.post(
                self.base_url,
                headers = {
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type' : 'application/json',
                },
                json    = payload,
                timeout = 15,
            )

            data = reponse.json()

            if reponse.status_code == 200 and 'messages' in data:
                msg_id = data['messages'][0]['id']
                logger.info(f"WhatsApp envoyé à {telephone} | ID: {msg_id}")
                return {
                    'succes'     : True,
                    'message_id' : msg_id,
                    'provider'   : 'whatsapp',
                }
            else:
                erreur = data.get('error', {}).get('message', 'Erreur WhatsApp')
                logger.error(f"WhatsApp échec {telephone}: {erreur}")
                return {'succes': False, 'erreur': erreur}

        except Exception as e:
            logger.error(f"Exception WhatsApp {telephone}: {e}")
            return {'succes': False, 'erreur': str(e)}

    def envoyer_template(self, telephone, nom_template, parametres):
        """
        Envoie un message via un template approuvé par Meta.

        POURQUOI LES TEMPLATES :
          Meta exige que les premiers messages (hors fenêtre 24h)
          utilisent des templates pré-approuvés.
          Le template "confirmation_paiement" doit être créé
          et approuvé dans votre compte Meta Business Manager.

        PARAMÈTRES :
          nom_template = "confirmation_paiement" (créé dans Meta)
          parametres   = ["Jean", "ABCD1234", "Yaoundé → Douala"]
        """
        if not self.token or not self.phone_number_id:
            return {'succes': False, 'erreur': 'Credentials WhatsApp manquants'}

        import requests

        # Construit les composants du template
        components = []
        if parametres:
            components.append({
                "type"      : "body",
                "parameters": [{"type": "text", "text": str(p)} for p in parametres],
            })

        payload = {
            "messaging_product": "whatsapp",
            "to"               : self.formater_numero(telephone),
            "type"             : "template",
            "template"         : {
                "name"      : nom_template,
                "language"  : {"code": "fr"},
                "components": components,
            }
        }

        try:
            reponse = requests.post(
                self.base_url,
                headers = {
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type' : 'application/json',
                },
                json    = payload,
                timeout = 15,
            )

            data = reponse.json()

            if reponse.status_code == 200:
                msg_id = data.get('messages', [{}])[0].get('id', '')
                logger.info(f"WhatsApp template '{nom_template}' → {telephone} | ID: {msg_id}")
                return {'succes': True, 'message_id': msg_id, 'provider': 'whatsapp_template'}
            else:
                erreur = data.get('error', {}).get('message', 'Erreur template')
                logger.error(f"WhatsApp template échec: {erreur}")
                return {'succes': False, 'erreur': erreur}

        except Exception as e:
            logger.error(f"Exception WhatsApp template: {e}")
            return {'succes': False, 'erreur': str(e)}


# ════════════════════════════════════════════════════════════
# SERVICE ORCHESTRATEUR (le chef d'orchestre)
# ════════════════════════════════════════════════════════════

class NotificationService:
    """
    Service principal qui orchestre tous les envois.

    PATTERN ORCHESTRATEUR :
      Au lieu d'appeler directement Twilio ou AT depuis les views,
      on passe toujours par ce service.
      Avantage : changer de provider = changer 1 seule classe.

    STRATÉGIE DE FALLBACK :
      1. Essaie Africa's Talking (SMS principal)
      2. Si échoue → essaie Twilio (SMS fallback)
      3. En parallèle : essaie WhatsApp si token disponible
      4. Log tout pour suivi

    RÉUTILISABLE :
      Dans n'importe quel projet → instanciez NotificationService
      et appelez envoyer_confirmation() avec vos données.
    """

    def __init__(self):
        self.at_sms       = AfricasTalkingSMS()
        self.twilio_sms   = TwilioSMS()
        self.whatsapp     = WhatsAppBusiness()

    def _envoyer_sms_avec_fallback(self, telephone, message):
        """
        Envoie SMS avec fallback automatique.

        LOGIQUE :
          1. Essaie Africa's Talking
          2. Si échec → essaie Twilio
          3. Retourne le premier succès
        """
        # Essai 1 : Africa's Talking
        resultat = self.at_sms.envoyer(telephone, message)
        if resultat['succes']:
            return resultat

        logger.warning(f"AT échoué pour {telephone}, tentative Twilio...")

        # Essai 2 : Twilio (fallback)
        resultat_twilio = self.twilio_sms.envoyer(telephone, message)
        if resultat_twilio['succes']:
            return resultat_twilio

        # Tout a échoué
        logger.error(f"TOUS les SMS ont échoué pour {telephone}")
        return {
            'succes' : False,
            'erreur' : f"AT: {resultat.get('erreur')} | Twilio: {resultat_twilio.get('erreur')}",
        }

    def envoyer_confirmation_paiement_mobile(
        self, telephone, nom, numero_billet,
        trajet, date_depart, siege, montant
    ):
        """
        Envoi de confirmation après paiement Mobile Money.
        Envoie SMS + WhatsApp en parallèle.

        ENTRÉE :
          telephone     : "699000000"
          nom           : "Jean Dupont"
          numero_billet : UUID
          trajet        : "Yaoundé → Douala"
          date_depart   : "09/06/2026 à 06h30"
          siege         : 5
          montant       : 3500

        RETOUR :
          { sms: {succes, provider}, whatsapp: {succes, provider} }
        """
        message = template_confirmation_paiement(
            nom, numero_billet, trajet, date_depart, siege, montant
        )

        # Envoi SMS (avec fallback)
        sms_result = self._envoyer_sms_avec_fallback(telephone, message)

        # Envoi WhatsApp (en parallèle, non bloquant si échoue)
        wa_result = {'succes': False, 'erreur': 'WhatsApp non configuré'}
        if self.whatsapp.token:
            # Essaie d'abord le template (plus fiable)
            wa_result = self.whatsapp.envoyer_template(
                telephone    = telephone,
                nom_template = 'confirmation_paiement_buscam',
                parametres   = [nom, str(numero_billet)[:8].upper(), trajet, date_depart, str(siege), f"{montant} FCFA"],
            )
            # Si template échoue (pas approuvé) → texte simple
            if not wa_result['succes']:
                wa_result = self.whatsapp.envoyer_texte(telephone, message)

        return {
            'sms'      : sms_result,
            'whatsapp' : wa_result,
        }

    def envoyer_confirmation_especes(
        self, telephone, nom, numero_billet,
        trajet, date_depart, siege, montant
    ):
        """Confirmation de paiement en espèces (validé par l'agent)."""
        message = template_confirmation_especes(
            nom, numero_billet, trajet, date_depart, siege, montant
        )

        sms_result = self._envoyer_sms_avec_fallback(telephone, message)
        wa_result  = {'succes': False}

        if self.whatsapp.token:
            wa_result = self.whatsapp.envoyer_texte(telephone, message)

        return {'sms': sms_result, 'whatsapp': wa_result}

    def envoyer_rappel_paiement(
        self, telephone, nom, numero_billet,
        trajet, date_depart, heures_restantes
    ):
        """Rappel avant annulation automatique (5h avant départ)."""
        message = template_rappel_paiement(
            nom, numero_billet, trajet, date_depart, heures_restantes
        )
        return self._envoyer_sms_avec_fallback(telephone, message)

    def envoyer_annulation(self, telephone, nom, trajet, date_depart):
        """Notification d'annulation de réservation."""
        message = template_annulation(nom, trajet, date_depart)
        return self._envoyer_sms_avec_fallback(telephone, message)


# ── Instance globale (singleton) ──────────────────────────────
# Importez cet objet dans vos views pour envoyer des notifications
notification_service = NotificationService()