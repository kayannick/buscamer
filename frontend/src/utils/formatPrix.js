// ============================================================
//
// RÔLE : Formater les prix en FCFA.
// ============================================================

/**
 * @param {number|string} montant - ex: 3500 ou "3500.00"
 * @returns {string}              - ex: "3 500 FCFA"
 */
export const formaterPrix = (montant) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',      // Code ISO du Franc CFA BEAC
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(montant))
}