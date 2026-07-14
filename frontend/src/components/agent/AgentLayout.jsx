// ============================================================
//  RÔLE : Layout commun à toutes les pages du module agent.
//         Sidebar de navigation + zone de contenu.
// 
//  INTERACTIONS :
//    ← Utilisé par : toutes les pages /agent/*
//    → Utilise : useAuth pour nom de l'agent
//
// MODIFICATIONS :
//   - Affiche le logo de l'agence dans la sidebar
//   - Récupère les infos agence via /api/agent/infos/
//   - Navbar voyageur MASQUÉE sur /agent/* (voir App.jsx)
// ============================================================

import { useState }                        from 'react'
import { Link, useLocation, useNavigate }  from 'react-router-dom'
import { useQuery }                        from '@tanstack/react-query'
import { getAgentInfos } from '../../services/agentService'
import useAuth                             from '../../hooks/useAuth'
// import apiClient                           from '../../services/axiosConfig'

const NAV_LIENS = [
  { to: '/agent/dashboard',    label: 'Tableau de bord', icone: '📊' },
  { to: '/agent/voyages',      label: 'Voyages',         icone: '🚌' },
  { to: '/agent/reservations', label: 'Réservations',    icone: '🎫' },
  { to: '/agent/bus',          label: 'Flotte de bus',   icone: '🚍' },
  { to: '/agent/voyageurs',    label: 'Voyageurs',       icone: '👥' },
]

