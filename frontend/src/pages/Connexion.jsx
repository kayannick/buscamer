// // // ============================================================
// 
//  RÔLE : Page de connexion unique pour voyageurs ET agents.
//         Après connexion :
//           - role === 'AGENT'    → /agent/dashboard (direct)
//           - role === 'VOYAGEUR' → / ou page précédente
//           - role === 'ADMIN'    → /admin (Django admin)
// 
//  DESIGN :
//    - Split screen : visuel gauche + formulaire droit
//    - Indicateur de rôle dans le formulaire
//    - Messages d'erreur clairs
//    - Pas de border mixé avec borderColor (règle projet)
//    - Emojis dans span aria-hidden (règle projet)
// 
//  INTERACTIONS :
//    → Appelle : POST /api/utilisateurs/token/
//    → Utilise  : authService.js (connexion)
//    → Navigate : selon le rôle retourné par le backend

//    Utiliser deux états séparés (plus d'objet form)
//    → élimine tout risque de double enveloppement

//
// RÈGLES APPLIQUÉES :
//   ✅ États séparés username/password (pas d'objet form)
//   ✅ mutationFn: (vars) => connexionAPI(vars) ← isole les variables
//   ✅ await chargerUtilisateur() AVANT navigate()
//   ✅ Utilise data.role pour la redirection (fiable)
//   ✅ border shorthand seul (jamais mixé avec borderColor)
//   ✅ Hover via useState (pas onMouseEnter modifiant border*)
//   ✅ Emojis dans span aria-hidden
//   ✅ Aucun hook après un return conditionnel
// ============================================================

import { useState }                       from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useMutation }                    from '@tanstack/react-query'
import { connexion as connexionAPI }      from '../services/authService'
import useAuth                            from '../hooks/useAuth'
import Spinner                            from '../components/ui/Spinner'

