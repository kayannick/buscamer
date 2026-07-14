// ============================================================
//
// RÔLE : Toutes les fonctions d'appel API pour le module agent.
//        Centralise les appels vers /api/agent/*
// ============================================================

import apiClient from './axiosConfig'

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = (periode = 'mois') =>
  apiClient.get(`/agent/dashboard/?periode=${periode}`).then(r => r.data)

// ── Voyages ───────────────────────────────────────────────────
export const getAgentVoyages = (statut = '') =>
  apiClient.get(`/agent/voyages/${statut ? `?statut=${statut}` : ''}`).then(r => r.data)

export const creerVoyageAgent = (data) =>
  apiClient.post('/agent/voyages/', data).then(r => r.data)

export const modifierVoyageAgent = (id, data) =>
  apiClient.put(`/agent/voyages/${id}/`, data).then(r => r.data)

export const supprimerVoyageAgent = (id) =>
  apiClient.delete(`/agent/voyages/${id}/`)

// ── Réservations ──────────────────────────────────────────────
export const getAgentReservations = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return apiClient.get(`/agent/reservations/${query ? `?${query}` : ''}`).then(r => r.data)
}

export const modifierStatutReservation = (id, statut) =>
  apiClient.patch(`/agent/reservations/${id}/statut/`, { statut_paiement: statut }).then(r => r.data)

// ── Bus ───────────────────────────────────────────────────────
export const getAgentBus = () =>
  apiClient.get('/agent/bus/').then(r => r.data)

export const creerBus = (data) =>
  apiClient.post('/agent/bus/', data).then(r => r.data)

export const modifierBus = (id, data) =>
  apiClient.put(`/agent/bus/${id}/`, data).then(r => r.data)

export const desactiverBus = (id) =>
  apiClient.delete(`/agent/bus/${id}/`)

// ── Voyageurs ─────────────────────────────────────────────────
export const getAgentVoyageurs = () =>
  apiClient.get('/agent/voyageurs/').then(r => r.data)

// ── Informations de l'agent ───────────────────────────────────────────────── 
export const getAgentInfos = () =>
  apiClient.get('/agent/infos/').then(r => r.data)

/**
 * Valider un paiement en espèces (agents uniquement).
 * Seul l'agent de l'agence concernée peut valider.
 *
 * @param {number} reservationId - ID de la réservation
 * @returns {Promise<Object>} - { succes, message, nouveau_statut }
 */
export const validerPaiementEspeces = (reservationId) =>
  apiClient
    .patch(`/agent/reservations/${reservationId}/valider-especes/`)
    .then(r => r.data)