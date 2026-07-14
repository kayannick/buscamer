// ============================================================
//
// RÔLE : Hook personnalisé pour CONSOMMER AuthContext.
//
// POURQUOI un hook séparé plutôt que useContext directement ?
//   1. Moins de code dans les composants
//   2. Message d'erreur clair si utilisé hors du Provider
//   3. Point de modification unique si la logique change
//
// USAGE dans un composant :
//   const { utilisateur, connexion, deconnexion } = useAuth()
//
// INTERACTIONS :
//   ← Consomme : AuthContext.jsx
//   → Utilisé par : Navbar.jsx, Connexion.jsx, ProfilPage.jsx, etc.
// ============================================================


import { useContext } from 'react'
import { AuthContext } from '../context/authContext'

const useAuth = () => useContext(AuthContext)

export default useAuth