const AgentLayout = ({ children, titre = '' }) => {
  const { utilisateur, deconnexion } = useAuth()
  const location   = useLocation()
  const navigate   = useNavigate()
  const [sidebarOuverte, setSidebarOuverte] = useState(true)

  // ── Récupère les infos de l'agence (nom + logo) ───────────

  const { data: agenceInfos } = useQuery({
    queryKey: ['agent-infos'],
    queryFn : getAgentInfos,
    staleTime: 10 * 60 * 1000,
    retry   : 1,
    // Ne pas throw si erreur (agent peut ne pas avoir d'agence encore)
    throwOnError: false,
  })


  // ── Helper pour construire l'URL du logo ─────────────────────
  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null
    // Si déjà une URL absolue (http://...) → utiliser telle quelle
    if (logoPath.startsWith('http')) return logoPath
    // Sinon → préfixer avec l'URL du backend
    const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api')
    .replace('/api', '')
    return `${backendUrl}${logoPath}`
  }
  // Ajouter cet état pour gérer l'erreur de chargement du logo
  const [logoErreur, setLogoErreur] = useState(false)
  const logoUrl = agenceInfos?.logo ? getLogoUrl(agenceInfos.logo) : null


  const handleDeconnexion = () => {
    deconnexion()
    navigate('/')
  }

  const estActif = (path) => location.pathname === path

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'var(--font-body)' }}>

      {/* ════════════ SIDEBAR ════════════ */}
      <aside style={{
        width        : sidebarOuverte ? '260px' : '72px',
        background   : 'var(--vert-foret)',
        display      : 'flex',
        flexDirection: 'column',
        transition   : 'width 0.25s ease',
        flexShrink   : 0,
        position     : 'sticky',
        top          : 0,
        height       : '100vh',
        overflow     : 'hidden',
      }}>

        {/* En-tête sidebar : logo agence + toggle */}
        <div style={{
          display      : 'flex',
          alignItems   : 'center',
          justifyContent: sidebarOuverte ? 'space-between' : 'center',
          padding      : '1rem',
          borderBottom : '1px solid rgba(255,255,255,0.1)',
          minHeight    : '72px',
          gap          : '0.5rem',
        }}>

          {sidebarOuverte && (
            <Link to="/agent/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, overflow: 'hidden' }}>
              
              {/* Logo ou initiale */}
              {logoUrl && !logoErreur ? (
                <img
                  src    ={logoUrl}
                  alt    ={agenceInfos?.nom || 'Logo agence'}
                  onError={() => setLogoErreur(true)}
                  style  ={{
                    width       : '40px',
                    height      : '40px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit   : 'contain',
                    background  : 'var(--blanc)',
                    padding     : '3px',
                    flexShrink  : 0,
                    border      : '1px solid rgba(255,255,255,0.2)',
                  }}
               />
             ) : (
               <div style={{
                 width         : '40px',
                 height        : '40px',
                 borderRadius  : 'var(--radius-sm)',
                 background    : 'var(--or-soleil)',
                 display       : 'flex',
                 alignItems    : 'center',
                 justifyContent: 'center',
                 fontFamily    : 'var(--font-display)',
                 fontWeight    : 800,
                 fontSize      : '1.1rem',
                 color         : 'var(--vert-foret)',
                 flexShrink    : 0,
              }}>
                 {(agenceInfos?.nom?.[0] || 'A').toUpperCase()}
              </div>
            )}

            {/* Nom agence */}
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--blanc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {agenceInfos?.nom || 'Mon Agence'}
                </p>
                <span style={{ background: 'rgba(244,161,0,0.2)', color: 'var(--or-soleil)', fontSize: '0.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                 ESPACE AGENT
                </span>
              </div>
            </Link>
          )}

          {/* Sidebar fermée : logo seul */}
          {!sidebarOuverte && (
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: logoUrl && !logoErreur ? 'var(--blanc)' : 'var(--or-soleil)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
             {logoUrl && !logoErreur ? (
               <img src={logoUrl} alt="" onError={() => setLogoErreur(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }} />
             ) : (
               <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--vert-foret)' }}>
                 {(agenceInfos?.nom?.[0] || 'A').toUpperCase()}
               
               </span>
             )}
            </div>
          )}

          <button
            onClick={() => setSidebarOuverte(p => !p)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--blanc)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}
          >
            {sidebarOuverte ? '←' : '→'}
          </button>
        </div>

        {/* Profil agent */}
        {sidebarOuverte && (
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--or-soleil)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--vert-foret)', fontSize: '1rem', flexShrink: 0 }}>
                {(utilisateur?.first_name?.[0] || utilisateur?.username?.[0] || 'A').toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--blanc)', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {utilisateur?.first_name ? `${utilisateur.first_name} ${utilisateur.last_name}` : utilisateur?.username}
                </p>
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Agent · {agenceInfos?.ville_siege || ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
          {NAV_LIENS.map(({ to, label, icone }) => (
            <Link
              key={to}
              to={to}
              title={!sidebarOuverte ? label : ''}
              style={{
                display       : 'flex',
                alignItems    : 'center',
                gap           : '0.75rem',
                padding       : sidebarOuverte ? '0.7rem 1rem' : '0.7rem',
                justifyContent: sidebarOuverte ? 'flex-start' : 'center',
                background    : estActif(to) ? 'rgba(244,161,0,0.15)' : 'transparent',
                borderLeft    : estActif(to) ? '3px solid var(--or-soleil)' : '3px solid transparent',
                textDecoration: 'none',
                transition    : 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!estActif(to)) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!estActif(to)) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icone}</span>
              {sidebarOuverte && (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: estActif(to) ? 700 : 500, fontSize: '0.86rem', color: estActif(to) ? 'var(--or-soleil)' : 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bas sidebar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem' }}>
          {/* Infos agence rapides */}
          {sidebarOuverte && agenceInfos && (
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mon agence</p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>🚍 {agenceInfos.nb_bus} bus · 🗓️ {agenceInfos.nb_voyages} voyages</p>
            </div>
          )}

          <button
            onClick={handleDeconnexion}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', justifyContent: sidebarOuverte ? 'flex-start' : 'center' }}
          >
            <span style={{ fontSize: '1rem' }}>🚪</span>
            {sidebarOuverte && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-display)' }}>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ════════════ ZONE PRINCIPALE ════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ background: 'var(--blanc)', borderBottom: '1px solid var(--gris-bord)', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--ardoise)', margin: 0 }}>
            {titre}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {/* Badge agence */}
            {agenceInfos && (
              <span style={{ background: 'var(--vert-pale)', color: 'var(--vert-foret)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {agenceInfos.nom}
              </span>
            )}
          </div>
        </header>

        {/* Contenu de la page */}
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default AgentLayout

