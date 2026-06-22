// ============================================================
//
// RÔLE : Composant racine. Configure le routage et
//        enveloppe l'app dans les Providers nécessaires.
//
// ORDRE DES PROVIDERS (important) :
//   BrowserRouter       → gère l'historique de navigation
//   QueryClientProvider → React Query (cache des appels API)
//   AuthProvider        → état de connexion global
//
// ROUTES PROTÉGÉES :
//   <RouteProtegee> redirige vers /connexion si non connecté.
//   Elle attend que chargement=false avant de décider
//   (évite une redirection prématurée au démarrage).
//
// INTERACTIONS :
//   ← Monté par : main.jsx
//   → Enveloppe : toutes les pages
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider }        from '@tanstack/react-query'
import AuthProvider                                from './context/AuthProvider'
import useAuth                                     from './hooks/useAuth'

// Layout
import Navbar from './components/layout/Navbar'

// Pages publiques
import Accueil      from './pages/Accueil'
import Voyages      from './pages/Voyages'
import VoyageDetail from './pages/VoyageDetail'
import Connexion    from './pages/Connexion'
import Inscription  from './pages/Inscription'

// Pages protégées
import Profil from './pages/Profil'

// ── Configuration de React Query ─────────────────────────────
// QueryClient : cerveau du cache des appels API.
// Configuré UNE FOIS ici, disponible partout via le Provider.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry    : 1,               // Réessaie 1 fois en cas d'erreur
      staleTime: 5 * 60 * 1000,  // Données "fraîches" pendant 5 min
                                  // → pas de re-fetch si < 5 min
    },
  },
})

// ── Route protégée ───────────────────────────────────────────
// Affiche un spinner pendant le chargement initial (token check).
// Redirige vers /connexion si l'utilisateur n'est pas connecté.
// Affiche le contenu si l'utilisateur est connecté.
const RouteProtegee = ({ children }) => {
  const { estConnecte, chargement } = useAuth()

  // Pendant la vérification du token → spinner neutre
  // (évite un flash de redirection si le token est valide)
  if (chargement) {
    return (
      <div style={{
        minHeight      : '80vh',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        flexDirection  : 'column',
        gap            : '1rem',
      }}>
        <svg
          width="36" height="36" viewBox="0 0 24 24"
          fill="none" stroke="var(--vert-foret)" strokeWidth="2.5"
          style={{ animation: 'spin 0.8s linear infinite' }}
        >
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <path
            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            strokeLinecap="round"
          />
        </svg>
        <p style={{
          fontFamily : 'var(--font-display)',
          color      : 'var(--gris-doux)',
          fontSize   : '0.9rem',
        }}>
          Chargement...
        </p>
      </div>
    )
  }

  // Non connecté → redirection vers la page de connexion
  // replace=true : remplace l'entrée dans l'historique
  // (le bouton "retour" ne revient pas sur la page protégée)
  if (!estConnecte) {
    return <Navigate to="/connexion" replace />
  }

  // Connecté → affiche le contenu protégé
  return children
}

// ── Composant des routes ─────────────────────────────────────
// Séparé de App pour pouvoir utiliser useAuth()
// qui nécessite d'être DANS le AuthProvider
const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>

        {/* ── Routes publiques ─────────────────────────── */}
        <Route path="/"              element={<Accueil />}      />
        <Route path="/voyages"       element={<Voyages />}      />
        <Route path="/voyages/:id"   element={<VoyageDetail />} />
        <Route path="/connexion"     element={<Connexion />}    />
        <Route path="/inscription"   element={<Inscription />}  />

        {/* ── Routes protégées ─────────────────────────── */}
        <Route
          path="/profil"
          element={
            <RouteProtegee>
              <Profil />
            </RouteProtegee>
          }
        />

        {/* ── Route 404 → redirection accueil ─────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </>
  )
}

// ── Composant racine ─────────────────────────────────────────
const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App