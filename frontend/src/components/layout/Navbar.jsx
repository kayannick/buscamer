
// ============================================================
//
// CORRECTIONS :
//   - Boutons Connexion/Déconnexion : texte blanc visible sur fond vert
//   - Hover des boutons adapté au fond sombre (pas de fond blanc)
//   - Menu mobile : même correction appliquée
//
// INTERACTIONS :
//   ← Consomme : hooks/useAuth.js (utilisateur, estConnecte, deconnexion)
//   ← Utilise  : react-router-dom (Link, useLocation, useNavigate)
//   → Rendu dans : App.jsx (AppRoutes)
// ============================================================

import { useState, useEffect }                 from 'react'
import { Link, useLocation, useNavigate }      from 'react-router-dom'
import useAuth                                 from '../../hooks/useAuth'
import Button                                  from '../ui/Button'

const Navbar = () => {
  const { utilisateur, estConnecte, deconnexion } = useAuth()
  const [scrolled,    setScrolled]    = useState(false)
  const [menuOuvert,  setMenuOuvert]  = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // ── Ombre au scroll ────────────────────────────────────────
  // useEffect justifié : on souscrit à un événement DOM externe
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleDeconnexion = () => {
    deconnexion()
    navigate('/')
  }

  const estActif = (path) => location.pathname === path

  // Style des liens de navigation
  const lienStyle = (path) => ({
    fontFamily  : 'var(--font-display)',
    fontWeight  : 500,
    fontSize    : '0.9rem',
    color       : estActif(path) ? 'var(--or-soleil)' : 'rgba(255,255,255,0.85)',
    padding     : '0.3rem 0',
    borderBottom: estActif(path)
      ? '2px solid var(--or-soleil)'
      : '2px solid transparent',
    transition  : 'all var(--transition)',
    textDecoration: 'none',
  })

  // ── Style pour les boutons sur fond sombre ─────────────────
  // Ce style est appliqué DIRECTEMENT sur les éléments <button>
  // pour les boutons qui apparaissent sur le fond vert de la navbar.
  // On ne modifie PAS Button.jsx : on surcharge via onMouseEnter/Leave.
  const styleBoutonNavbar = {
    background  : 'transparent',
    border      : '1.5px solid rgba(255,255,255,0.35)',
    color       : 'rgba(255,255,255,0.9)',
    padding     : '0.4rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontFamily  : 'var(--font-display)',
    fontWeight  : 600,
    fontSize    : '0.85rem',
    cursor      : 'pointer',
    transition  : 'all var(--transition)',
    whiteSpace  : 'nowrap',
  }

  // Style du bouton S'inscrire (variante colorée)
  const styleBoutonOr = {
    background  : 'var(--or-soleil)',
    border      : '1.5px solid var(--or-soleil)',
    color       : 'var(--vert-foret)',
    padding     : '0.4rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontFamily  : 'var(--font-display)',
    fontWeight  : 700,
    fontSize    : '0.85rem',
    cursor      : 'pointer',
    transition  : 'all var(--transition)',
    whiteSpace  : 'nowrap',
  }

  return (
    <>
      <nav style={{
        position  : 'fixed',
        top       : 0, left: 0, right: 0,
        zIndex    : 100,
        background: 'var(--vert-foret)',
        boxShadow : scrolled ? '0 2px 20px rgba(0,0,0,0.25)' : 'none',
        transition: 'box-shadow var(--transition)',
      }}>
        <div className="conteneur" style={{
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'space-between',
          height        : '64px',
        }}>

          {/* ── Logo ── */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--or-soleil)"/>
              <path d="M6 22 L10 12 L22 12 L26 22 Z" fill="var(--vert-foret)"/>
              <rect x="8"  y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
              <rect x="20" y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
              <rect x="11" y="15" width="3" height="3" rx="1" fill="white" opacity="0.8"/>
              <rect x="18" y="15" width="3" height="3" rx="1" fill="white" opacity="0.8"/>
            </svg>
            <span style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 800,
              fontSize     : '1.25rem',
              color        : 'var(--blanc)',
              letterSpacing: '-0.02em',
            }}>
              Bus<span style={{ color: 'var(--or-soleil)' }}>Cam</span>
            </span>
          </Link>

          {/* ── Liens desktop ── */}
          <div className="nav-desktop" style={{
            display   : 'flex',
            alignItems: 'center',
            gap       : '2rem',
          }}>
            <Link to="/"        style={lienStyle('/')}>Accueil</Link>
            <Link to="/voyages" style={lienStyle('/voyages')}>Voyages</Link>
            {estConnecte && (
              <Link to="/profil" style={lienStyle('/profil')}>Mes billets</Link>
            )}
          </div>

          {/* ── Actions Auth desktop ── */}
          <div className="nav-desktop" style={{
            display   : 'flex',
            alignItems: 'center',
            gap       : '0.75rem',
          }}>
            {estConnecte ? (
              <>
                {/* Nom de l'utilisateur connecté */}
                <span style={{
                  color     : 'rgba(255,255,255,0.65)',
                  fontSize  : '0.85rem',
                  fontFamily: 'var(--font-display)',
                }}>
                  Bonjour,{' '}
                  <strong style={{ color: 'var(--blanc)' }}>
                    {utilisateur?.first_name || utilisateur?.username}
                  </strong>
                </span>

                {/* ── BOUTON DÉCONNEXION CORRIGÉ ── */}
                {/* On utilise un <button> natif stylé directement  */}
                {/* pour éviter le fond blanc du Button.jsx fantome */}
                <Button
                  onClick={handleDeconnexion}
                  style={styleBoutonNavbar}
                  onMouseEnter={e => {
                    e.currentTarget.style.background   = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.6)'
                    e.currentTarget.style.color        = 'var(--blanc)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background   = 'transparent'
                    e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.35)'
                    e.currentTarget.style.color        = 'rgba(255,255,255,0.9)'
                  }}
                >
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                {/* ── BOUTON CONNEXION CORRIGÉ ── */}
                <Button
                  onClick={() => navigate('/connexion')}
                  style={styleBoutonNavbar}
                  onMouseEnter={e => {
                    e.currentTarget.style.background   = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.6)'
                    e.currentTarget.style.color        = 'var(--blanc)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background   = 'transparent'
                    e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.35)'
                    e.currentTarget.style.color        = 'rgba(255,255,255,0.9)'
                  }}
                >
                  Connexion
                </Button>

                {/* Bouton S'inscrire (or, toujours visible) */}
                <Button
                  onClick={() => navigate('/inscription')}
                  style={styleBoutonOr}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#E8940A'
                    e.currentTarget.style.transform  = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow  = '0 4px 12px rgba(244,161,0,0.35)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--or-soleil)'
                    e.currentTarget.style.transform  = 'none'
                    e.currentTarget.style.boxShadow  = 'none'
                  }}
                >
                  S'inscrire
                </Button>
              </>
            )}
          </div>

          {/* ── Burger menu mobile ── */}
          <button
            className="nav-mobile"
            onClick={() => setMenuOuvert(prev => !prev)}
            aria-label="Menu"
            aria-expanded={menuOuvert}
            style={{
              background   : 'transparent',
              border       : 'none',
              display      : 'flex',
              flexDirection: 'column',
              gap          : '5px',
              padding      : '4px',
              cursor       : 'pointer',
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display     : 'block',
                width       : '22px',
                height      : '2px',
                background  : 'var(--blanc)',
                borderRadius: '2px',
                transition  : 'all var(--transition)',
                transform   :
                  menuOuvert && i === 0 ? 'translateY(7px) rotate(45deg)'
                  : menuOuvert && i === 1 ? 'scaleX(0)'
                  : menuOuvert && i === 2 ? 'translateY(-7px) rotate(-45deg)'
                  : 'none',
              }}/>
            ))}
          </button>
        </div>

        {/* ── Menu mobile déroulant ── */}
        {/* key={location.pathname} : React recrée ce nœud à chaque */}
        {/* navigation → menuOuvert repart à false automatiquement   */}
        <div
          key={location.pathname}
          style={{
            maxHeight : menuOuvert ? '400px' : '0',
            overflow  : 'hidden',
            transition: 'max-height 0.35s ease',
            background: '#163829',  // légèrement plus sombre que le fond
            borderTop : menuOuvert ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}
        >
          <div className="conteneur" style={{
            display      : 'flex',
            flexDirection: 'column',
            gap          : '0',
            padding      : '0.5rem 1.5rem 1rem',
          }}>
            {/* Liens de navigation mobile */}
            {[
              { to: '/',        label: 'Accueil'    },
              { to: '/voyages', label: 'Voyages'    },
              ...(estConnecte ? [{ to: '/profil', label: 'Mes billets' }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{
                  color         : estActif(to) ? 'var(--or-soleil)' : 'rgba(255,255,255,0.85)',
                  fontFamily    : 'var(--font-display)',
                  fontWeight    : estActif(to) ? 700 : 500,
                  fontSize      : '0.95rem',
                  padding       : '0.75rem 0',
                  borderBottom  : '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                  display       : 'block',
                }}
              >
                {label}
              </Link>
            ))}

            {/* Actions auth mobile */}
            <div style={{
              display  : 'flex',
              gap      : '0.75rem',
              marginTop: '0.75rem',
              flexWrap : 'wrap',
            }}>
              {estConnecte ? (
                <Button
                  onClick={handleDeconnexion}
                  style={{
                    ...styleBoutonNavbar,
                    fontSize: '0.9rem',
                    padding : '0.6rem 1.25rem',
                  }}
                >
                  Se déconnecter
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => navigate('/connexion')}
                    style={{
                      ...styleBoutonNavbar,
                      fontSize: '0.9rem',
                      padding : '0.6rem 1.25rem',
                    }}
                  >
                    Connexion
                  </Button>
                  <Button
                    onClick={() => navigate('/inscription')}
                    style={{
                      ...styleBoutonOr,
                      fontSize: '0.9rem',
                      padding : '0.6rem 1.25rem',
                    }}
                  >
                    S'inscrire
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer pour compenser la navbar fixed */}
      <div style={{ height: '64px' }} />

      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-mobile  { display: none  !important; }
        @media (max-width: 768px) {
          .nav-desktop { display: none  !important; }
          .nav-mobile  { display: flex  !important; }
        }
      `}</style>
    </>
  )
}

export default Navbar