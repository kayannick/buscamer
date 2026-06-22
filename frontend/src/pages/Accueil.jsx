// ============================================================
//
// FLUX DE DONNÉES :
//   Utilisateur remplit le formulaire
//   → handleRecherche() s'exécute au submit
//   → navigate('/voyages', { state: criteres })
//   → La page Voyages.jsx lit ces criteres via useLocation()
//   → appelle voyageService.rechercherVoyages(criteres)
//   → GET /api/voyages/?ville_depart=...&ville_arrivee=...&date=...
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'

const VILLES = [
  { valeur: 'YAOUNDE',   label: 'Yaoundé'   },
  { valeur: 'DOUALA',    label: 'Douala'     },
  { valeur: 'BAFOUSSAM', label: 'Bafoussam'  },
  { valeur: 'BAMENDA',   label: 'Bamenda'    },
  { valeur: 'GAROUA',    label: 'Garoua'     },
  { valeur: 'MAROUA',    label: 'Maroua'     },
  { valeur: 'BERTOUA',   label: 'Bertoua'    },
  { valeur: 'BUEA',      label: 'Buea'       },
  { valeur: 'LIMBE',     label: 'Limbé'      },
  { valeur: 'EBOLOWA',   label: 'Ébolowa'    },
]

// Motif Kente SVG — la SIGNATURE du design
const MotifKente = () => (
  <svg
    width="100%" height="100%"
    viewBox="0 0 80 80"
    preserveAspectRatio="xMidYMid slice"
    style={{ position: 'absolute', inset: 0, opacity: 0.07 }}
    aria-hidden="true"
  >
    <defs>
      <pattern id="kente" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <polygon points="20,2 38,20 20,38 2,20" fill="none" stroke="#F4A100" strokeWidth="1.5"/>
        <polygon points="20,8 32,20 20,32 8,20"  fill="none" stroke="#ffffff" strokeWidth="0.8"/>
        <rect x="18" y="18" width="4" height="4" fill="#F4A100" opacity="0.6"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#kente)"/>
  </svg>
)

