
// ============================================================
//
// MODIFICATIONS :
//   - Utilise destinations.js (toutes les villes camerounaises)
//   - Select groupé par région
//   - Lignes populaires depuis LIGNES_POPULAIRES
//   - Intégration PageWrapper pour le Footer
//
// INTERACTIONS :
//   → Utilise : utils/destinations.js
//   → Navigate vers : /voyages avec les critères de recherche
//   → Enveloppe dans : PageWrapper.jsx
// ============================================================

import { useState }                        from 'react'
import { useNavigate }                     from 'react-router-dom'
import PageWrapper                         from '../components/layout/PageWrapper'
import Button                              from '../components/ui/Button'
import {
  LIGNES_POPULAIRES,
  villesParRegion,
  villeLabel,
}                                          from '../utils/destinations'
import { formaterPrix }                    from '../utils/formatPrix'

// ── Motif Kente SVG (signature visuelle) ─────────────────────
const MotifKente = () => (
  <svg
    width="100%" height="100%"
    viewBox="0 0 80 80"
    preserveAspectRatio="xMidYMid slice"
    style={{ position: 'absolute', inset: 0, opacity: 0.06 }}
    aria-hidden="true"
  >
    <defs>
      <pattern id="kente" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <polygon points="20,2 38,20 20,38 2,20"  fill="none" stroke="#F4A100" strokeWidth="1.5"/>
        <polygon points="20,8 32,20 20,32 8,20"  fill="none" stroke="#ffffff" strokeWidth="0.8"/>
        <rect    x="18" y="18" width="4" height="4" fill="#F4A100" opacity="0.5"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#kente)"/>
  </svg>
)

