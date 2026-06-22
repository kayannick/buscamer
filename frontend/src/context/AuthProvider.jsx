// ============================================================
//
// RÔLE : Composant Provider qui enveloppe toute l'application
//        et fournit l'état d'authentification à tous les enfants.
//
// CE QU'IL GÈRE :
//   - L'utilisateur connecté (objet ou null)
//   - Les actions : connexion(), deconnexion()
//   - La reconstruction de session au démarrage
//     (si un token existe en localStorage → on récupère le profil)
//
// INTERACTIONS :
//   ← Importe : context/authContext.js (le contexte)
//   ← Importe : services/authService.js
//   → Enveloppé par : App.jsx
//   → Consommé via : hooks/useAuth.js
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import AuthContext                           from './authContext'
import {
  connexion      as connexionService,
  deconnexion    as deconnexionService,
  getProfil,
  estConnecte,
}                                            from '../services/authService'

const AuthProvider = ({ children }) => {

  // L'utilisateur connecté : null si déconnecté,
  // objet { id, username, first_name, role, ... } si connecté
  const [utilisateur, setUtilisateur] = useState(null)

  // true pendant la vérification initiale du token
  // Évite un flash de contenu "non connecté" au démarrage
  const [chargement, setChargement] = useState(true)

  // ────────────────────────────────────────────────────────────
  // INITIALISATION AU DÉMARRAGE DE L'APPLICATION
  //
  // Scénario : l'utilisateur avait fermé l'onglet hier.
  // Aujourd'hui il revient. Son token est encore dans localStorage.
  // → On tente de récupérer son profil pour reconstruire la session.
  //
  // Si getProfil() réussit → session reconstruite, utilisateur connecté
  // Si getProfil() échoue → token expiré, utilisateur déconnecté
  //   (axiosConfig tentera d'abord un refresh, et si ça échoue
  //    redirigera vers /connexion)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const initialiserSession = async () => {
      if (estConnecte()) {
        try {
          const profilData = await getProfil()
          setUtilisateur(profilData)
          console.log('✅ Session restaurée pour :', profilData.username)
        } catch {
          // Token invalide ou expiré → on vide le state
          // axiosConfig a déjà nettoyé localStorage si nécessaire
          setUtilisateur(null)
          console.log('⚠️ Session expirée, reconnexion requise')
        }
      }
      // Dans TOUS les cas, on arrête le chargement initial
      setChargement(false)
    }

    initialiserSession()
  }, []) // ← [] : s'exécute UNE SEULE FOIS au montage du Provider

  // ────────────────────────────────────────────────────────────
  // CONNEXION
  //
  // ENTRÉE : username, password
  // SORTIE : rien (met à jour le state interne)
  //
  // FLUX :
  //   1. connexionService() → POST /api/utilisateurs/token/
  //      stocke les tokens dans localStorage
  //   2. getProfil() → GET /api/utilisateurs/profil/
  //      avec le nouveau token
  //   3. setUtilisateur(data) → tous les composants se mettent à jour
  //
  // useCallback : mémoïse la fonction pour éviter de recréer
  // une nouvelle référence à chaque re-render du Provider
  // ────────────────────────────────────────────────────────────
  const connexion = useCallback(async (username, password) => {
    await connexionService(username, password)
    const profilData = await getProfil()
    setUtilisateur(profilData)
    console.log('✅ Connecté en tant que :', profilData.username)
  }, [])

  // ────────────────────────────────────────────────────────────
  // DÉCONNEXION
  //
  // Supprime les tokens locaux et vide le state.
  // → Tous les composants qui consomment le context se re-rendent
  // → Les routes protégées redirigent vers /connexion
  // ────────────────────────────────────────────────────────────
  const deconnexion = useCallback(() => {
    deconnexionService()
    setUtilisateur(null)
    console.log('👋 Déconnecté')
  }, [])

  // ────────────────────────────────────────────────────────────
  // VALEUR DU CONTEXTE
  //
  // Tout ce qui est dans cet objet est accessible via useAuth()
  // depuis n'importe quel composant enfant.
  // ────────────────────────────────────────────────────────────
  const valeurContexte = {
    utilisateur,                  // null ou objet utilisateur
    estConnecte : !!utilisateur,  // boolean simple pour les conditions
    chargement,                   // true pendant l'init → afficher spinner
    connexion,                    // fonction pour se connecter
    deconnexion,                  // fonction pour se déconnecter
  }

  return (
    <AuthContext.Provider value={valeurContexte}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider