// ============================================================
//
// RÔLE : Formater les dates pour l'affichage en français.
//        Fonctions PURES (pas de hooks, pas d'état).
//
// INTERACTIONS :
//   ← Appelé par : composants qui affichent des dates de voyage
// ============================================================

/**
 * Formater une date ISO pour l'affichage.
 *
 * @param {string} dateISO - ex: "2026-06-09T06:30:00Z"
 * @returns {string}       - ex: "09 juin 2026 à 06h30"
 */
export const formaterDateVoyage = (dateISO) => {
  const date = new Date(dateISO)

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',  // Toujours afficher en heure locale Cameroun
  }).replace('à', 'à')          // Standardise le séparateur
}

/**
 * Formater une durée de trajet (format Django DurationField).
 *
 * @param {string} duree - ex: "04:00:00" (4 heures)
 * @returns {string}     - ex: "4h00"
 */
export const formaterDuree = (duree) => {
  const [heures, minutes] = duree.split(':')
  return `${parseInt(heures)}h${minutes}`
}