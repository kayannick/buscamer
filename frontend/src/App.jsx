// ============================================================
// // // RÔLE : Composant racine. Configure le routage et
// // //        enveloppe l'app dans les Providers nécessaires.
// // //
// // // ORDRE DES PROVIDERS (important) :
// // //   BrowserRouter       → gère l'historique de navigation
// // //   QueryClientProvider → React Query (cache des appels API)
// // //   AuthProvider        → état de connexion global
// // //
// // // ROUTES PROTÉGÉES :
// // //   <RouteProtegee> redirige vers /connexion si non connecté.
// // //   Elle attend que chargement=false avant de décider
// // //   (évite une redirection prématurée au démarrage).
// // //
// // // INTERACTIONS :
// // //   ← Monté par : main.jsx
// // //   → Enveloppe : toutes les pages
// ============================================================

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar                                    from './components/layout/Navbar'
import Spinner                                   from './components/ui/Spinner'
import useAuth                                   from './hooks/useAuth'

// Pages voyageur
import Accueil       from './pages/Accueil'
import Voyages       from './pages/Voyages'
import VoyageDetail  from './pages/VoyageDetail'
import Connexion     from './pages/Connexion'
import Inscription   from './pages/Inscription'
import Profil        from './pages/Profil'
import Paiement      from './pages/Paiement'

// Pages agent
import AgentDashboard    from './pages/agent/AgentDashboard'
import AgentVoyages      from './pages/agent/AgentVoyages'
import AgentReservations from './pages/agent/AgentReservations'
import AgentBus          from './pages/agent/AgentBus'
import AgentVoyageurs    from './pages/agent/AgentVoyageurs'

// ── Route protégée voyageur ───────────────────────────────────
const RouteProtegee = ({ children }) => {
  const { estConnecte, chargement } = useAuth()

  if (chargement) {
    return (
      <div style={{
        minHeight     : '60vh',
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'center',
      }}>
        <Spinner taille="lg" />
      </div>
    )
  }

  if (!estConnecte) return <Navigate to="/connexion" replace />
  return children
}

// ── Route protégée agent ──────────────────────────────────────
const RouteAgent = ({ children }) => {
  const { estConnecte, utilisateur, chargement } = useAuth()

  if (chargement) {
    return (
      <div style={{
        minHeight     : '100vh',
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'center',
        background    : '#F1F5F9',
      }}>
        <Spinner taille="lg" />
      </div>
    )
  }

  if (!estConnecte)                  return <Navigate to="/connexion" replace />
  if (utilisateur?.role !== 'AGENT') return <Navigate to="/"         replace />
  return children
}

// ── Composant Navbar conditionnel ─────────────────────────────
// Ce composant utilise useLocation() → doit être DANS le Router.
// Il est placé ici, à l'intérieur de AppRoutes qui est
// lui-même rendu à l'intérieur du BrowserRouter (voir main.jsx).
const NavbarConditionnelle = () => {
  const location     = useLocation()  // ✅ valide car dans le Router
  const estPageAgent = location.pathname.startsWith('/agent')

  // Les pages agent ont leur propre sidebar → pas de Navbar voyageur
  if (estPageAgent) return null

  return <Navbar />
}

// ── Routes principales ────────────────────────────────────────
// AppRoutes est rendu à l'intérieur de BrowserRouter dans main.jsx
// → tous les hooks de routing (useLocation, useNavigate) sont valides
const AppRoutes = () => (
  <>
    {/* Navbar uniquement sur les pages voyageur */}
    <NavbarConditionnelle />

    <Routes>
      {/* ── Pages publiques ── */}
      <Route path="/"            element={<Accueil />}      />
      <Route path="/voyages"     element={<Voyages />}      />
      <Route path="/voyages/:id" element={<VoyageDetail />} />
      <Route path="/connexion"   element={<Connexion />}    />
      <Route path="/inscription" element={<Inscription />}  />

      {/* ── Pages protégées voyageur ── */}
      <Route
        path="/profil"
        element={
          <RouteProtegee>
            <Profil />
          </RouteProtegee>
        }
      />
      <Route
        path="/paiement"
        element={
          <RouteProtegee>
            <Paiement />
          </RouteProtegee>
        }
      />

      {/* ── Pages agent (interface séparée, sans Navbar voyageur) ── */}
      <Route
        path="/agent"
        element={<Navigate to="/agent/dashboard" replace />}
      />
      <Route
        path="/agent/dashboard"
        element={
          <RouteAgent>
            <AgentDashboard />
          </RouteAgent>
        }
      />
      <Route
        path="/agent/voyages"
        element={
          <RouteAgent>
            <AgentVoyages />
          </RouteAgent>
        }
      />
      <Route
        path="/agent/reservations"
        element={
          <RouteAgent>
            <AgentReservations />
          </RouteAgent>
        }
      />
      <Route
        path="/agent/bus"
        element={
          <RouteAgent>
            <AgentBus />
          </RouteAgent>
        }
      />
      <Route
        path="/agent/voyageurs"
        element={
          <RouteAgent>
            <AgentVoyageurs />
          </RouteAgent>
        }
      />

      {/* ── Fallback : page inconnue → accueil ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
)

// ── Composant App racine ──────────────────────────────────────
// App lui-même N'utilise AUCUN hook de routing.
// Il ne fait que rendre AppRoutes.
// Le BrowserRouter est dans main.jsx (voir ci-dessous).
const App = () => <AppRoutes />

export default App
