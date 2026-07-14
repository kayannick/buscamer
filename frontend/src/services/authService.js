// ============================================================
//
// RÔLE : Toutes les fonctions liées à l'authentification.
//        Les composants React n'appellent JAMAIS axios directement.
//        Ils passent TOUJOURS par ces fonctions.
//
// CONVENTION :
//   - Les URLs sont RELATIVES à baseURL (défini dans axiosConfig)
//   - baseURL = http://localhost:8000/api
//   - '/utilisateurs/inscription/' → http://localhost:8000/api/utilisateurs/inscription/
//
// INTERACTIONS :
//   → Utilise : axiosConfig.js (apiClient)
//   ← Appelé par : context/AuthProvider.jsx
//                  pages/Connexion.jsx
//                  pages/Inscription.jsx

//
// RÈGLE DÉFINITIVE :
//   connexion() accepte UN OBJET { username, password }.
//   Toujours utiliser apiClient (pas fetch natif).
//   Toujours envoyer Content-Type: application/json.
//
// ERREURS ÉVITÉES :
//   ❌ connexion(username, password) ← 2 args = cause le 401
//   ❌ mutationFn: connexionAPI ← React Query injecte un 2ème arg
//   ✅ mutationFn: (vars) => connexionAPI(vars) ← isole les variables
// ============================================================

import apiClient from './axiosConfig'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/**
 * Connexion utilisateur.
 * ENTRÉE  : { username: string, password: string }
 * RETOUR  : { access, refresh, role, username, first_name, last_name }
 */
export const connexion = async ({ username, password }) => {
  const response = await apiClient.post(
    '/utilisateurs/token/',
    {
      username: String(username ?? '').trim(),
      password: String(password ?? ''),
    },
    { headers: { 'Content-Type': 'application/json' } }
  )

  // Stockage immédiat des tokens
  localStorage.setItem('access_token',  response.data.access)
  localStorage.setItem('refresh_token', response.data.refresh)

  return response.data
}

/**
 * Déconnexion — supprime les tokens locaux.
 */
export const deconnexion = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

/**
 * Profil utilisateur connecté.
 */
export const getProfil = async () => {
  console.log('Tentative connexion vers :', `${BASE_URL}/utilisateurs/token/`)
  const response = await apiClient.get('/utilisateurs/profil/')
  return response.data
}

/**
 * Inscription voyageur.
 */
export const inscription = async (userData) => {
    console.log('Tentative inscription vers :', `${BASE_URL}/utilisateurs/inscription/`)
  const response = await apiClient.post('/utilisateurs/inscription/', userData)
  return response.data
}

/**
 * Présence locale d'un token (ne valide pas côté serveur).
 */
export const estConnecte = () => !!localStorage.getItem('access_token')
