// ============================================================
//
// RÔLE : Instance Axios centrale. Toutes les requêtes HTTP
//        vers Django passent par ici.
//
// POURQUOI ce fichier existe :
//   Sans lui, chaque composant devrait répéter l'URL de base,
//   les headers, la gestion du token JWT et du refresh.
//   Ici on le fait UNE FOIS pour tout le projet.
//
// INTERACTIONS :
//   → Utilisé par : authService.js, voyageService.js,
//                   reservationService.js
//   ← Lit : localStorage (tokens JWT)
//   ← Lit : import.meta.env.VITE_API_BASE_URL (fichier .env)
// ============================================================

import axios from 'axios'

// ── Lecture de l'URL de base depuis le fichier .env ──────────
// Si VITE_API_BASE_URL n'est pas défini → on utilise le fallback
// Le fallback garantit que l'app fonctionne même sans .env
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Affichage au démarrage pour confirmer que le .env est lu
console.log('🔗 BusCam API :', BASE_URL)

// ── Création de l'instance Axios ─────────────────────────────
// On crée une instance PRIVÉE plutôt que de modifier axios global.
// Avantage : si on ajoute une autre API externe plus tard,
// on crée une 2ème instance sans aucun conflit.
const apiClient = axios.create({
  baseURL : BASE_URL,
  timeout : 15000,                          // 15s max avant d'abandonner
  headers : {
    'Content-Type': 'application/json',
    'Accept'      : 'application/json',
  },
})

// ============================================================
// INTERCEPTEUR DE REQUÊTES
//
// S'exécute automatiquement AVANT chaque requête envoyée.
//
// RÔLE : ajouter le token JWT dans le header Authorization
//        si l'utilisateur est connecté.
//
// FLUX :
//   composant appelle apiClient.get('/voyages/')
//       ↓
//   Cet intercepteur s'exécute
//       ↓
//   Ajoute "Authorization: Bearer eyJ..." si token présent
//       ↓
//   La requête part vers Django avec le bon header
// ============================================================
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // Log en mode développement uniquement
    // Permet de voir EXACTEMENT quelle URL est appelée
    if (import.meta.env.DEV) {
      const urlComplete = `${config.baseURL}${config.url}`
      console.log(`📤 ${config.method?.toUpperCase()} → ${urlComplete}`)
    }

    return config  // TOUJOURS retourner config sinon la requête est annulée
  },
  (error) => Promise.reject(error)
)

// ============================================================
// INTERCEPTEUR DE RÉPONSES
//
// S'exécute automatiquement sur CHAQUE réponse reçue de Django.
//
// CAS NOMINAL (2xx) : laisse passer la réponse telle quelle.
//
// CAS 401 (token expiré) :
//   1. Récupère le refresh_token dans localStorage
//   2. Appelle POST /utilisateurs/token/refresh/
//   3. Reçoit un nouveau access_token
//   4. Réessaie la requête originale avec le nouveau token
//   → L'utilisateur ne voit rien, sa session continue
//
// CAS 401 sans refresh_token (ou refresh expiré) :
//   → Déconnexion forcée + redirection vers /connexion
// ============================================================
apiClient.interceptors.response.use(
  // ✅ Réponse OK
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.status} ← ${response.config.url}`)
    }
    return response
  },

  // ❌ Réponse erreur
  async (error) => {
    const originalRequest = error.config

    if (import.meta.env.DEV) {
      console.error(
        `❌ ${error.response?.status} ← ${originalRequest?.url}`,
        error.response?.data
      )
    }

    // Tentative de refresh uniquement si :
    // 1. C'est une erreur 401
    // 2. On n'a pas déjà tenté un refresh pour cette requête
    //    (_retry évite les boucles infinies)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          // Appel DIRECT avec axios (pas apiClient)
          // pour éviter de repasser dans cet intercepteur
          const response = await axios.post(
            `${BASE_URL}/utilisateurs/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )

          const newAccessToken = response.data.access
          localStorage.setItem('access_token', newAccessToken)

          // Met à jour le header et réessaie la requête originale
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient(originalRequest)

        } catch {
          // Le refresh a échoué → déconnexion complète
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/connexion'
        }
      } else {
        // Pas de refresh_token → déconnexion immédiate
        localStorage.removeItem('access_token')
        window.location.href = '/connexion'
      }
    }

    // Pour toutes les autres erreurs (400, 403, 404, 500...)
    // on laisse passer pour que le composant gère lui-même
    return Promise.reject(error)
  }
)

export default apiClient