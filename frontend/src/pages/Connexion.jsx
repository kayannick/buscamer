// ============================================================
//
// RÔLE : Page de connexion utilisateur.
//
// FLUX COMPLET :
//   1. Utilisateur remplit username + password
//   2. handleSubmit() appelle connexion() du AuthContext
//   3. connexion() → authService.connexion()
//      → POST /api/utilisateurs/token/
//      → Django SimpleJWT vérifie les credentials
//      → Retourne { access, refresh }
//      → Stockés dans localStorage
//   4. connexion() → getProfil()
//      → GET /api/utilisateurs/profil/
//      → setUtilisateur(data) dans AuthContext
//   5. navigate(destination) → retour à la page d'origine
//      ou à l'accueil si pas de redirection
//
// GESTION DES ERREURS :
//   - Pas de réseau    → message "serveur inaccessible"
//   - 401              → "identifiant ou mot de passe incorrect"
//   - Autre            → message avec le code d'erreur
//
// INTERACTIONS :
//   → Utilise : hooks/useAuth.js → AuthProvider → authService.js
// ============================================================

import { useState }                       from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import useAuth                            from '../hooks/useAuth'
import Button                             from '../components/ui/Button'

const Connexion = () => {
  const { connexion }  = useAuth()
  const navigate       = useNavigate()
  const location       = useLocation()

  // Si l'utilisateur a été redirigé depuis une route protégée,
  // on le renvoie là où il voulait aller après connexion
  const destination   = location.state?.from || '/'
  // Message de succès envoyé depuis la page Inscription
  const messageSucces = location.state?.message || null

  const [form, setForm] = useState({
    username : '',
    password : '',
  })
  const [erreur,     setErreur]     = useState('')
  const [chargement, setChargement] = useState(false)

  const handleChange = (e) => {
    setErreur('')  // Efface l'erreur dès que l'utilisateur retape
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    try {
      await connexion(form.username, form.password)
      // Connexion réussie → redirection
      navigate(destination, { replace: true })

    } catch (err) {
      const status = err.response?.status
      const data   = err.response?.data

      if (!err.response) {
        // Aucune réponse reçue = Django n'est pas lancé
        setErreur(
          'Impossible de contacter le serveur. ' +
          'Assurez-vous que Django tourne sur le port 8000.'
        )
      } else if (status === 401) {
        setErreur('Nom d\'utilisateur ou mot de passe incorrect.')
      } else if (status === 400) {
        const msg = data?.detail
          || data?.non_field_errors?.[0]
          || 'Données invalides.'
        setErreur(msg)
      } else {
        setErreur(`Erreur serveur (${status}). Réessayez dans un moment.`)
      }
    } finally {
      setChargement(false)
    }
  }

  // ── Style partagé pour les inputs ────────────────────────
  const inputStyle = {
    padding     : '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border      : '1.5px solid var(--gris-bord)',
    fontSize    : '0.95rem',
    outline     : 'none',
    transition  : 'border-color var(--transition)',
    background  : 'var(--creme)',
    width       : '100%',
    fontFamily  : 'var(--font-body)',
  }

  return (
    <div style={{
      minHeight      : '80vh',
      display        : 'flex',
      alignItems     : 'center',
      justifyContent : 'center',
      padding        : '2rem',
      background     : 'var(--creme)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily   : 'var(--font-display)',
            fontWeight   : 800,
            fontSize     : '2rem',
            color        : 'var(--vert-foret)',
            letterSpacing: '-0.03em',
          }}>
            Bus<span style={{ color: 'var(--or-soleil)' }}>Cam</span>
          </h1>
          <p style={{
            color      : 'var(--gris-doux)',
            marginTop  : '0.4rem',
            fontSize   : '0.95rem',
          }}>
            Connectez-vous à votre compte
          </p>
        </div>

        {/* ── Carte formulaire ── */}
        <div style={{
          background   : 'var(--blanc)',
          borderRadius : 'var(--radius-lg)',
          padding      : '2rem',
          boxShadow    : 'var(--ombre-lg)',
        }}>

          {/* Message de succès venant de l'inscription */}
          {messageSucces && (
            <div style={{
              background   : 'var(--vert-pale)',
              border       : '1px solid var(--vert-clair)',
              borderRadius : 'var(--radius-sm)',
              padding      : '0.85rem 1rem',
              marginBottom : '1.5rem',
              color        : 'var(--vert-foret)',
              fontSize     : '0.875rem',
              fontWeight   : 600,
              display      : 'flex',
              alignItems   : 'center',
              gap          : '0.5rem',
            }}>
              ✅ {messageSucces}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{
            display       : 'flex',
            flexDirection : 'column',
            gap           : '1.25rem',
          }}>

            {/* Champ : nom d'utilisateur */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{
                fontFamily : 'var(--font-display)',
                fontWeight : 600,
                fontSize   : '0.85rem',
                color      : 'var(--ardoise)',
              }}>
                Nom d'utilisateur
              </label>
              <input
                type         ="text"
                name         ="username"
                value        ={form.username}
                onChange     ={handleChange}
                placeholder  ="jean_paul"
                required
                autoComplete ="username"
                style        ={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--vert-clair)'}
                onBlur ={e => e.target.style.borderColor = 'var(--gris-bord)'}
              />
            </div>

            {/* Champ : mot de passe */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{
                fontFamily : 'var(--font-display)',
                fontWeight : 600,
                fontSize   : '0.85rem',
                color      : 'var(--ardoise)',
              }}>
                Mot de passe
              </label>
              <input
                type         ="password"
                name         ="password"
                value        ={form.password}
                onChange     ={handleChange}
                placeholder  ="••••••••"
                required
                autoComplete ="current-password"
                style        ={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--vert-clair)'}
                onBlur ={e => e.target.style.borderColor = 'var(--gris-bord)'}
              />
            </div>

            {/* Bloc d'erreur */}
            {erreur && (
              <div style={{
                background   : '#FEF2F2',
                border       : '1px solid #FECACA',
                borderRadius : 'var(--radius-sm)',
                padding      : '0.85rem 1rem',
                color        : 'var(--rouge-erreur)',
                fontSize     : '0.85rem',
                fontWeight   : 500,
                lineHeight   : 1.5,
                display      : 'flex',
                alignItems   : 'flex-start',
                gap          : '0.4rem',
              }}>
                <span>⚠️</span>
                <span>{erreur}</span>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type          ="submit"
              variante      ="primaire"
              pleineLargeur
              chargement    ={chargement}
              taille        ="lg"
            >
              Se connecter
            </Button>

          </form>

          {/* Lien vers inscription */}
          <p style={{
            textAlign  : 'center',
            marginTop  : '1.5rem',
            fontSize   : '0.875rem',
            color      : 'var(--gris-doux)',
          }}>
            Pas encore de compte ?{' '}
            <Link
              to="/inscription"
              style={{ color: 'var(--vert-clair)', fontWeight: 600 }}
            >
              S'inscrire gratuitement
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Connexion