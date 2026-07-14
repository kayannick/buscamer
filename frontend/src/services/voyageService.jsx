//  ============================================================
// 
//  RÔLE : Toutes les fonctions liées aux voyages.
// 
//  INTERACTIONS :
//    → Utilise : axiosConfig.js (apiClient)
//    ← Appelé par : hooks/useVoyages.js
//                   pages/VoyageDetail.jsx
//                   pages/Accueil.jsx
//
// 
//  CORRECTION : rechercherVoyages() envoie les paramètres
//  de filtre correctement sans valeurs vides.
//
//   Django REST Framework avec pagination retourne :
//   { count: 5, next: null, previous: null, results: [...] }
//   et NON pas un tableau direct [...].
//
//   Si pagination activée → il faut lire response.data.results
//   Si pagination désactivée → response.data est le tableau
//
//   Cette fonction gère LES DEUX cas automatiquement.
// ============================================================

import apiClient from './axiosConfig'

/**
 * Recherche des voyages disponibles.
 *
 * GÈRE DEUX FORMATS DE RÉPONSE DJANGO :
 *   Format paginé  : { count, results: [...] } → retourne results
 *   Format direct  : [...]                     → retourne tel quel
 *
 * @param {Object} params - { ville_depart?, ville_arrivee?, date? }
 * @returns {Promise<Array>} - tableau de voyages
 */
export const rechercherVoyages = async (params = {}) => {
  // Ne transmet que les paramètres non vides
  const queryParams = {}
  if (params.ville_depart)  queryParams.ville_depart  = params.ville_depart
  if (params.ville_arrivee) queryParams.ville_arrivee = params.ville_arrivee
  if (params.date)          queryParams.date           = params.date

  const response = await apiClient.get('/voyages/', { params: queryParams })
  const data     = response.data

  // ── Gestion des deux formats de réponse ──────────────────
  // Format paginé DRF : { count: N, results: [...] }
  if (data && Array.isArray(data.results)) {
    return data.results
  }

  // Format direct : [...]
  if (Array.isArray(data)) {
    return data
  }

  // Sécurité : retourne tableau vide si format inattendu
  console.warn('Format de réponse inattendu pour /voyages/ :', data)
  return []
}

export const getVoyageDetail = async (id) => {
  const response = await apiClient.get(`/voyages/${id}/`)
  return response.data
}

export const getSiegesOccupes = async (voyageId) => {
  const response = await apiClient.get(`/voyages/${voyageId}/sieges-occupes/`)
  // Gère aussi les deux formats pour les sièges
  const data = response.data
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data))         return data
  return []
}