const Connexion = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { chargerUtilisateur } = useAuth()

  // États séparés — évite l'envoi d'un objet entier
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erreur,   setErreur]   = useState('')
  const [focus,    setFocus]    = useState('')

  // Hover via useState — règle projet (pas de borderColor en onMouseEnter)
  const [hoverBtn, setHoverBtn] = useState(false)

  // ── Mutation connexion ────────────────────────────────────
  const { mutate: seConnecter, isPending } = useMutation({

    // ✅ Fonction fléchée pour isoler les variables
    // Évite que React Query injecte son contexte comme 2ème argument
    mutationFn: (variables) => connexionAPI({
      username: String(variables.username ?? '').trim(),
      password: String(variables.password ?? ''),
    }),

    onSuccess: async (data) => {
      // ✅ Attend que le contexte soit mis à jour
      // Avant ce await, la Navbar ne connaît pas encore l'utilisateur
      await chargerUtilisateur()

      // ✅ Utilise data.role (retourné par Django)
      // Ne dépend pas du contexte Auth qui peut ne pas être à jour
      if (data.role === 'AGENT') {
        navigate('/agent/dashboard', { replace: true })
      } else if (data.role === 'ADMIN') {
        window.location.href = '/admin'
      } else {
        navigate(location.state?.from || '/', { replace: true })
      }
    },

    onError: (err) => {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      const data   = err.response?.data

      if (status === 401 || detail) {
        setErreur('Identifiant ou mot de passe incorrect.')
        return
      }
      if (status === 400) {
        const msg = typeof data === 'object' && data !== null
          ? Object.values(data).flat()[0]
          : 'Données invalides.'
        setErreur(typeof msg === 'string' ? msg : 'Données invalides.')
        return
      }
      setErreur('Connexion impossible. Vérifiez votre connexion réseau.')
    },
  })

  // ── Soumission ────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    setErreur('')

    const u = username.trim()
    const p = password

    if (!u) { setErreur("L'identifiant est obligatoire.");  return }
    if (!p) { setErreur('Le mot de passe est obligatoire.'); return }

    //  Passe un objet avec exactement 2 clés string
    seConnecter({ username: u, password: p })
  }

  // ── Style champ (border shorthand seul) ───────────────────
  const champStyle = (nom) => ({
    width       : '100%',
    padding     : '0.8rem 1rem',
    border      : focus === nom
      ? '2px solid var(--vert-foret)'
      : '2px solid var(--gris-bord)',
    borderRadius: 'var(--radius-sm)',
    fontSize    : '0.95rem',
    fontFamily  : 'var(--font-body)',
    color       : 'var(--ardoise)',
    background  : 'var(--blanc)',
    outline     : 'none',
    transition  : 'border 0.15s ease',
    boxSizing   : 'border-box',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--creme)' }}>

      {/* ═══ COLONNE GAUCHE — Visuel ═══ */}
      <div
        className="connexion-gauche"
        style={{
          flex          : 1,
          background    : 'var(--vert-foret)',
          display       : 'flex',
          flexDirection : 'column',
          justifyContent: 'center',
          alignItems    : 'center',
          padding       : '3rem 2.5rem',
          position      : 'relative',
          overflow      : 'hidden',
        }}
      >
        {/* Motif décoratif SVG */}
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="motif-login" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <polygon points="30,3 57,30 30,57 3,30" fill="none" stroke="#F4A100" strokeWidth="1.5"/>
              <circle cx="30" cy="30" r="5" fill="#F4A100" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#motif-login)"/>
        </svg>

        {/* Logo BusCam */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width         : '80px',
            height        : '80px',
            borderRadius  : '20px',
            background    : 'var(--or-soleil)',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
            margin        : '0 auto 1.25rem',
            boxShadow     : '0 8px 32px rgba(244,161,0,0.3)',
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M6 34 L11 16 L33 16 L38 34 Z" fill="var(--vert-foret)"/>
              <rect x="9"  y="30" width="6" height="6" rx="3" fill="var(--or-soleil)"/>
              <rect x="29" y="30" width="6" height="6" rx="3" fill="var(--or-soleil)"/>
              <rect x="14" y="20" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
              <rect x="25" y="20" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', color: 'var(--blanc)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Bus<span style={{ color: 'var(--or-soleil)' }}>Cam</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
            Réservation de bus au Cameroun
          </p>
        </div>

        {/* Cartes info */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { icone: '🎫', titre: 'Voyageurs',       texte: 'Réservez vos sièges et payez en Mobile Money.' },
            { icone: '📊', titre: "Agents d'agence", texte: 'Gérez voyages, flotte et statistiques.' },
          ].map(({ icone, titre, texte }) => (
            <div key={titre} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', gap: '0.875rem' }}>
              {/* ✅ Emoji dans span aria-hidden */}
              <span aria-hidden="true" style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icone}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--or-soleil)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{titre}</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', lineHeight: 1.5 }}>{texte}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ position: 'relative', marginTop: '2.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
          <span aria-hidden="true">🇨🇲</span>{' '}Plateforme officielle — Cameroun
        </p>
      </div>

      {/* ═══ COLONNE DROITE — Formulaire ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2.5rem 2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--ardoise)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Connexion
            </h2>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Voyageurs et agents utilisent la même page.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Champ identifiant */}
              <div>
                <label
                  htmlFor="username"
                  style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--ardoise)', marginBottom: '0.4rem' }}
                >
                  Identifiant
                  <span aria-hidden="true" style={{ color: 'var(--or-soleil)', marginLeft: '0.2rem' }}>*</span>
                </label>
                <input
                  id          ="username"
                  name        ="username"
                  type        ="text"
                  value       ={username}
                  placeholder ="Votre identifiant"
                  autoComplete="username"
                  disabled    ={isPending}
                  onChange    ={e => { setErreur(''); setUsername(e.target.value) }}
                  onFocus     ={() => setFocus('username')}
                  onBlur      ={() => setFocus('')}
                  style       ={champStyle('username')}
                />
              </div>

              {/* Champ mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--ardoise)', marginBottom: '0.4rem' }}
                >
                  Mot de passe
                  <span aria-hidden="true" style={{ color: 'var(--or-soleil)', marginLeft: '0.2rem' }}>*</span>
                </label>
                <input
                  id          ="password"
                  name        ="password"
                  type        ="password"
                  value       ={password}
                  placeholder ="Votre mot de passe"
                  autoComplete="current-password"
                  disabled    ={isPending}
                  onChange    ={e => { setErreur(''); setPassword(e.target.value) }}
                  onFocus     ={() => setFocus('password')}
                  onBlur      ={() => setFocus('')}
                  style       ={champStyle('password')}
                />
              </div>

              {/* Erreur */}
              {erreur && (
                <div
                  role="alert"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
                >
                  <span aria-hidden="true" style={{ flexShrink: 0 }}>⚠️</span>
                  <p style={{ color: 'var(--rouge-erreur)', fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
                    {erreur}
                  </p>
                </div>
              )}

              {/* Bouton — hover via useState, border shorthand seul */}
              <button
                type        ="submit"
                disabled    ={isPending}
                onMouseEnter={() => setHoverBtn(true)}
                onMouseLeave={() => setHoverBtn(false)}
                style       ={{
                  width         : '100%',
                  padding       : '0.9rem',
                  background    : isPending ? '#4CAF7D' : hoverBtn ? 'var(--vert-clair)' : 'var(--vert-foret)',
                  border        : '2px solid transparent',
                  borderRadius  : 'var(--radius-md)',
                  color         : 'var(--blanc)',
                  fontFamily    : 'var(--font-display)',
                  fontWeight    : 700,
                  fontSize      : '1rem',
                  cursor        : isPending ? 'not-allowed' : 'pointer',
                  display       : 'flex',
                  alignItems    : 'center',
                  justifyContent: 'center',
                  gap           : '0.5rem',
                  transition    : 'background 0.2s ease',
                }}
              >
                {isPending
                  ? <><Spinner taille="sm" couleur="var(--blanc)" /><span>Connexion...</span></>
                  : 'Se connecter'
                }
              </button>
            </div>
          </form>

          {/* Info agent */}
          <div style={{ marginTop: '1.5rem', background: 'rgba(27,67,50,0.06)', border: '1px solid rgba(27,67,50,0.12)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ fontSize: '0.9rem', flexShrink: 0 }}>📊</span>
            <p style={{ color: 'var(--vert-foret)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
              <strong>Agents :</strong> vous serez redirigé automatiquement vers votre tableau de bord.
            </p>
          </div>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" style={{ color: 'var(--vert-foret)', fontWeight: 700, textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </p>
          <p style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <Link to="/" style={{ color: 'var(--gris-doux)', fontSize: '0.82rem', textDecoration: 'none', fontFamily: 'var(--font-display)' }}>
              ← Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .connexion-gauche { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default Connexion
