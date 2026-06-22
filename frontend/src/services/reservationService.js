// ============================================================
//
// RÔLE : Toutes les fonctions liées aux réservations.
//
// INTERACTIONS :
//   → Utilise : axiosConfig.js (apiClient)
//   ← Appelé par : pages/VoyageDetail.jsx
//                  pages/Profil.jsx
// ============================================================

import apiClient from './axiosConfig'

/**
 * Créer une nouvelle réservation.
 *
 * ENTRÉE :
 *   data = {
 *     voyage       : 12,        (ID du voyage)
 *     numero_siege : 23,        (numéro choisi dans la grille)
 *     montant_paye : '3500.00'  (prix du voyage)
 *   }
 *
 * SORTIE : la réservation créée avec son numero_billet (UUID)
 *
 * ENDPOINT : POST /api/reservations/
 * PERMISSION : IsAuthenticated
 *
 * CÔTÉ DJANGO :
 *   perform_create() injecte automatiquement request.user
 *   → Impossible de réserver "pour quelqu'un d'autre"
 *   validate() vérifie :
 *     - Voyage encore ouvert
 *     - Siège dans la plage valide
 *     - Siège non déjà pris
 */
export const creerReservation = async (data) => {
  const response = await apiClient.post('/reservations/', data)
  return response.data
}

/**
 * Récupérer MES réservations (celles de l'utilisateur connecté).
 *
 * SORTIE : tableau de réservations avec voyages imbriqués
 *
 * ENDPOINT : GET /api/reservations/
 * PERMISSION : IsAuthenticated
 *
 * SÉCURITÉ DJANGO :
 *   get_queryset() filtre automatiquement sur request.user
 *   → Même sans paramètre, on ne reçoit QUE ses propres billets
 */
export const getMesReservations = async () => {
  const response = await apiClient.get('/reservations/')
  return response.data.results ?? response.data
}

/**
 * Annuler une réservation.
 *
 * ENTRÉE : id (number) — identifiant de la réservation
 *
 * ENDPOINT : PATCH /api/reservations/{id}/
 * PERMISSION : IsAuthenticated (et propriétaire uniquement)
 */
export const annulerReservation = async (id) => {
  const response = await apiClient.patch(`/reservations/${id}/`, {
    statut_paiement: 'ANNULE',
  })
  return response.data
}