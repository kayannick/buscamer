// ============================================================
//
// RÔLE : Pied de page global.
//        Contexte camerounais : liens utiles, contacts,
//        villes desservies, mentions légales.
//
// INTERACTIONS :
//   ← Utilisé par : components/layout/PageWrapper.jsx
//   → Utilise : react-router-dom (Link)
// ============================================================

import { Link } from 'react-router-dom'

// Villes desservies par BusCam (contexte camerounais)
const VILLES_DESSERVIES = [
  'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda',
  'Garoua', 'Maroua', 'Bertoua', 'Buea',
  'Limbé', 'Ébolowa', 'Ngaoundéré', 'Kumba',
]

// Agences partenaires
const AGENCES = [
  'Vatican Express', 'Touristique Express', 'Buca Voyages',
  'General Express', 'Mimboman Voyages', 'Finexs',
  'Trans Gala', 'Avenir Voyages',
]

const Footer = () => {
  const annee = new Date().getFullYear()

  return (
    <footer style={{
      background : 'var(--ardoise)',
      color      : 'rgba(255,255,255,0.7)',
      marginTop  : 'auto',  // pousse le footer vers le bas (avec PageWrapper flex)
    }}>

      {/* ── Section principale ── */}
      <div className="conteneur" style={{ padding: '3rem 1.5rem 2rem' }}>
        <div style={{
          display             : 'grid',
          gridTemplateColumns : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap                 : '2.5rem',
          marginBottom        : '2.5rem',
        }}>

          {/* Colonne 1 : Logo + description */}
          <div>
            <div style={{
              display    : 'flex',
              alignItems : 'center',
              gap        : '0.5rem',
              marginBottom: '1rem',
            }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--or-soleil)"/>
                <path d="M6 22 L10 12 L22 12 L26 22 Z" fill="var(--vert-foret)"/>
                <rect x="8"  y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
                <rect x="20" y="20" width="4" height="4" rx="2" fill="var(--or-soleil)"/>
              </svg>
              <span style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 800,
                fontSize     : '1.2rem',
                color        : 'var(--blanc)',
                letterSpacing: '-0.02em',
              }}>
                Bus<span style={{ color: 'var(--or-soleil)' }}>Cam</span>
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1rem' }}>
              La plateforme de référence pour la réservation de bus
              interurbains au Cameroun. Voyagez serein, votre siège est garanti.
            </p>

            {/* Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { icone: '📞', texte: '+237 6 99 00 00 00' },
                { icone: '📧', texte: 'support@buscam.cm' },
                { icone: '📍', texte: 'Yaoundé, Cameroun' },
              ].map(({ icone, texte }) => (
                <p key={texte} style={{ fontSize: '0.82rem', display: 'flex', gap: '0.5rem' }}>
                  <span>{icone}</span>
                  <span>{texte}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Colonne 2 : Navigation */}
          <div>
            <h3 style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 700,
              fontSize     : '0.85rem',
              color        : 'var(--blanc)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom : '1rem',
            }}>
              Navigation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { to: '/',           label: 'Accueil'            },
                { to: '/voyages',    label: 'Rechercher un voyage'},
                { to: '/connexion',  label: 'Se connecter'       },
                { to: '/inscription',label: 'Créer un compte'    },
                { to: '/profil',     label: 'Mes billets'        },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  style={{
                    color         : 'rgba(255,255,255,0.6)',
                    fontSize      : '0.85rem',
                    fontFamily    : 'var(--font-display)',
                    textDecoration: 'none',
                    transition    : 'color var(--transition)',
                  }}
                  onMouseEnter={e => e.target.style.color = 'var(--or-soleil)'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Colonne 3 : Villes desservies */}
          <div>
            <h3 style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 700,
              fontSize     : '0.85rem',
              color        : 'var(--blanc)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom : '1rem',
            }}>
              Villes desservies
            </h3>
            <div style={{
              display             : 'grid',
              gridTemplateColumns : '1fr 1fr',
              gap                 : '0.4rem',
            }}>
              {VILLES_DESSERVIES.map(ville => (
                <span key={ville} style={{
                  fontSize  : '0.8rem',
                  color     : 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {ville}
                </span>
              ))}
            </div>
          </div>

          {/* Colonne 4 : Agences partenaires */}
          <div>
            <h3 style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 700,
              fontSize     : '0.85rem',
              color        : 'var(--blanc)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom : '1rem',
            }}>
              Agences partenaires
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {AGENCES.map(agence => (
                <span key={agence} style={{
                  fontSize  : '0.8rem',
                  color     : 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {agence}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Méthodes de paiement ── */}
        <div style={{
          borderTop  : '1px solid rgba(255,255,255,0.08)',
          paddingTop : '1.5rem',
          marginBottom: '1.5rem',
          display    : 'flex',
          alignItems : 'center',
          gap        : '1rem',
          flexWrap   : 'wrap',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)' }}>
            Paiements acceptés :
          </span>
          {[
            { label: 'MTN MoMo',     bg: '#FFCC00', color: '#000' },
            { label: 'Orange Money', bg: '#FF6600', color: '#fff' },
            { label: 'Cash',         bg: '#374151', color: '#fff' },
          ].map(({ label, bg, color }) => (
            <span key={label} style={{
              background  : bg,
              color,
              padding     : '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize    : '0.72rem',
              fontFamily  : 'var(--font-display)',
              fontWeight  : 700,
            }}>
              {label}
            </span>
          ))}
        </div>

        {/* ── Bas de page ── */}
        <div style={{
          borderTop  : '1px solid rgba(255,255,255,0.08)',
          paddingTop : '1rem',
          display    : 'flex',
          justifyContent: 'space-between',
          alignItems : 'center',
          flexWrap   : 'wrap',
          gap        : '0.5rem',
        }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
            © {annee} BusCam. Tous droits réservés. Made in 🇨🇲 Cameroun.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['Confidentialité', 'CGU', 'Contact'].map(item => (
              <span key={item} style={{
                fontSize  : '0.75rem',
                color     : 'rgba(255,255,255,0.35)',
                fontFamily: 'var(--font-display)',
                cursor    : 'pointer',
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer