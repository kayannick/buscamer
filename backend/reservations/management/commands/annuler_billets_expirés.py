# ============================================================
# backend/reservations/management/commands/annuler_billets_expires.py
#
# RÔLE : Commande Django qui annule automatiquement les billets
#        EN_ATTENTE dont le voyage part dans moins de 5 heures.
#
# UTILISATION :
#   python manage.py annuler_billets_expires
#
# PLANIFICATION WINDOWS (Task Scheduler) :
#   Créer une tâche planifiée qui s'exécute toutes les heures :
#   Programme : C:\projects\buscam\backend\venv\Scripts\python.exe
#   Arguments : manage.py annuler_billets_expires
#   Dossier   : C:\projects\buscam\backend
#
# PLANIFICATION LINUX/RENDER (crontab) :
#   0 * * * * cd /app && python manage.py annuler_billets_expires
#
# INTERACTIONS :
#   → Modifie : reservations.Reservation (statut EN_ATTENTE → ANNULE)
#   → Log chaque annulation dans la console
# ============================================================

from django.core.management.base import BaseCommand
from django.utils                 import timezone
from datetime                     import timedelta
from reservations.models          import Reservation
from voyages.models               import Voyage
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Annule les billets EN_ATTENTE dont le départ est dans moins de 5 heures'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action ='store_true',
            help   ='Simule sans vraiment annuler (pour tester)',
        )
        parser.add_argument(
            '--heures',
            type   =int,
            default=5,
            help   ='Nombre d\'heures avant départ (défaut: 5)',
        )
        
    
    def handle(self, *args, **options):
        maintenant = timezone.now()
        limite_5h  = maintenant + timedelta(hours=5)

        # 1. Annule les réservations EN_ATTENTE expirées
        nb_reservations = Reservation.objects.filter(
            statut_paiement='EN_ATTENTE',
            voyage__date_heure_depart__lte=limite_5h,
        ).update(statut_paiement='ANNULE')

        # 2. PROGRAMME → EN_COURS
        nb_en_cours = Voyage.objects.filter(
            statut='PROGRAMME',
            date_heure_depart__lte=maintenant,
        ).update(statut='EN_COURS')

        # 3. EN_COURS → TERMINE (plus de 12h après le départ)
        limite_termine = maintenant - timedelta(hours=12)
        nb_termines = Voyage.objects.filter(
            statut='EN_COURS',
            date_heure_depart__lte=limite_termine,
        ).update(statut='TERMINE')

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ {nb_reservations} réservation(s) annulée(s) | '
                f'{nb_en_cours} voyage(s) → EN_COURS | '
                f'{nb_termines} voyage(s) → TERMINE'
            )
        )

   
        

    # def handle(self, *args, **options):
    #     dry_run     = options['dry_run']
    #     heures      = options['heures']
    #     maintenant  = timezone.now()
    #     limite      = maintenant + timedelta(hours=heures)

    #     self.stdout.write(
    #         f"\n{'[DRY RUN] ' if dry_run else ''}"
    #         f"Vérification billets expirés — {maintenant.strftime('%d/%m/%Y %H:%M')}"
    #     )
    #     self.stdout.write(
    #         f"Critère : départ avant {limite.strftime('%d/%m/%Y %H:%M')} "
    #         f"({heures}h à partir de maintenant)\n"
    #     )

    #     # ── Recherche des billets à annuler ───────────────────
    #     # Conditions :
    #     #   1. Statut EN_ATTENTE (pas encore payé)
    #     #   2. Voyage encore PROGRAMME (pas encore parti)
    #     #   3. Départ dans moins de {heures} heures
    #     billets_a_annuler = Reservation.objects.filter(
    #         statut_paiement            = Reservation.StatutPaiementChoices.EN_ATTENTE,
    #         voyage__statut             = 'PROGRAMME',
    #         voyage__date_heure_depart__lte = limite,
    #         voyage__date_heure_depart__gte = maintenant,  # Pas encore parti
    #     ).select_related('voyage', 'voyage__agence', 'utilisateur')

    #     nb_total = billets_a_annuler.count()

    #     if nb_total == 0:
    #         self.stdout.write(
    #             self.style.SUCCESS('✅ Aucun billet à annuler.')
    #         )
    #         return

    #     self.stdout.write(
    #         self.style.WARNING(f'⚠️  {nb_total} billet(s) à annuler :')
    #     )

    #     nb_annules = 0
    #     for reservation in billets_a_annuler:
    #         voyage = reservation.voyage
    #         infos  = (
    #             f"  → Billet {str(reservation.numero_billet)[:8].upper()} | "
    #             f"{voyage.get_ville_depart_display()} → {voyage.get_ville_arrivee_display()} | "
    #             f"Départ : {voyage.date_heure_depart.strftime('%d/%m %H:%M')} | "
    #             f"Voyageur : {reservation.utilisateur.get_full_name() or reservation.utilisateur.username}"
    #         )
    #         self.stdout.write(infos)

    #         if not dry_run:
    #             reservation.statut_paiement = Reservation.StatutPaiementChoices.ANNULE
    #             reservation.save(update_fields=['statut_paiement'])

    #             # Log dans le système
    #             logger.info(
    #                 f"Billet annulé automatiquement : {reservation.numero_billet} | "
    #                 f"Voyage #{voyage.id} | "
    #                 f"Utilisateur : {reservation.utilisateur.username}"
    #             )

    #             nb_annules += 1

    #     if dry_run:
    #         self.stdout.write(
    #             self.style.WARNING(
    #                 f'\n[DRY RUN] {nb_total} billet(s) AURAIENT été annulés. '
    #                 f'Relancez sans --dry-run pour annuler réellement.'
    #             )
    #         )
    #     else:
    #         self.stdout.write(
    #             self.style.SUCCESS(
    #                 f'\n✅ {nb_annules}/{nb_total} billet(s) annulé(s) avec succès.'
    #             )
    #         )