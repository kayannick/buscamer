// ============================================================
// frontend/src/components/layout/Navbar.jsx — VERSION CORRIGÉE
// ============================================================

import { useState, useEffect }     from 'react'   // ← useEffect retiré
import { Link, useLocation, useNavigate }    from 'react-router-dom'
import useAuth                               from '../../hooks/useAuth'
import Button                                from '../ui/Button'

const Navbar = () => {
  const { utilisateur, estConnecte, deconnexion } = useAuth()
  const [scrolled, setScrolled]     = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Ombre sur la navbar au scroll — useEffect justifié ici :
  // on souscrit à un événement DOM externe (window scroll)
  // ce qui EST le cas d'usage prévu pour useEffect
  // import { useEffect } from 'react'  // garder UNIQUEMENT pour le scroll

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ✅ PAS de useEffect pour fermer le menu :
  // on passe location.pathname comme "key" au menu déroulant
  // → React recrée le nœud à chaque navigation → reset automatique

  const handleDeconnexion = () => {
    deconnexion()
    navigate('/')
  }

  const estActif = (path) => location.pathname === path

  const lienStyle = (path) => ({
    fontFamily  : 'var(--font-display)',
    fontWeight  : 500,
    fontSize    : '0.9rem',
    color       : estActif(path) ? 'var(--or-soleil)' : 'var(--blanc)',
    padding     : '0.3rem 0',
    borderBottom: estActif(path) ? '2px solid var(--or-soleil)' : '2px solid transparent',
    transition  : 'all var(--transition)',
  })

  return (
    <>
      <nav style={{
        position  : 'fixed',
        top       : 0, left: 0, right: 0,
        zIndex    : 100,
        background: 'var(--vert-foret)',
        boxShadow : scrolled ? '0 2px 20px rgba(0,0,0,0.2)' : 'none',
        transition: 'box-shadow var(--transition)',
      }}>
        <div className="conteneur" style={{
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'space-between',
          height        : '64px',
        }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--or-soleil)"/>
              <path d="M6 22 L10 12 L22 12 L26 22 Z" fill="var(--vert-foret)" stroke="none"/>
              <rect x="8" y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
              <rect x="20" y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
              <rect x="11" y="15" width="3" height="3" rx="1" fill="white" opacity="0.7"/>
              <rect x="18" y="15" width="3" height="3" rx="1" fill="white" opacity="0.7"/>
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

          {/* Liens desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
               className="nav-desktop">
            <Link to="/"        style={lienStyle('/')}>Accueil</Link>
            <Link to="/voyages" style={lienStyle('/voyages')}>Voyages</Link>
            {estConnecte && (
              <Link to="/profil" style={lienStyle('/profil')}>Mes billets</Link>
            )}
          </div>

          {/* Actions auth desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
               className="nav-desktop">
            {estConnecte ? (
              <>
                <span style={{
                  color     : 'rgba(255,255,255,0.7)',
                  fontSize  : '0.85rem',
                  fontFamily: 'var(--font-display)',
                }}>
                  Bonjour,{' '}
                  <strong style={{ color: 'var(--blanc)' }}>
                    {utilisateur?.first_name || utilisateur?.username}
                  </strong>
                </span>
                <Button
                  variante="fantome"
                  taille="sm"
                  onClick={handleDeconnexion}
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button
                  variante="fantome"
                  taille="sm"
                  onClick={() => navigate('/connexion')}
                  style={{ color: 'var(--blanc)' }}
                >
                  Connexion
                </Button>
                <Button variante="or" taille="sm" onClick={() => navigate('/inscription')}>
                  S'inscrire
                </Button>
              </>
            )}
          </div>

          {/* Burger mobile */}
          <button
            onClick={() => setMenuOuvert(prev => !prev)}
            className="nav-mobile"
            style={{
              background  : 'transparent',
              border      : 'none',
              color       : 'var(--blanc)',
              display     : 'flex',
              flexDirection: 'column',
              gap         : '5px',
              padding     : '4px',
            }}
            aria-label="Menu"
            aria-expanded={menuOuvert}
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
              }} />
            ))}
          </button>
        </div>

        {/* ✅ key={location.pathname} : recrée ce nœud à chaque navigation
            → menuOuvert repart à false (valeur initiale de useState)
            sans jamais appeler setState dans un effet               */}
        <div
          key={location.pathname}
          style={{
            maxHeight : menuOuvert ? '320px' : '0',
            overflow  : 'hidden',
            transition: 'max-height 0.3s ease',
            background: 'var(--vert-foret)',
            borderTop : menuOuvert ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}
        >
          <div className="conteneur" style={{
            padding      : '1rem 1.5rem',
            display      : 'flex',
            flexDirection: 'column',
            gap          : '1rem',
          }}>
            <Link to="/"        style={{ color: 'var(--blanc)', fontFamily: 'var(--font-display)' }}>Accueil</Link>
            <Link to="/voyages" style={{ color: 'var(--blanc)', fontFamily: 'var(--font-display)' }}>Voyages</Link>
            {estConnecte && (
              <Link to="/profil" style={{ color: 'var(--blanc)', fontFamily: 'var(--font-display)' }}>
                Mes billets
              </Link>
            )}
            <hr style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            {estConnecte ? (
              <button
                onClick={handleDeconnexion}
                style={{
                  color      : 'var(--or-soleil)',
                  background : 'none',
                  fontFamily : 'var(--font-display)',
                  fontWeight : 600,
                  textAlign  : 'left',
                  border     : 'none',
                  cursor     : 'pointer',
                }}
              >
                Déconnexion
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  variante="secondaire"
                  taille="sm"
                  onClick={() => navigate('/connexion')}
                  style={{ color: 'var(--blanc)', borderColor: 'var(--blanc)' }}
                >
                  Connexion
                </Button>
                <Button variante="or" taille="sm" onClick={() => navigate('/inscription')}>
                  S'inscrire
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer navbar fixed */}
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