# ============================================================
# backend/paiements/admin.py
#
# RÔLE : Enregistre le modèle Paiement dans l'interface
#        d'administration Django (/admin).
#
# POURQUOI L'ADMIN EST IMPORTANT POUR LES PAIEMENTS ?
#   - Voir en temps réel les transactions EN_ATTENTE, CONFIRMÉES, ÉCHOUÉES
#   - Déclencher manuellement un remboursement
#   - Vérifier les références opérateurs (MTN, Orange)
#   - Réconcilier les paiements en cas de litige
#   - Filtrer par méthode, statut, date
#
# INTERACTIONS :
#   ← Lit : paiements/models.py (Paiement)
#   ← Lié à : reservations/models.py (Reservation via FK)
#   → Accessible via : http://localhost:8000/admin/paiements/paiement/
# ============================================================

from django.contrib import admin
from django.utils    import timezone
from .models         import Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    """
    Interface d'administration pour le modèle Paiement.

    FONCTIONNALITÉS :
      - Liste paginée avec colonnes clés
      - Filtres latéraux (statut, méthode, date)
      - Barre de recherche (référence, téléphone, réservation)
      - Actions groupées (confirmer, marquer échoué)
      - Vue détaillée avec champs en lecture seule
      - Champs calculés colorés (statut visuel)
    """

    # ── Colonnes affichées dans la liste ─────────────────────
    # Chaque élément correspond à un champ du modèle
    # ou à une méthode définie ci-dessous (prefixée par get_)
    list_display = [
        'reference_courte',       # UUID tronqué (plus lisible)
        'get_reservation_info',   # Trajet + voyageur
        'methode',
        'telephone_paiement',
        'montant',
        'get_statut_colore',      # Statut avec couleur
        'date_initiation',
        'date_confirmation',
    ]

    # ── Filtres dans la barre latérale droite ─────────────────
    list_filter = [
        'statut',
        'methode',
        'date_initiation',
    ]

    # ── Champs interrogeables par la barre de recherche ───────
    search_fields = [
        'reference_interne',         # UUID complet
        'reference_operateur',       # Référence MTN/Orange
        'telephone_paiement',
        'reservation__id',           # ID de la réservation liée
        'reservation__utilisateur__username',
        'reservation__utilisateur__telephone',
    ]

    # ── Tri par défaut : plus récents en premier ───────────────
    ordering = ['-date_initiation']

    # ── Pagination ─────────────────────────────────────────────
    list_per_page = 25

    # ── Champs NON modifiables dans le formulaire de détail ───
    # Ces champs sont générés automatiquement et ne doivent
    # jamais être modifiés manuellement
    readonly_fields = [
        'reference_interne',
        'date_initiation',
        'date_confirmation',
        'get_reservation_detail',
        'get_statut_colore',
    ]

    # ── Organisation du formulaire de détail en sections ──────
    # fieldsets = regroupement visuel des champs par catégorie
    fieldsets = (

        # Section 1 : Informations de la transaction
        ('💳 Transaction', {
            'fields': (
                'reference_interne',
                'reference_operateur',
                'get_statut_colore',
                'statut',
            ),
        }),

        # Section 2 : Détails financiers
        ('💰 Détails financiers', {
            'fields': (
                'reservation',
                'get_reservation_detail',
                'methode',
                'telephone_paiement',
                'montant',
            ),
        }),

        # Section 3 : Dates (lecture seule)
        ('📅 Dates', {
            'fields': (
                'date_initiation',
                'date_confirmation',
            ),
            # 'classes': ('collapse',) ← décommenter pour replier la section
        }),
    )

    # ── Actions groupées ───────────────────────────────────────
    # Ces actions apparaissent dans le menu déroulant "Action"
    # quand on sélectionne plusieurs paiements dans la liste
    actions = [
        'action_confirmer_paiements',
        'action_marquer_echoue',
        'action_rembourser',
    ]

    # ══════════════════════════════════════════════════════════
    # MÉTHODES D'AFFICHAGE PERSONNALISÉES
    # Ces méthodes génèrent des colonnes calculées dans la liste
    # ══════════════════════════════════════════════════════════

    def reference_courte(self, obj):
        """
        Affiche les 8 premiers caractères de l'UUID
        pour ne pas surcharger la liste.

        ENTRÉE  : obj = instance Paiement
        SORTIE  : chaîne de caractères (ex: "a1b2c3d4...")
        """
        return str(obj.reference_interne)[:8].upper() + '...'

    # Titre de la colonne dans l'admin
    reference_courte.short_description = 'Référence'

    # ──────────────────────────────────────────────────────────

    def get_reservation_info(self, obj):
        """
        Affiche les infos clés de la réservation liée :
        trajet + nom du voyageur.

        ENTRÉE  : obj = instance Paiement
        SORTIE  : chaîne "Yaoundé → Douala | Jean Paul"
        """
        try:
            r = obj.reservation
            voyage = r.voyage
            utilisateur = r.utilisateur
            return (
                f"{voyage.get_ville_depart_display()} → "
                f"{voyage.get_ville_arrivee_display()} | "
                f"{utilisateur.get_full_name() or utilisateur.username}"
            )
        except Exception:
            return '—'

    get_reservation_info.short_description = 'Réservation'

    # ──────────────────────────────────────────────────────────

    def get_statut_colore(self, obj):
        """
        Affiche le statut avec une couleur selon sa valeur.
        Utilise allow_tags=True (via mark_safe) pour injecter du HTML.

        ENTRÉE  : obj = instance Paiement
        SORTIE  : HTML avec badge coloré
        """
        from django.utils.html import format_html

        # Associe chaque statut à une couleur de fond et de texte
        COULEURS = {
            'EN_ATTENTE': ('#FFF3CD', '#856404', '⏳'),
            'CONFIRME'  : ('#D1FAE5', '#065F46', '✅'),
            'ECHOUE'    : ('#FEE2E2', '#991B1B', '❌'),
            'REMBOURSE' : ('#EDE9FE', '#5B21B6', '↩️'),
        }

        bg, color, icone = COULEURS.get(
            obj.statut,
            ('#F3F4F6', '#374151', '❓')
        )

        return format_html(
            '<span style="'
            'background: {}; color: {}; '
            'padding: 3px 8px; border-radius: 12px; '
            'font-size: 11px; font-weight: 600; '
            'white-space: nowrap;">'
            '{} {}'
            '</span>',
            bg, color, icone, obj.get_statut_display()
        )

    get_statut_colore.short_description = 'Statut'

    # ──────────────────────────────────────────────────────────

    def get_reservation_detail(self, obj):
        """
        Affiche les détails complets de la réservation liée.
        Affiché dans la vue de détail (pas dans la liste).

        ENTRÉE  : obj = instance Paiement
        SORTIE  : HTML formaté avec toutes les infos
        """
        from django.utils.html import format_html

        try:
            r       = obj.reservation
            voyage  = r.voyage
            user    = r.utilisateur
            return format_html(
                '<strong>Billet :</strong> {}<br>'
                '<strong>Voyageur :</strong> {} ({})<br>'
                '<strong>Trajet :</strong> {} → {}<br>'
                '<strong>Date départ :</strong> {}<br>'
                '<strong>Siège :</strong> N°{}',
                str(r.numero_billet)[:18].upper(),
                user.get_full_name() or user.username,
                user.telephone,
                voyage.get_ville_depart_display(),
                voyage.get_ville_arrivee_display(),
                voyage.date_heure_depart.strftime('%d/%m/%Y à %Hh%M'),
                r.numero_siege,
            )
        except Exception:
            return '—'

    get_reservation_detail.short_description = 'Détails de la réservation'

    # ══════════════════════════════════════════════════════════
    # ACTIONS GROUPÉES
    # Apparaissent dans le menu "Action" de la liste admin
    # ══════════════════════════════════════════════════════════

    def action_confirmer_paiements(self, request, queryset):
        """
        Action : Confirmer manuellement les paiements sélectionnés.

        UTILITÉ : Quand un opérateur confirme un paiement
                  hors webhook (ex: appel téléphonique),
                  l'admin peut le confirmer manuellement.

        ENTRÉE  : queryset = les paiements sélectionnés
        SORTIE  : message de confirmation à l'admin
        """
        # Ne confirme que les paiements EN_ATTENTE ou ECHOUE
        paiements_a_confirmer = queryset.filter(
            statut__in=[
                Paiement.StatutChoices.EN_ATTENTE,
                Paiement.StatutChoices.ECHOUE,
            ]
        )

        nb = 0
        for paiement in paiements_a_confirmer:
            # Confirme le paiement
            paiement.statut            = Paiement.StatutChoices.CONFIRME
            paiement.date_confirmation = timezone.now()
            paiement.save()

            # Confirme aussi la réservation liée
            reservation = paiement.reservation
            reservation.statut_paiement = 'CONFIRME'
            reservation.save()

            nb += 1

        # Message affiché en haut de la page admin après l'action
        self.message_user(
            request,
            f'{nb} paiement(s) confirmé(s) avec succès.'
        )

    action_confirmer_paiements.short_description = '✅ Confirmer les paiements sélectionnés'

    # ──────────────────────────────────────────────────────────

    def action_marquer_echoue(self, request, queryset):
        """
        Action : Marquer les paiements sélectionnés comme échoués.

        UTILITÉ : Paiements en attente depuis trop longtemps,
                  ou confirmés comme échoués par l'opérateur
                  sans webhook reçu.

        ENTRÉE  : queryset = les paiements sélectionnés
        SORTIE  : message de confirmation
        """
        nb = queryset.filter(
            statut=Paiement.StatutChoices.EN_ATTENTE
        ).update(statut=Paiement.StatutChoices.ECHOUE)

        self.message_user(
            request,
            f'{nb} paiement(s) marqué(s) comme échoué(s).'
        )

    action_marquer_echoue.short_description = '❌ Marquer comme échoués'

    # ──────────────────────────────────────────────────────────

    def action_rembourser(self, request, queryset):
        """
        Action : Marquer les paiements sélectionnés comme remboursés.

        UTILITÉ : Après un remboursement effectué hors plateforme
                  (ex: virement bancaire manuel).

        NOTE : En production, cette action déclencherait aussi
               l'appel API de remboursement chez l'opérateur.

        ENTRÉE  : queryset = paiements CONFIRMÉS sélectionnés
        SORTIE  : message de confirmation
        """
        nb = 0
        for paiement in queryset.filter(
            statut=Paiement.StatutChoices.CONFIRME
        ):
            paiement.statut = Paiement.StatutChoices.REMBOURSE
            paiement.save()

            # Annule aussi la réservation liée
            reservation = paiement.reservation
            reservation.statut_paiement = 'REMBOURSE'
            reservation.save()

            nb += 1

        self.message_user(
            request,
            f'{nb} paiement(s) marqué(s) comme remboursé(s).'
        )

    action_rembourser.short_description = '↩️ Rembourser les paiements sélectionnés'