// ── Select groupé par région ──────────────────────────────────
const SelectVille = ({ label, name, value, onChange, placeholder, icone }) => {
  const groupes = villesParRegion()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{
        display      : 'flex',
        alignItems   : 'center',
        gap          : '0.3rem',
        fontSize     : '0.78rem',
        fontWeight   : 600,
        color        : 'var(--gris-doux)',
        fontFamily   : 'var(--font-display)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {icone} {label}
      </label>
      <select
        name    ={name}
        value   ={value}
        onChange={onChange}
        style={{
          width          : '100%',
          padding        : '0.65rem 2rem 0.65rem 0.75rem',
          borderRadius   : 'var(--radius-sm)',
          border         : '1.5px solid var(--gris-bord)',
          fontSize       : '0.92rem',
          color          : value ? 'var(--ardoise)' : 'var(--gris-doux)',
          background     : 'var(--creme)',
          outline        : 'none',
          appearance     : 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat  : 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          fontFamily        : 'var(--font-body)',
          transition        : 'border-color var(--transition)',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--vert-clair)'}
        onBlur ={e => e.target.style.borderColor = 'var(--gris-bord)'}
      >
        <option value="">{placeholder}</option>
        {/* Groupement par région pour une meilleure navigation */}
        {Object.entries(groupes).map(([region, villes]) => (
          <optgroup key={region} label={`— ${region} —`}>
            {villes.map(v => (
              <option key={v.valeur} value={v.valeur}>
                {v.emoji} {v.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

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
      setErreur('Choisissez une ville de départ et une ville d\'arrivée.')
      return
    }
    if (form.ville_depart === form.ville_arrivee) {
      setErreur('La ville de départ et d\'arrivée doivent être différentes.')
      return
    }
    navigate('/voyages', { state: form })
  }

  const handleEchange = () => {
    setForm(prev => ({
      ...prev,
      ville_depart  : prev.ville_arrivee,
      ville_arrivee : prev.ville_depart,
    }))
  }

  const handleLignePopulaire = (ligne) => {
    navigate('/voyages', {
      state: {
        ville_depart  : ligne.dep,
        ville_arrivee : ligne.arr,
        date          : today,
      }
    })
  }

  return (
    <PageWrapper titre="BusCam — Réservez votre bus au Cameroun">

      {/* ====== HERO ====== */}
      <section style={{
        position: 'relative',
        background: 'var(--vert-foret)',
        padding : 'clamp(3rem, 8vw, 5rem) 0 0',
        overflow: 'hidden',
      }}>
        <MotifKente />

        <div className="conteneur" style={{ position: 'relative', zIndex: 1 }}>

          {/* Titre principal */}
          <div style={{ maxWidth: '620px', marginBottom: '2.5rem' }}>
            <p style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 600,
              fontSize     : '0.82rem',
              color        : 'var(--or-soleil)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom : '0.75rem',
            }}>
              🇨🇲 Réservation de bus interurbains — Cameroun & Sous-région
            </p>
            <h1 style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 800,
              fontSize     : 'clamp(1.9rem, 5vw, 3.1rem)',
              color        : 'var(--blanc)',
              lineHeight   : 1.15,
              letterSpacing: '-0.03em',
              marginBottom : '1rem',
            }}>
              Votre siège,{' '}
              <span style={{ color: 'var(--or-soleil)' }}>garanti</span>{' '}
              avant d'arriver à la gare.
            </h1>
            <p style={{
              color    : 'rgba(255,255,255,0.7)',
              fontSize : '1rem',
              maxWidth : '500px',
              lineHeight: 1.7,
            }}>
              Réservez sur 10+ agences partenaires. 40+ villes desservies.
              Payez par Orange Money ou MTN MoMo.
            </p>
          </div>

          {/* ====== FORMULAIRE DE RECHERCHE ====== */}
          <div style={{
            background  : 'var(--blanc)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding     : 'clamp(1.5rem, 4vw, 2rem)',
            boxShadow   : '0 -4px 40px rgba(0,0,0,0.15)',
          }}>
            <form onSubmit={handleRecherche}>
              <div
                className="form-recherche-grid"
                style={{
                  display             : 'grid',
                  gridTemplateColumns : '1fr auto 1fr 1fr auto',
                  gap                 : '0.75rem',
                  alignItems          : 'end',
                }}
              >
                {/* Départ */}
                <SelectVille
                  label="Départ"
                  name="ville_depart"
                  value={form.ville_depart}
                  onChange={handleChange}
                  placeholder="D'où partez-vous ?"
                  icone="🚏"
                />

                {/* Bouton échange */}
                <button
                  type="button"
                  onClick={handleEchange}
                  title="Inverser les villes"
                  style={{
                    width         : '40px',
                    height        : '40px',
                    borderRadius  : '50%',
                    border        : '2px solid var(--gris-bord)',
                    background    : 'var(--creme)',
                    display       : 'flex',
                    alignItems    : 'center',
                    justifyContent: 'center',
                    flexShrink    : 0,
                    alignSelf     : 'end',
                    marginBottom  : '2px',
                    cursor        : 'pointer',
                    transition    : 'all var(--transition)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--vert-clair)'
                    e.currentTarget.style.background  = 'var(--vert-pale)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--gris-bord)'
                    e.currentTarget.style.background  = 'var(--creme)'
                  }}
                >
                  ⇄
                </button>

                {/* Arrivée */}
                <SelectVille
                  label="Arrivée"
                  name="ville_arrivee"
                  value={form.ville_arrivee}
                  onChange={handleChange}
                  placeholder="Où allez-vous ?"
                  icone="📍"
                />

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{
                    fontSize     : '0.78rem',
                    fontWeight   : 600,
                    color        : 'var(--gris-doux)',
                    fontFamily   : 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    📅 Date de voyage
                  </label>
                  <input
                    type    ="date"
                    name    ="date"
                    value   ={form.date}
                    min     ={today}
                    onChange={handleChange}
                    style={{
                      padding     : '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border      : '1.5px solid var(--gris-bord)',
                      fontSize    : '0.92rem',
                      color       : 'var(--ardoise)',
                      background  : 'var(--creme)',
                      outline     : 'none',
                      fontFamily  : 'var(--font-body)',
                      transition  : 'border-color var(--transition)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--vert-clair)'}
                    onBlur ={e => e.target.style.borderColor = 'var(--gris-bord)'}
                  />
                </div>

                {/* Bouton recherche */}
                <Button
                  type="submit"
                  variante="or"
                  taille="lg"
                  style={{ alignSelf: 'end' }}
                >
                  🔍 Rechercher
                </Button>
              </div>

              {erreur && (
                <p style={{
                  color    : 'var(--rouge-erreur)',
                  fontSize : '0.82rem',
                  marginTop: '0.75rem',
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
      <section style={{
        background  : 'var(--blanc)',
        padding     : '2.5rem 0',
        borderBottom: '1px solid var(--gris-bord)',
      }}>
        <div className="conteneur">
          <div style={{
            display             : 'grid',
            gridTemplateColumns : 'repeat(4, 1fr)',
            gap                 : '1.5rem',
            textAlign           : 'center',
          }} className="stats-grid">
            {[
              { chiffre: '10+',   label: 'Agences partenaires' },
              { chiffre: '40+',   label: 'Villes desservies'   },
              { chiffre: '200+',  label: 'Départs par jour'    },
              { chiffre: '50k+',  label: 'Voyageurs satisfaits'},
            ].map(({ chiffre, label }) => (
              <div key={label}>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize  : 'clamp(1.5rem, 4vw, 2.25rem)',
                  color     : 'var(--vert-foret)',
                }}>
                  {chiffre}
                </p>
                <p style={{
                  color    : 'var(--gris-doux)',
                  fontSize : '0.82rem',
                  marginTop: '0.25rem',
                }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </section>

      {/* ====== LIGNES POPULAIRES ====== */}
      <section style={{ padding: '3.5rem 0' }}>
        <div className="conteneur">
          <h2 style={{
            fontFamily  : 'var(--font-display)',
            fontWeight  : 700,
            fontSize    : '1.5rem',
            color       : 'var(--ardoise)',
            marginBottom: '0.4rem',
          }}>
            Lignes populaires
          </h2>
          <p style={{ color: 'var(--gris-doux)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
            Les trajets les plus empruntés cette semaine au Cameroun
          </p>

          <div style={{
            display             : 'grid',
            gridTemplateColumns : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap                 : '1rem',
          }}>
            {LIGNES_POPULAIRES.map(ligne => (
              <button
                key={`${ligne.dep}-${ligne.arr}`}
                onClick={() => handleLignePopulaire(ligne)}
                style={{
                  background  : 'var(--blanc)',
                  border      : '1.5px solid var(--gris-bord)',
                  borderRadius: 'var(--radius-md)',
                  padding     : '1.25rem',
                  textAlign   : 'left',
                  cursor      : 'pointer',
                  transition  : 'all var(--transition)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--vert-clair)'
                  e.currentTarget.style.boxShadow   = 'var(--ombre-md)'
                  e.currentTarget.style.transform   = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--gris-bord)'
                  e.currentTarget.style.boxShadow   = 'none'
                  e.currentTarget.style.transform   = 'none'
                }}
              >
                {/* Trajet */}
                <div style={{
                  display    : 'flex',
                  alignItems : 'center',
                  gap        : '0.5rem',
                  marginBottom: '0.75rem',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color     : 'var(--ardoise)',
                    fontSize  : '0.95rem',
                  }}>
                    {villeLabel(ligne.dep)}
                  </span>
                  <span style={{ color: 'var(--vert-clair)', fontSize: '1rem' }}>→</span>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color     : 'var(--ardoise)',
                    fontSize  : '0.95rem',
                  }}>
                    {villeLabel(ligne.arr)}
                  </span>
                </div>

                {/* Infos */}
                <div style={{
                  display       : 'flex',
                  justifyContent: 'space-between',
                  alignItems    : 'center',
                }}>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color     : 'var(--vert-foret)',
                      fontSize  : '1.05rem',
                    }}>
                      {formaterPrix(ligne.prix)}
                    </p>
                    <p style={{
                      color    : 'var(--gris-doux)',
                      fontSize : '0.72rem',
                      marginTop: '2px',
                    }}>
                      {ligne.frequence}
                    </p>
                  </div>
                  <span style={{
                    background  : 'var(--vert-pale)',
                    color       : 'var(--vert-foret)',
                    padding     : '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize    : '0.75rem',
                    fontFamily  : 'var(--font-display)',
                    fontWeight  : 600,
                  }}>
                    ~{ligne.duree}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SECTION PAIEMENT ====== */}
      <section style={{
        background: 'linear-gradient(135deg, var(--vert-foret) 0%, #2D6A4F 100%)',
        padding   : '3rem 0',
        color     : 'var(--blanc)',
      }}>
        <div className="conteneur" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily  : 'var(--font-display)',
            fontWeight  : 700,
            fontSize    : '1.4rem',
            marginBottom: '0.5rem',
          }}>
            Payez comme vous voulez 📱
          </h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '2rem' }}>
            Tous les modes de paiement mobile money acceptés
          </p>
          <div style={{
            display        : 'flex',
            justifyContent : 'center',
            gap            : '1rem',
            flexWrap       : 'wrap',
          }}>
            {[
              { label: 'MTN Mobile Money', emoji: '💛', bg: '#FFCC00', color: '#1a1a1a' },
              { label: 'Orange Money',     emoji: '🧡', bg: '#FF6600', color: '#ffffff' },
              { label: 'Paiement Cash',    emoji: '💵', bg: 'rgba(255,255,255,0.15)', color: '#ffffff' },
            ].map(({ label, emoji, bg, color }) => (
              <div key={label} style={{
                background  : bg,
                color,
                padding     : '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontFamily  : 'var(--font-display)',
                fontWeight  : 700,
                fontSize    : '0.9rem',
                display     : 'flex',
                alignItems  : 'center',
                gap         : '0.5rem',
              }}>
                {emoji} {label}
              </div>
            ))}
          </div>
        </div>
      </section>

    </PageWrapper>
  )
}

export default Accueil