const Accueil = () => {
  const navigate = useNavigate()
  const today    = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    ville_depart  : '',
    ville_arrivee : '',
    date          : today,
  })
  const [erreur, setErreur] = useState('')

  const handleChange = (e) => {
    setErreur('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRecherche = (e) => {
    e.preventDefault()
    if (!form.ville_depart || !form.ville_arrivee) {
      setErreur('Veuillez choisir une ville de départ et d\'arrivée.')
      return
    }
    if (form.ville_depart === form.ville_arrivee) {
      setErreur('La ville de départ et d\'arrivée doivent être différentes.')
      return
    }
    // Passe les critères de recherche à la page Voyages via le state du router
    navigate('/voyages', { state: form })
  }

  const handleEchange = () => {
    setForm(prev => ({
      ...prev,
      ville_depart  : prev.ville_arrivee,
      ville_arrivee : prev.ville_depart,
    }))
  }

  return (
    <div>
      {/* ====== HERO ====== */}
      <section style={{
        position  : 'relative',
        background: 'var(--vert-foret)',
        padding   : 'clamp(3rem, 8vw, 6rem) 0 0',
        overflow  : 'hidden',
      }}>
        <MotifKente />

        <div className="conteneur" style={{ position: 'relative', zIndex: 1 }}>
          {/* Headline */}
          <div style={{ maxWidth: '620px', marginBottom: '2.5rem' }}>
            <p style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 600,
              fontSize     : '0.85rem',
              color        : 'var(--or-soleil)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom : '0.75rem',
            }}>
              Réservation de bus interurbains
            </p>
            <h1 style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 800,
              fontSize     : 'clamp(2rem, 5vw, 3.25rem)',
              color        : 'var(--blanc)',
              lineHeight   : 1.15,
              letterSpacing: '-0.03em',
              marginBottom : '1rem',
            }}>
              Votre siège,<br/>
              <span style={{ color: 'var(--or-soleil)' }}>garanti avant&nbsp;</span>
              d'arriver à la gare.
            </h1>
            <p style={{
              color    : 'rgba(255,255,255,0.7)',
              fontSize : '1rem',
              maxWidth : '480px',
              lineHeight: 1.7,
            }}>
              Réservez en ligne sur toutes les lignes interurbaines du Cameroun.
              Plus d'attente, plus de bousculade.
            </p>
          </div>

          {/* ====== FORMULAIRE DE RECHERCHE ====== */}
          <div style={{
            background   : 'var(--blanc)',
            borderRadius : 'var(--radius-xl) var(--radius-xl) 0 0',
            padding      : 'clamp(1.5rem, 4vw, 2rem)',
            boxShadow    : '0 -4px 40px rgba(0,0,0,0.15)',
          }}>
            <form onSubmit={handleRecherche}>
              <div style={{
                display              : 'grid',
                gridTemplateColumns  : '1fr auto 1fr 1fr auto',
                gap                  : '0.75rem',
                alignItems           : 'end',
              }} className="form-recherche-grid">

                {/* Ville départ */}
                <ChampSelect
                  label="Départ"
                  name="ville_depart"
                  value={form.ville_depart}
                  onChange={handleChange}
                  placeholder="D'où partez-vous ?"
                  icone={<IconeDepart />}
                />

                {/* Bouton échange */}
                <button
                  type="button"
                  onClick={handleEchange}
                  title="Inverser les villes"
                  style={{
                    width       : '40px',
                    height      : '40px',
                    borderRadius: '50%',
                    border      : '2px solid var(--gris-bord)',
                    background  : 'var(--creme)',
                    display     : 'flex',
                    alignItems  : 'center',
                    justifyContent: 'center',
                    flexShrink  : 0,
                    alignSelf   : 'end',
                    marginBottom: '2px',
                    transition  : 'all var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--vert-clair)'; e.currentTarget.style.background = 'var(--vert-pale)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gris-bord)';  e.currentTarget.style.background = 'var(--creme)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--vert-foret)" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 5h12M10 2l4 3-4 3M14 11H2M6 8l-4 3 4 3"/>
                  </svg>
                </button>

                {/* Ville arrivée */}
                <ChampSelect
                  label="Arrivée"
                  name="ville_arrivee"
                  value={form.ville_arrivee}
                  onChange={handleChange}
                  placeholder="Où allez-vous ?"
                  icone={<IconeArrivee />}
                />

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={labelStyle}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="14" height="12" rx="2"/>
                      <path d="M1 7h14M5 1v4M11 1v4"/>
                    </svg>
                    Date de voyage
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    min={today}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Bouton recherche */}
                <Button
                  type="submit"
                  variante="or"
                  taille="lg"
                  style={{ alignSelf: 'end', paddingLeft: '2rem', paddingRight: '2rem', gap: '0.5rem' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Rechercher
                </Button>
              </div>

              {erreur && (
                <p style={{
                  color     : 'var(--rouge-erreur)',
                  fontSize  : '0.85rem',
                  marginTop : '0.75rem',
                  display   : 'flex',
                  alignItems: 'center',
                  gap       : '0.4rem',
                }}>
                  ⚠️ {erreur}
                </p>
              )}
            </form>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .form-recherche-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* ====== STATS ====== */}
      <section style={{ background: 'var(--blanc)', padding: '3rem 0', borderBottom: '1px solid var(--gris-bord)' }}>
        <div className="conteneur">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
            {[
              { chiffre: '15+',    label: 'Agences partenaires'     },
              { chiffre: '50+',    label: 'Lignes disponibles'       },
              { chiffre: '10 000+',label: 'Voyageurs satisfaits'    },
            ].map(({ chiffre, label }) => (
              <div key={label}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--vert-foret)' }}>{chiffre}</p>
                <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== LIGNES POPULAIRES ====== */}
      <section style={{ padding: '4rem 0' }}>
        <div className="conteneur">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--ardoise)' }}>
            Lignes populaires
          </h2>
          <p style={{ color: 'var(--gris-doux)', marginBottom: '2rem' }}>Les trajets les plus empruntés cette semaine</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {[
              { dep: 'Yaoundé', arr: 'Douala',    prix: 3500,  duree: '3h' },
              { dep: 'Douala',  arr: 'Bafoussam', prix: 4000,  duree: '4h' },
              { dep: 'Yaoundé', arr: 'Bafoussam', prix: 4500,  duree: '4h30' },
              { dep: 'Douala',  arr: 'Buea',      prix: 2000,  duree: '2h' },
            ].map(({ dep, arr, prix, duree }) => (
              <button
                key={`${dep}-${arr}`}
                onClick={() => navigate('/voyages', {
                  state: {
                    ville_depart  : dep.toUpperCase(),
                    ville_arrivee : arr.toUpperCase(),
                    date          : today,
                  }
                })}
                style={{
                  background   : 'var(--blanc)',
                  border       : '1.5px solid var(--gris-bord)',
                  borderRadius : 'var(--radius-md)',
                  padding      : '1.25rem',
                  textAlign    : 'left',
                  transition   : 'all var(--transition)',
                  cursor       : 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--vert-clair)'; e.currentTarget.style.boxShadow = 'var(--ombre-md)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gris-bord)';  e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ardoise)' }}>{dep}</span>
                  <svg width="20" height="10" viewBox="0 0 20 10"><path d="M0 5h16M12 1l4 4-4 4" stroke="var(--vert-clair)" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ardoise)' }}>{arr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--vert-foret)', fontSize: '1.05rem' }}>
                    {prix.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span style={{ color: 'var(--gris-doux)', fontSize: '0.8rem' }}>~{duree}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ---- Sous-composants locaux ----
const labelStyle = {
  display    : 'flex',
  alignItems : 'center',
  gap        : '0.3rem',
  fontSize   : '0.78rem',
  fontWeight : 600,
  color      : 'var(--gris-doux)',
  fontFamily : 'var(--font-display)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const inputStyle = {
  width       : '100%',
  padding     : '0.6rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border      : '1.5px solid var(--gris-bord)',
  fontSize    : '0.95rem',
  color       : 'var(--ardoise)',
  background  : 'var(--creme)',
  outline     : 'none',
  transition  : 'border-color var(--transition)',
}

const ChampSelect = ({ label, name, value, onChange, placeholder, icone }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label style={labelStyle}>{icone}{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2rem' }}
    >
      <option value="">{placeholder}</option>
      {VILLES.map(v => <option key={v.valeur} value={v.valeur}>{v.label}</option>)}
    </select>
  </div>
)

const IconeDepart  = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="6" r="3"/><path d="M8 1v2M8 9v6M5 15h6"/></svg>
const IconeArrivee = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 1l6 8H2z"/><path d="M8 15V9"/></svg>

export default Accueil