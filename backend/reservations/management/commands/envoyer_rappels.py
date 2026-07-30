# ============================================================
# backend/reservations/management/commands/envoyer_rappels.py
#
# RÔLE : Envoie des rappels SMS 6h avant l'annulation auto.
#
# PLANIFICATION :
#   Toutes les heures via crontab ou Task Scheduler Windows :
#   0 * * * * cd /app && python manage.py envoyer_rappels
# ============================================================

from django.core.management.base import BaseCommand
from django.utils                 import timezone
from datetime                     import timedelta
from reservations.models          import Reservation
from paiements.notifications      import notification_service
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Envoie rappels SMS aux voyageurs avec paiement en attente'

    def handle(self, *args, **options):
        maintenant = timezone.now()

        # Réservations EN_ATTENTE dont le départ est entre 5h et 11h
        # (envoie rappel 6h avant l'annulation auto à 5h)
        debut = maintenant + timedelta(hours=5)
        fin   = maintenant + timedelta(hours=11)

        reservations_a_rappeler = Reservation.objects.filter(
            statut_paiement                = 'EN_ATTENTE',
            voyage__date_heure_depart__gte = debut,
            voyage__date_heure_depart__lte = fin,
        ).select_related('voyage', 'utilisateur')

        nb_envoyes = 0

        for reservation in reservations_a_rappeler:
            voyage    = reservation.voyage
            utilisateur = reservation.utilisateur

            # Calcule les heures restantes
            heures = (voyage.date_heure_depart - maintenant).total_seconds() / 3600
            heures_avant_annulation = round(heures - 5, 1)

            if heures_avant_annulation < 0:
                continue

            try:
                resultat = notification_service.envoyer_rappel_paiement(
                    telephone        = utilisateur.telephone,
                    nom              = utilisateur.get_full_name() or utilisateur.username,
                    numero_billet    = str(reservation.numero_billet),
                    trajet           = f"{voyage.get_ville_depart_display()} → {voyage.get_ville_arrivee_display()}",
                    date_depart      = voyage.date_heure_depart.strftime('%d/%m/%Y a %Hh%M'),
                    heures_restantes = heures_avant_annulation,
                )

                if resultat.get('succes'):
                    nb_envoyes += 1
                    self.stdout.write(f"  → Rappel envoyé à {utilisateur.telephone}")

            except Exception as e:
                logger.error(f"Erreur rappel réservation #{reservation.id}: {e}")

        self.stdout.write(
            self.style.SUCCESS(f'✅ {nb_envoyes} rappel(s) envoyé(s)')
        )