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
// ============================================================

import apiClient from './axiosConfig'

// ── Fallback URL (même logique que axiosConfig) ───────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/**
 * Inscrire un nouvel utilisateur.
 *
 * ENTRÉE :
 *   userData = {
 *     username, email, password, password2,
 *     first_name, last_name, telephone, cni (optionnel)
 *   }
 *
 * SORTIE : l'utilisateur créé (sans mot de passe)
 *
 * ENDPOINT Django : POST /api/utilisateurs/inscription/
 * PERMISSION Django : AllowAny (pas besoin d'être connecté)
 *
 * NOTE : On utilise apiClient ici (pas axios direct).
 *        axiosConfig.js a un fallback 'http://localhost:8000/api'
 *        même si .env n'est pas lu.
 */
export const inscription = async (userData) => {
  console.log('📤 Tentative inscription vers :', `${BASE_URL}/utilisateurs/inscription/`)

  const response = await apiClient.post('/utilisateurs/inscription/', userData)
  return response.data
}

/**
 * Connecter un utilisateur et stocker ses tokens JWT.
 *
 * ENTRÉE : username (string), password (string)
 *
 * SORTIE : { access: "eyJ...", refresh: "eyJ..." }
 *          (tokens stockés automatiquement dans localStorage)
 *
 * ENDPOINT Django : POST /api/utilisateurs/token/
 * PERMISSION Django : AllowAny
 *
 * APRÈS CONNEXION :
 *   - access_token  → utilisé dans chaque requête (Authorization header)
 *   - refresh_token → utilisé pour renouveler l'access après expiration
 */
export const connexion = async (username, password) => {
  console.log('📤 Tentative connexion vers :', `${BASE_URL}/utilisateurs/token/`)

  const response = await apiClient.post('/utilisateurs/token/', {
    username,
    password,
  })

  const { access, refresh } = response.data

  // Stockage des tokens pour les futures requêtes
  // L'intercepteur de axiosConfig.js les lira automatiquement
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)

  return response.data
}

/**
 * Déconnecter l'utilisateur.
 *
 * JWT = stateless : pas d'appel API nécessaire pour "déconnecter".
 * Il suffit de supprimer les tokens locaux.
 * Sans token → l'intercepteur n'ajoute plus Authorization header
 * → Django répond 401 → l'utilisateur est traité comme anonyme.
 */
export const deconnexion = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  console.log('👋 Déconnexion effectuée')
}

/**
 * Récupérer le profil de l'utilisateur connecté.
 *
 * ENTRÉE : aucune (le token JWT dans le header identifie l'utilisateur)
 *
 * SORTIE : { id, username, first_name, last_name, email, telephone, role, ... }
 *
 * ENDPOINT Django : GET /api/utilisateurs/profil/
 * PERMISSION Django : IsAuthenticated
 *
 * UTILISÉE PAR : AuthProvider.jsx au démarrage de l'app
 *                pour reconstruire la session si un token existe
 */
export const getProfil = async () => {
  const response = await apiClient.get('/utilisateurs/profil/')
  return response.data
}

/**
 * Vérifier localement si un token d'accès existe.
 *
 * ATTENTION : cette fonction ne valide PAS le token côté serveur.
 * Elle vérifie juste sa PRÉSENCE en localStorage.
 * La validation réelle se fait à chaque requête Django.
 *
 * UTILISÉE PAR : AuthProvider pour décider si on tente getProfil()
 */
export const estConnecte = () => {
  return !!localStorage.getItem('access_token')
}