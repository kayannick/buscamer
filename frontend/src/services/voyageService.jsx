// ============================================================
//
// RÔLE : Toutes les fonctions liées aux voyages.
//
// INTERACTIONS :
//   → Utilise : axiosConfig.js (apiClient)
//   ← Appelé par : hooks/useVoyages.js
//                  pages/VoyageDetail.jsx
//                  pages/Accueil.jsx
// ============================================================

import apiClient from './axiosConfig'

/**
 * Rechercher des voyages selon des critères.
 *
 * ENTRÉE :
 *   criteres = {
 *     ville_depart  : 'YAOUNDE',
 *     ville_arrivee : 'DOUALA',
 *     date          : '2026-06-18'  (optionnel)
 *   }
 *
 * SORTIE : tableau de voyages (VoyageListSerializer)
 *
 * ENDPOINT : GET /api/voyages/?ville_depart=YAOUNDE&ville_arrivee=DOUALA&date=...
 * PERMISSION : AllowAny
 *
 * NOTE SUR params :
 *   Axios transforme l'objet params en query string automatiquement.
 *   { ville_depart: 'YAOUNDE' } → ?ville_depart=YAOUNDE
 *   Les valeurs undefined ou vides sont ignorées par Axios.
 */
export const rechercherVoyages = async (criteres = {}) => {
  // Nettoie les valeurs vides avant d'envoyer
  const params = {}
  if (criteres.ville_depart)  params.ville_depart  = criteres.ville_depart
  if (criteres.ville_arrivee) params.ville_arrivee = criteres.ville_arrivee
  if (criteres.date)          params.date          = criteres.date

  const response = await apiClient.get('/voyages/', { params })

  // DRF avec pagination renvoie { count, next, previous, results: [...] }
  // Sans pagination renvoie directement [...]
  return response.data.results ?? response.data
}

/**
 * Récupérer le détail complet d'un voyage.
 *
 * ENTRÉE : id (number) — identifiant du voyage
 *
 * SORTIE : objet voyage complet (VoyageDetailSerializer)
 *          inclut agence, bus et chauffeur imbriqués
 *
 * ENDPOINT : GET /api/voyages/{id}/
 * PERMISSION : AllowAny
 */
export const getVoyageDetail = async (id) => {
  const response = await apiClient.get(`/voyages/${id}/`)
  return response.data
}

/**
 * Récupérer la liste des sièges occupés pour un voyage.
 *
 * ENTRÉE : voyageId (number)
 *
 * SORTIE : tableau d'entiers [3, 7, 12, ...]
 *          (numéros de sièges déjà confirmés)
 *
 * ENDPOINT : GET /api/voyages/{id}/sieges-occupes/
 * PERMISSION : AllowAny
 *
 * Utilisé par GrilleDesSeats pour griser les sièges pris.
 */
export const getSiegesOccupes = async (voyageId) => {
  try {
    const response = await apiClient.get(`/voyages/${voyageId}/sieges-occupes/`)
    return response.data
  } catch {
    // Si l'endpoint n'existe pas encore → grille vide (tous libres)
    return []
  }
}

/**
 * Récupérer la liste de toutes les agences.
 *
 * SORTIE : tableau d'agences (AgenceSerializer)
 *
 * ENDPOINT : GET /api/agences/
 * PERMISSION : AllowAny
 */
export const getAgences = async () => {
  const response = await apiClient.get('/agences/')
  return response.data.results ?? response.data
}