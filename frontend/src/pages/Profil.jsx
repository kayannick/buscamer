// ============================================================

// ============================================================

import { useState, useEffect }                    from 'react'
import { useLocation }                            from 'react-router-dom'
import { useQuery }                               from '@tanstack/react-query'
import { getMesReservations }                     from '../services/reservationService'
import { formaterDateVoyage }                     from '../utils/formatDate'
import { formaterPrix }                           from '../utils/formatPrix'
import useAuth                                    from '../hooks/useAuth'
import Badge                                      from '../components/ui/Badge'

const Profil = () => {
  const { utilisateur }  = useAuth()
  const location         = useLocation()

  const [toastVisible, setToastVisible] = useState(
    location.state?.nouveauBillet ?? false
  )

  // Auto-masquer le toast après 4 secondes
  useEffect(() => {
    if (!toastVisible) return
    const timer = setTimeout(() => setToastVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [toastVisible])

  const {
    data     : reservations = [],
    isLoading: chargement,
    isError  : estErreur,
  } = useQuery({
    queryKey : ['mes-reservations'],
    queryFn  : getMesReservations,
  })

  return (
    <div style={{ minHeight: '80vh', background: 'var(--creme)', paddingBottom: '3rem' }}>

      {/* ====== TOAST DE SUCCÈS ====== */}
      {toastVisible && (
        <>
          <div style={{
            position     : 'fixed',
            bottom       : '2rem',
            left         : '50%',
            transform    : 'translateX(-50%)',
            background   : 'var(--vert-foret)',
            color        : 'var(--blanc)',
            padding      : '1rem 1.75rem',
            borderRadius : 'var(--radius-md)',
            boxShadow    : 'var(--ombre-lg)',
            fontFamily   : 'var(--font-display)',
            fontWeight   : 600,
            fontSize     : '0.9rem',
            zIndex       : 999,
            display      : 'flex',
            alignItems   : 'center',
            gap          : '0.6rem',
            animation    : 'slideUp 0.3s ease',
            whiteSpace   : 'nowrap',
          }}>
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            Réservation confirmée ! Votre billet est prêt.
            <button
              onClick={() => setToastVisible(false)}
              style={{
                background : 'none',
                border     : 'none',
                color      : 'rgba(255,255,255,0.7)',
                cursor     : 'pointer',
                padding    : '0 0.25rem',
                fontSize   : '1rem',
                lineHeight : 1,
                marginLeft : '0.25rem',
              }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateX(-50%) translateY(12px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </>
      )}

      {/* ====== EN-TÊTE PROFIL ====== */}
      <div style={{
        background   : 'var(--vert-foret)',
        padding      : '2.5rem 0',
      }}>
        <div className="conteneur">
          <div style={{
            display    : 'flex',
            alignItems : 'center',
            gap        : '1.5rem',
            flexWrap   : 'wrap',
          }}>
            {/* Avatar initiales */}
            <div style={{
              width          : '72px',
              height         : '72px',
              borderRadius   : '50%',
              background     : 'var(--or-soleil)',
              display        : 'flex',
              alignItems     : 'center',
              justifyContent : 'center',
              fontFamily     : 'var(--font-display)',
              fontWeight     : 800,
              fontSize       : '1.75rem',
              color          : 'var(--vert-foret)',
              flexShrink     : 0,
              border         : '3px solid rgba(255,255,255,0.2)',
            }}>
              {(
                utilisateur?.first_name?.[0] ||
                utilisateur?.username?.[0]   ||
                '?'
              ).toUpperCase()}
            </div>

            {/* Infos utilisateur */}
            <div>
              <h1 style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 700,
                fontSize     : '1.4rem',
                color        : 'var(--blanc)',
                marginBottom : '0.3rem',
              }}>
                {utilisateur?.first_name
                  ? `${utilisateur.first_name} ${utilisateur.last_name}`
                  : utilisateur?.username}
              </h1>
              <p style={{
                color    : 'rgba(255,255,255,0.65)',
                fontSize : '0.875rem',
              }}>
                {utilisateur?.telephone}
                {utilisateur?.email && ` · ${utilisateur.email}`}
              </p>
              {/* Compteur de réservations */}
              {!chargement && (
                <p style={{
                  marginTop  : '0.5rem',
                  fontSize   : '0.82rem',
                  color      : 'rgba(255,255,255,0.5)',
                  fontFamily : 'var(--font-display)',
                }}>
                  {reservations.length} réservation
                  {reservations.length !== 1 ? 's' : ''} au total
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== CONTENU PRINCIPAL ====== */}
      <div className="conteneur" style={{ paddingTop: '2rem' }}>

        <h2 style={{
          fontFamily   : 'var(--font-display)',
          fontWeight   : 700,
          fontSize     : '1.25rem',
          color        : 'var(--ardoise)',
          marginBottom : '1.25rem',
        }}>
          Mes billets
        </h2>

        {/* ── État : chargement ── */}
        {chargement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height         : '120px',
                  borderRadius   : 'var(--radius-md)',
                  background     : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                  backgroundSize : '200% 100%',
                  animation      : 'shimmer 1.4s infinite',
                }}
              />
            ))}
            <style>{`
              @keyframes shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        )}

        {/* ── État : erreur ── */}
        {estErreur && !chargement && (
          <div style={{
            background   : '#FEF2F2',
            border       : '1.5px solid #FECACA',
            borderRadius : 'var(--radius-md)',
            padding      : '1.5rem',
            textAlign    : 'center',
            color        : 'var(--rouge-erreur)',
            fontFamily   : 'var(--font-display)',
            fontWeight   : 600,
          }}>
            Impossible de charger vos réservations. Réessayez plus tard.
          </div>
        )}

        {/* ── État : aucun billet ── */}
        {!chargement && !estErreur && reservations.length === 0 && (
          <div style={{
            textAlign    : 'center',
            padding      : '3.5rem 2rem',
            background   : 'var(--blanc)',
            borderRadius : 'var(--radius-lg)',
            border       : '1.5px dashed var(--gris-bord)',
          }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</p>
            <p style={{
              fontFamily   : 'var(--font-display)',
              fontWeight   : 700,
              fontSize     : '1.1rem',
              color        : 'var(--ardoise)',
              marginBottom : '0.5rem',
            }}>
              Vous n'avez pas encore de billet
            </p>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem' }}>
              Recherchez un voyage depuis la page d'accueil.
            </p>
          </div>
        )}

        {/* ── Liste des billets ── */}
        {!chargement && !estErreur && reservations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reservations.map(r => (
              <CarteBillet key={r.id} reservation={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CarteBillet — Affiche UNE réservation
// ============================================================
const CarteBillet = ({ reservation: r }) => {
  const couleurBande =
    r.statut_paiement === 'CONFIRME'   ? 'var(--vert-clair)'
    : r.statut_paiement === 'ANNULE'   ? 'var(--rouge-erreur)'
    : 'var(--or-soleil)'

  return (
    <article style={{
      background           : 'var(--blanc)',
      borderRadius         : 'var(--radius-md)',
      border               : '1.5px solid var(--gris-bord)',
      overflow             : 'hidden',
      display              : 'grid',
      gridTemplateColumns  : '5px 1fr',
      boxShadow            : 'var(--ombre-sm)',
      transition           : 'box-shadow var(--transition)',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--ombre-md)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--ombre-sm)' }}
    >
      {/* Bande colorée gauche selon statut */}
      <div style={{ background: couleurBande }} />

      {/* Contenu du billet */}
      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Ligne 1 : trajet + badge statut */}
        <div style={{
          display        : 'flex',
          justifyContent : 'space-between',
          alignItems     : 'flex-start',
          marginBottom   : '0.75rem',
          flexWrap       : 'wrap',
          gap            : '0.5rem',
        }}>
          <div>
            {/* Trajet */}
            <div style={{
              display    : 'flex',
              alignItems : 'center',
              gap        : '0.5rem',
              marginBottom: '0.25rem',
            }}>
              <span style={{
                fontFamily : 'var(--font-display)',
                fontWeight : 700,
                fontSize   : '1rem',
                color      : 'var(--ardoise)',
              }}>
                {r.voyage?.ville_depart_display ?? '—'}
              </span>

              {/* Flèche trajet */}
              <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
                <path
                  d="M0 5h18M14 1l5 4-5 4"
                  stroke="var(--vert-clair)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <span style={{
                fontFamily : 'var(--font-display)',
                fontWeight : 700,
                fontSize   : '1rem',
                color      : 'var(--ardoise)',
              }}>
                {r.voyage?.ville_arrivee_display ?? '—'}
              </span>
            </div>

            {/* Agence + date */}
            <p style={{
              fontSize : '0.82rem',
              color    : 'var(--gris-doux)',
              lineHeight: 1.4,
            }}>
              {r.voyage?.agence_nom ?? '—'}
              {r.voyage?.date_heure_depart
                ? ` · ${formaterDateVoyage(r.voyage.date_heure_depart)}`
                : ''}
            </p>
          </div>

          <Badge statut={r.statut_paiement} />
        </div>

        {/* Ligne 2 : siège, montant, numéro billet */}
        <div style={{
          display        : 'flex',
          justifyContent : 'space-between',
          alignItems     : 'flex-end',
          flexWrap       : 'wrap',
          gap            : '0.75rem',
          paddingTop     : '0.75rem',
          borderTop      : '1px dashed var(--gris-bord)',
        }}>
          {/* Siège + montant */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <InfoBillet label="Siège">
              <span style={{
                fontFamily : 'var(--font-mono)',
                fontWeight : 700,
                fontSize   : '1.15rem',
                color      : 'var(--ardoise)',
              }}>
                N°{r.numero_siege}
              </span>
            </InfoBillet>

            <InfoBillet label="Montant payé">
              <span style={{
                fontFamily : 'var(--font-mono)',
                fontWeight : 700,
                fontSize   : '1.15rem',
                color      : 'var(--vert-foret)',
              }}>
                {formaterPrix(r.montant_paye)}
              </span>
            </InfoBillet>
          </div>

          {/* Numéro de billet tronqué */}
          <InfoBillet label="N° Billet" aligne="droite">
            <span style={{
              fontFamily    : 'var(--font-mono)',
              fontSize      : '0.72rem',
              color         : 'var(--gris-doux)',
              letterSpacing : '0.04em',
              wordBreak     : 'break-all',
            }}>
              {String(r.numero_billet).substring(0, 18).toUpperCase()}…
            </span>
          </InfoBillet>
        </div>
      </div>
    </article>
  )
}

// Sous-composant : étiquette + valeur
const InfoBillet = ({ label, children, aligne = 'gauche' }) => (
  <div style={{ textAlign: aligne === 'droite' ? 'right' : 'left' }}>
    <p style={{
      fontSize      : '0.68rem',
      color         : 'var(--gris-doux)',
      fontFamily    : 'var(--font-display)',
      fontWeight    : 600,
      textTransform : 'uppercase',
      letterSpacing : '0.06em',
      marginBottom  : '0.2rem',
    }}>
      {label}
    </p>
    {children}
  </div>
)

export default Profil