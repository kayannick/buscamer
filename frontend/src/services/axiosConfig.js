// ============================================================
 // RÔLE : Instance Axios centrale. Toutes les requêtes HTTP
//        vers Django passent par ici.
// 
//  POURQUOI ce fichier existe :
//    Sans lui, chaque composant devrait répéter l'URL de base,
//    les headers, la gestion du token JWT et du refresh.
//    Ici on le fait UNE FOIS pour tout le projet.
// 
//  INTERACTIONS :
//    → Utilisé par : authService.js, voyageService.js,
//                    reservationService.js
//    ← Lit : localStorage (tokens JWT)
//    ← Lit : import.meta.env.VITE_API_BASE_URL (fichier .env)
// ============================================================

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

console.log('🔗 BusCam API :', BASE_URL)

const apiClient = axios.create({
  baseURL : BASE_URL,
  timeout : 15000,
  headers : {
    'Content-Type': 'application/json',
    'Accept'      : 'application/json',
  },
})

// ── Intercepteur REQUEST ──────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} → ${config.baseURL}${config.url}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Intercepteur RESPONSE ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.status} ← ${response.config.url}`)
    }
    return response
  },

  async (error) => {
    const originalRequest = error.config
    

    if (import.meta.env.DEV) {
      console.error(
        `❌ ${error.response?.status} ← ${originalRequest?.url}`,
        error.response?.data
      )
    }

    // ── CORRECTION CLÉE ────────────────────────────────────────
    // On ne tente le refresh QUE si :
    // 1. C'est une erreur 401
    // 2. On n'a pas déjà réessayé (_retry)
    // 3. Un refresh_token existe en localStorage
    // 4. On n'est PAS sur la page de connexion (évite boucle)
    // 5. La requête n'est PAS déjà une tentative de refresh
    const refreshToken = localStorage.getItem('refresh_token')
    const estSurConnexion = window.location.pathname === '/connexion'
    const estRequeteRefresh = originalRequest?.url?.includes('token/refresh')
    const estRequeteProfil  = originalRequest?.url?.includes('utilisateurs/profil')

    if (
      error.response?.status === 401
      && !originalRequest._retry
      && refreshToken
      && !estSurConnexion
      && !estRequeteRefresh
    ) {
      originalRequest._retry = true

      try {
        const response = await axios.post(
          `${BASE_URL}/utilisateurs/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const newToken = response.data.access
        localStorage.setItem('access_token', newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)

      } catch {
        // Refresh échoué → nettoyage propre
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        // Redirection SEULEMENT si ce n'est pas l'init du profil
        // (AuthProvider gère ça lui-même en mettant setChargement(false))
        if (!estRequeteProfil) {
          window.location.href = '/connexion'
        }
        return Promise.reject(error)
      }
    }

    // Pour toutes les autres erreurs → laisse passer
    return Promise.reject(error)
  }
)

export default apiClient
