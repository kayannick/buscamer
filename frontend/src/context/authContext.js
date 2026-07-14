// ============================================================
//
// RÔLE : Crée et exporte UNIQUEMENT le contexte.
//        Pas de composant ici → Fast Refresh content.
//
// INTERACTIONS :
//   → Importé par : AuthProvider.jsx (fournit la valeur)
//   → Importé par : hooks/useAuth.js (consomme la valeur)
// ============================================================

import { createContext } from 'react'

export const AuthContext = createContext({
  utilisateur        : null,
  estConnecte        : false,
  chargement         : true,
  chargerUtilisateur : async () => null,
  deconnexion        : () => {},
})

