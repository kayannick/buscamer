//  ============================================================
// 
//  RÔLE : Composant Provider qui enveloppe toute l'application
//         et fournit l'état d'authentification à tous les enfants.
// 
//  CE QU'IL GÈRE :
//    - L'utilisateur connecté (objet ou null)
//    - Les actions : connexion(), deconnexion()
//    - La reconstruction de session au démarrage
//      (si un token existe en localStorage → on récupère le profil)
// 
//  INTERACTIONS :
//    ← Importe : context/authContext.js (le contexte)
//    ← Importe : services/authService.js
//    → Enveloppé par : App.jsx
//    → Consommé via : hooks/useAuth.js
//
//  CLÉE :
//   chargerUtilisateur() retourne le profil chargé.
//   Connexion.jsx attend ce retour pour naviguer APRÈS.
//
// RÈGLE : ne jamais mettre useEffect après un return conditionnel.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { AuthContext }                       from './authContext'
import { getProfil, deconnexion as apiDeconn } from '../services/authService'

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement,  setChargement]  = useState(true)

  const chargerUtilisateur = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUtilisateur(null)
      setChargement(false)
      return null
    }
    try {
      const profil = await getProfil()
      setUtilisateur(profil)
      setChargement(false)
      return profil  // ← retour obligatoire pour Connexion.jsx
    } catch {
      setUtilisateur(null)
      setChargement(false)
      return null
    }
  }, [])

  // Charge au montage de l'app
  useEffect(() => {
    const fetchUser = async () =>{
      await chargerUtilisateur();
    };
    fetchUser();

  }, [chargerUtilisateur]);

  const handleDeconnexion = useCallback(() => {
    apiDeconn()
    setUtilisateur(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      utilisateur,
      estConnecte        : !!utilisateur,
      chargement,
      chargerUtilisateur,
      deconnexion        : handleDeconnexion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
