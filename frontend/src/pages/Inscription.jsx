// ============================================================
//
// RÔLE : Page de création de compte.
//
// FLUX COMPLET :
//   1. Utilisateur remplit le formulaire
//   2. Validation côté client (password === password2)
//   3. handleSubmit() → inscription(form)
//      → authService.inscription()
//      → POST /api/utilisateurs/inscription/
//      → InscriptionSerializer.validate() vérifie tout
//      → create_user() hashe le mot de passe → sauvegarde
//   4. Succès → navigate('/connexion', { state: { message } })
//   5. Erreur → affichage des erreurs par champ (retournées par Django)
//
// GESTION DES ERREURS DJANGO :
//   Django retourne les erreurs sous forme :
//   { username: ["Ce nom existe déjà."], telephone: ["..."] }
//   On les affiche sous chaque champ concerné.
//
// INTERACTIONS :
//   → Utilise : services/authService.js → inscription()
// ============================================================

import { useState }          from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { inscription }       from '../services/authService'
import Button                from '../components/ui/Button'

const Inscription = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username  : '',
    first_name: '',
    last_name : '',
    email     : '',
    telephone : '',
    password  : '',
    password2 : '',
  })

  const [erreurs,    setErreurs]    = useState({})
  const [chargement, setChargement] = useState(false)
  const [succes,     setSucces]     = useState(false)

  const handleChange = (e) => {
    // Efface TOUTES les erreurs dès que l'utilisateur retape
    setErreurs({})
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreurs({})

    // ── Validation côté client ──────────────────────────────
    // Vérifiée AVANT d'appeler Django pour une UX plus rapide
    if (form.password !== form.password2) {
      setErreurs({ password2: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (form.password.length < 8) {
      setErreurs({ password: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    if (!form.telephone.match(/^[0-9]{9}$/)) {
      setErreurs({ telephone: 'Entrez un numéro valide (9 chiffres, ex: 699999999).' })
      return
    }

    setChargement(true)

    try {
      await inscription(form)
      setSucces(true)

      // Attendre 1.5s pour montrer le message de succès
      // puis rediriger vers la connexion
      setTimeout(() => {
        navigate('/connexion', {
          state: { message: 'Compte créé avec succès ! Connectez-vous.' }
        })
      }, 1500)

    } catch (err) {
      const data = err.response?.data

      if (!err.response) {
        // Pas de réponse = Django inaccessible
        setErreurs({
          general:
            'Impossible de contacter le serveur. ' +
            'Assurez-vous que Django tourne sur le port 8000.',
        })
        return
      }

      if (data && typeof data === 'object') {
        // Django retourne un objet d'erreurs par champ
        // On formate chaque message (prend le premier si c'est un tableau)
        const erreursFormatees = {}
        Object.entries(data).forEach(([champ, messages]) => {
          erreursFormatees[champ] = Array.isArray(messages)
            ? messages[0]
            : messages
        })
        setErreurs(erreursFormatees)
      } else {
        setErreurs({ general: 'Erreur lors de l\'inscription. Réessayez.' })
      }

    } finally {
      setChargement(false)
    }
  }

  // ── Définition des champs du formulaire ──────────────────
  const champs = [
    {
      name       : 'username',
      label      : 'Nom d\'utilisateur',
      type       : 'text',
      placeholder: 'jean_paul',
      requis     : true,
      col        : 'plein',
      aide       : 'Lettres, chiffres et underscores uniquement.',
    },
    {
      name       : 'first_name',
      label      : 'Prénom',
      type       : 'text',
      placeholder: 'Jean',
      requis     : false,
      col        : 'moitie',
    },
    {
      name       : 'last_name',
      label      : 'Nom de famille',
      type       : 'text',
      placeholder: 'Paul',
      requis     : false,
      col        : 'moitie',
    },
    {
      name       : 'email',
      label      : 'Adresse email',
      type       : 'email',
      placeholder: 'jean@gmail.com',
      requis     : false,
      col        : 'plein',
    },
    {
      name       : 'telephone',
      label      : 'Téléphone',
      type       : 'tel',
      placeholder: '699999999',
      requis     : true,
      col        : 'plein',
      aide       : '9 chiffres sans indicatif (ex: 699999999)',
    },
    {
      name       : 'password',
      label      : 'Mot de passe',
      type       : 'password',
      placeholder: '••••••••',
      requis     : true,
      col        : 'moitie',
      aide       : 'Minimum 8 caractères.',
    },
    {
      name       : 'password2',
      label      : 'Confirmer le mot de passe',
      type       : 'password',
      placeholder: '••••••••',
      requis     : true,
      col        : 'moitie',
    },
  ]

  const inputStyle = (nomChamp) => ({
    padding     : '0.7rem 0.875rem',
    borderRadius: 'var(--radius-sm)',
    border      : `1.5px solid ${erreurs[nomChamp] ? 'var(--rouge-erreur)' : 'var(--gris-bord)'}`,
    fontSize    : '0.9rem',
    outline     : 'none',
    transition  : 'border-color var(--transition)',
    background  : 'var(--creme)',
    width       : '100%',
    fontFamily  : 'var(--font-body)',
  })

  // ── État de succès ────────────────────────────────────────
  if (succes) {
    return (
      <div style={{
        minHeight      : '80vh',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        background     : 'var(--creme)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width          : '72px',
            height         : '72px',
            borderRadius   : '50%',
            background     : 'var(--vert-pale)',
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
            margin         : '0 auto 1rem',
            fontSize       : '2rem',
          }}>
            🎉
          </div>
          <p style={{
            fontFamily : 'var(--font-display)',
            fontWeight : 700,
            fontSize   : '1.3rem',
            color      : 'var(--vert-foret)',
            marginBottom: '0.5rem',
          }}>
            Compte créé avec succès !
          </p>
          <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem' }}>
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight  : '80vh',
      display    : 'flex',
      alignItems : 'center',
      justifyContent: 'center',
      padding    : '2rem',
      background : 'var(--creme)',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

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
          <p style={{ color: 'var(--gris-doux)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Créez votre compte voyageur gratuitement
          </p>
        </div>

        {/* ── Carte formulaire ── */}
        <div style={{
          background   : 'var(--blanc)',
          borderRadius : 'var(--radius-lg)',
          padding      : '2rem',
          boxShadow    : 'var(--ombre-lg)',
        }}>

          {/* Erreur générale (réseau, serveur...) */}
          {erreurs.general && (
            <div style={{
              background   : '#FEF2F2',
              border       : '1px solid #FECACA',
              borderRadius : 'var(--radius-sm)',
              padding      : '0.85rem 1rem',
              marginBottom : '1.5rem',
              color        : 'var(--rouge-erreur)',
              fontSize     : '0.85rem',
              fontWeight   : 500,
              lineHeight   : 1.5,
              display      : 'flex',
              alignItems   : 'flex-start',
              gap          : '0.4rem',
            }}>
              <span>⚠️</span>
              <span>{erreurs.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{
              display             : 'grid',
              gridTemplateColumns : '1fr 1fr',
              gap                 : '1rem',
              marginBottom        : '1.5rem',
            }}>

              {champs.map(({ name, label, type, placeholder, requis, col, aide }) => (
                <div
                  key={name}
                  style={{
                    gridColumn   : col === 'plein' ? '1 / -1' : 'auto',
                    display      : 'flex',
                    flexDirection: 'column',
                    gap          : '0.35rem',
                  }}
                >
                  {/* Label */}
                  <label style={{
                    fontFamily : 'var(--font-display)',
                    fontWeight : 600,
                    fontSize   : '0.82rem',
                    color      : 'var(--ardoise)',
                    display    : 'flex',
                    alignItems : 'center',
                    gap        : '0.3rem',
                  }}>
                    {label}
                    {requis && (
                      <span style={{ color: 'var(--or-soleil)', fontSize: '0.9rem' }}>*</span>
                    )}
                  </label>

                  {/* Input */}
                  <input
                    type        ={type}
                    name        ={name}
                    value       ={form[name]}
                    onChange    ={handleChange}
                    placeholder ={placeholder}
                    required    ={requis}
                    style       ={inputStyle(name)}
                    onFocus={e => {
                      if (!erreurs[name]) e.target.style.borderColor = 'var(--vert-clair)'
                    }}
                    onBlur={e => {
                      if (!erreurs[name]) e.target.style.borderColor = 'var(--gris-bord)'
                    }}
                  />

                  {/* Aide (texte gris sous le champ) */}
                  {aide && !erreurs[name] && (
                    <span style={{
                      fontSize : '0.72rem',
                      color    : 'var(--gris-doux)',
                      lineHeight: 1.4,
                    }}>
                      {aide}
                    </span>
                  )}

                  {/* Erreur du champ venant de Django */}
                  {erreurs[name] && (
                    <span style={{
                      fontSize  : '0.75rem',
                      color     : 'var(--rouge-erreur)',
                      lineHeight: 1.4,
                      display   : 'flex',
                      alignItems: 'center',
                      gap       : '0.25rem',
                    }}>
                      ⚠️ {erreurs[name]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton de soumission */}
            <Button
              type          ="submit"
              variante      ="primaire"
              pleineLargeur
              chargement    ={chargement}
              taille        ="lg"
            >
              Créer mon compte
            </Button>

            {/* Note champs obligatoires */}
            <p style={{
              textAlign  : 'center',
              marginTop  : '0.75rem',
              fontSize   : '0.72rem',
              color      : 'var(--gris-doux)',
            }}>
              Les champs marqués d'un <span style={{ color: 'var(--or-soleil)' }}>*</span> sont obligatoires
            </p>
          </form>

          {/* Lien vers connexion */}
          <p style={{
            textAlign  : 'center',
            marginTop  : '1.25rem',
            fontSize   : '0.875rem',
            color      : 'var(--gris-doux)',
          }}>
            Déjà un compte ?{' '}
            <Link to="/connexion" style={{ color: 'var(--vert-clair)', fontWeight: 600 }}>
              Se connecter
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Inscription