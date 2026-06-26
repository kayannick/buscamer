# ============================================================
#
# RÔLE : Envoi de SMS via Twilio après confirmation de paiement.
#
# TWILIO :
#   Docs    : https://www.twilio.com/docs/sms
#   Gratuit : 15$ de crédit offert à l'inscription (sandbox)
#   Prod    : ~0.08$ par SMS au Cameroun
#   Install : pip install twilio
#
# CONFIGURATION dans backend/.env :
#   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   TWILIO_PHONE_NUMBER=+1234567890  (numéro Twilio)
# ============================================================

from decouple import config
import logging

logger = logging.getLogger(__name__)


def envoyer_sms_confirmation(telephone, numero_billet, trajet, date_depart, siege):
    """
    Envoie un SMS de confirmation de paiement au voyageur.

    ENTRÉE :
      telephone     : str (ex: "699000000")
      numero_billet : str (UUID)
      trajet        : str (ex: "Yaoundé → Douala")
      date_depart   : str (ex: "09/06/2026 à 06h30")
      siege         : int

    RETOUR : bool (True si envoyé, False si erreur)
    """
    account_sid  = config('TWILIO_ACCOUNT_SID',  default='')
    auth_token   = config('TWILIO_AUTH_TOKEN',   default='')
    from_number  = config('TWILIO_PHONE_NUMBER', default='')

    # Si les credentials ne sont pas configurés → log et skip
    if not all([account_sid, auth_token, from_number]):
        logger.warning("SMS non envoyé : credentials Twilio non configurés.")
        return False

    # Formatage du numéro camerounais
    tel_formate = f"+237{telephone.replace(' ', '').replace('+237', '').replace('237', '')}"

    # Message SMS compact (max 160 caractères pour 1 SMS)
    billet_court = str(numero_billet).upper()[:8]
    message = (
        f"✅ BusCam - Paiement confirme!\n"
        f"Billet: {billet_court}\n"
        f"Trajet: {trajet}\n"
        f"Depart: {date_depart}\n"
        f"Siege: N{siege}\n"
        f"Bon voyage!"
    )

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        msg    = client.messages.create(
            body = message,
            from_= from_number,
            to   = tel_formate,
        )
        logger.info(f"SMS envoyé à {tel_formate}: SID={msg.sid}")
        return True

    except ImportError:
        logger.error("Twilio non installé. Faites : pip install twilio")
        return False
    except Exception as e:
        logger.error(f"Erreur envoi SMS à {tel_formate}: {e}")
        return False