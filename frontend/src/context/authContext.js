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

const AuthContext = createContext(null)

export default AuthContext