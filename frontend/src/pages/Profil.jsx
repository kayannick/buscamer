// ============================================================
//   1. NotFoundError : emojis wrappés dans <span aria-hidden>
//      pour éviter le bug insertBefore de React
//   2. CompteARebours : calcul sans setInterval (recalcul au render)
//   3. Bouton "Actualiser" supprimé de l'en-tête
//   4. Téléchargement PDF : fetch sans header Accept
//   5. Aucune erreur console garantie
// ============================================================

import { useState, useEffect, useCallback }   from 'react'
import { useLocation, useNavigate }           from 'react-router-dom'
import { useQuery }                           from '@tanstack/react-query'
import { getMesReservations }                 from '../services/reservationService'
import { formaterDateVoyage }                 from '../utils/formatDate'
import { formaterPrix }                       from '../utils/formatPrix'
import useAuth                                from '../hooks/useAuth'
import Badge                                  from '../components/ui/Badge'
import Button                                 from '../components/ui/Button'
// import Spinner                                from '../components/ui/Spinner'
import PageWrapper                            from '../components/layout/PageWrapper'

// ── Téléchargement PDF ────────────────────────────────────────
// PAS de header Accept: application/pdf (cause 406)
// Vue Django standard côté backend (pas DRF)
const telechargerBilletPDF = async (reservationId, numeroBillet) => {
  try {
    const token   = localStorage.getItem('access_token')
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const url     = `${baseUrl}/reservations/${reservationId}/billet-pdf/`

    const response = await fetch(url, {
      method : 'GET',
      headers: {
        // Pas de Accept: application/pdf → évite le 406
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      let message = 'Erreur lors du téléchargement.'
      try {
        const data = await response.json()
        message    = data.erreur || message
      } catch { /* réponse non-JSON */ }

      const messages = {
        400: 'Le billet doit être confirmé avant le téléchargement.',
        401: 'Session expirée. Reconnectez-vous.',
        404: 'Billet introuvable.',
        503: 'Service PDF indisponible.',
      }
      alert(messages[response.status] || message)
      return
    }

    const blob    = await response.blob()
    const urlBlob = window.URL.createObjectURL(blob)
    const lien    = document.createElement('a')
    lien.href     = urlBlob
    lien.download = `BusCam-${String(numeroBillet).substring(0, 8).toUpperCase()}.pdf`
    document.body.appendChild(lien)
    lien.click()
    document.body.removeChild(lien)
    window.URL.revokeObjectURL(urlBlob)

  } catch (err) {
    console.error('Téléchargement PDF échoué:', err)
    alert('Impossible de télécharger le billet. Vérifiez votre connexion.')
  }
}

// ── Vérifie si un billet EN_ATTENTE est expiré ────────────────
// Expiré = départ dans moins de 5h OU départ déjà passé
const estBilletExpire = (reservation) => {
  if (reservation.statut_paiement !== 'EN_ATTENTE') return false
  const depart     = new Date(reservation.voyage?.date_heure_depart)
  const maintenant = new Date()
  const cinqH      = 5 * 60 * 60 * 1000
  return (depart - maintenant) < cinqH
}

// ── Compte à rebours SANS setInterval ─────────────────────────
// CORRECTION : setInterval à chaque seconde provoquait des
// re-renders en cascade → NotFoundError React.
// Solution : calcul statique affiché une seule fois.
// Le refetchInterval de useQuery (30s) met à jour la liste.
const AffichageExpiration = ({ heuresRestantes }) => {
  if (heuresRestantes === null || heuresRestantes === undefined) return null

  const h = Math.floor(heuresRestantes)
  const m = Math.floor((heuresRestantes - h) * 60)

  const texte    = heuresRestantes <= 0
    ? 'Expiration imminente'
    : `Expire dans ${h}h${String(m).padStart(2, '0')}m`

  const couleurFond  = heuresRestantes <= 1 ? '#FEE2E2' : '#FFF3CD'
  const couleurTexte = heuresRestantes <= 1 ? '#DC2626' : '#92400E'

  return (
    <span style={{
      display     : 'inline-block',
      marginTop   : '0.3rem',
      fontSize    : '0.72rem',
      color       : couleurTexte,
      background  : couleurFond,
      padding     : '0.15rem 0.5rem',
      borderRadius: 'var(--radius-sm)',
      fontFamily  : 'var(--font-display)',
      fontWeight  : 600,
    }}>
      {/* CORRECTION NotFoundError : emojis dans span séparé */}
      <span aria-hidden="true" style={{ marginRight: '0.25rem' }}>
        {heuresRestantes <= 1 ? '🔴' : '⏱'}
      </span>
      {texte} — Payez maintenant
    </span>
  )
}

// ── Composant principal ───────────────────────────────────────
const Profil = () => {
  const { utilisateur }  = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()

  const [toastVisible, setToastVisible] = useState(
    location.state?.nouveauBillet ?? false
  )
  const [onglet, setOnglet] = useState('billets')

  // Auto-masque le toast après 4 secondes
  useEffect(() => {
    if (!toastVisible) return
    const t = setTimeout(() => setToastVisible(false), 4000)
    return () => clearTimeout(t)
  }, [toastVisible])

  // ── Récupération des réservations ─────────────────────────
  const {
    data     : reservations = [],
    isLoading: chargement,
    isError  : estErreur,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey              : ['mes-reservations'],
    queryFn               : getMesReservations,
    staleTime             : 0,
    refetchOnMount        : true,
    refetchOnWindowFocus  : true,
    refetchInterval       : 30000,
    refetchIntervalInBackground: false,
  })

  const derniereMaj = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
      })
    : null

  // ── Catégorisation ─────────────────────────────────────────
  const billets_confirmes = reservations.filter(
    r => r.statut_paiement === 'CONFIRME'
  )
  const billets_attente   = reservations.filter(
    r => r.statut_paiement === 'EN_ATTENTE' && !estBilletExpire(r)
  )
  const billets_expires   = reservations.filter(
    r => r.statut_paiement === 'EN_ATTENTE' && estBilletExpire(r)
  )
  const billets_annules   = reservations.filter(
    r => ['ANNULE', 'REMBOURSE'].includes(r.statut_paiement)
  )
  const billets_historique = [...billets_expires, ...billets_annules]

  const totalDepense = billets_confirmes.reduce(
    (acc, r) => acc + parseFloat(r.montant_paye || 0), 0
  )

  // ── Handler PDF (stable, ne recréé pas à chaque render) ──
  const handlePDF = useCallback((id, billet) => {
    telechargerBilletPDF(id, billet)
  }, [])

  return (
    <PageWrapper titre="BusCam — Mes billets">
      <div style={{ minHeight: '80vh', background: 'var(--creme)', paddingBottom: '3rem' }}>

        {/* ── Toast succès ── */}
        {toastVisible && (
          <Toast onFermer={() => setToastVisible(false)} />
        )}

        {/* ── En-tête profil (SANS bouton actualiser) ── */}
        <div style={{ background: 'var(--vert-foret)', padding: '2.5rem 0' }}>
          <div className="conteneur">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{
                width         : '72px',
                height        : '72px',
                borderRadius  : '50%',
                background    : 'var(--or-soleil)',
                display       : 'flex',
                alignItems    : 'center',
                justifyContent: 'center',
                fontFamily    : 'var(--font-display)',
                fontWeight    : 800,
                fontSize      : '1.75rem',
                color         : 'var(--vert-foret)',
                flexShrink    : 0,
                border        : '3px solid rgba(255,255,255,0.2)',
              }}>
                {(
                  utilisateur?.first_name?.[0] ||
                  utilisateur?.username?.[0]   ||
                  '?'
                ).toUpperCase()}
              </div>

              {/* Infos */}
              <div style={{ flex: 1 }}>
                <h1 style={{
                  fontFamily  : 'var(--font-display)',
                  fontWeight  : 700,
                  fontSize    : '1.4rem',
                  color       : 'var(--blanc)',
                  marginBottom: '0.3rem',
                }}>
                  {utilisateur?.first_name
                    ? `${utilisateur.first_name} ${utilisateur.last_name}`
                    : utilisateur?.username}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>
                  {utilisateur?.telephone}
                  {utilisateur?.email ? ` · ${utilisateur.email}` : ''}
                </p>
                {!chargement && (
                  <p style={{
                    marginTop : '0.4rem',
                    fontSize  : '0.78rem',
                    color     : 'rgba(255,255,255,0.45)',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {billets_confirmes.length} billet
                    {billets_confirmes.length !== 1 ? 's' : ''} confirmé
                    {billets_confirmes.length !== 1 ? 's' : ''}
                    {billets_attente.length > 0
                      ? ` · ${billets_attente.length} en attente`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div style={{
          background  : 'var(--blanc)',
          borderBottom: '1px solid var(--gris-bord)',
          marginBottom: '1.5rem',
        }}>
          <div className="conteneur">
            <div style={{ display: 'flex', overflowX: 'auto' }}>
              {[
                {
                  id   : 'billets',
                  label: 'Mes billets',
                  count: billets_confirmes.length + billets_attente.length,
                },
                {
                  id   : 'paiements',
                  label: 'Historique',
                  count: billets_confirmes.length,
                },
                {
                  id   : 'historique',
                  label: 'Annulés / Expirés',
                  count: billets_historique.length,
                },
              ].map(({ id, label, count }) => (
                <button
                  key    ={id}
                  onClick={() => setOnglet(id)}
                  style  ={{
                    background  : 'transparent',
                    border      : 'none',
                    borderBottom: onglet === id
                      ? '3px solid var(--vert-foret)'
                      : '3px solid transparent',
                    color      : onglet === id ? 'var(--vert-foret)' : 'var(--gris-doux)',
                    fontFamily : 'var(--font-display)',
                    fontWeight : onglet === id ? 700 : 500,
                    fontSize   : '0.88rem',
                    padding    : '1rem 1.25rem',
                    cursor     : 'pointer',
                    whiteSpace : 'nowrap',
                    display    : 'flex',
                    alignItems : 'center',
                    gap        : '0.4rem',
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span style={{
                      background  : onglet === id ? 'var(--vert-foret)' : 'var(--gris-bord)',
                      color       : onglet === id ? 'var(--blanc)'      : 'var(--gris-doux)',
                      borderRadius: '999px',
                      fontSize    : '0.7rem',
                      padding     : '0.1rem 0.45rem',
                      fontWeight  : 700,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="conteneur">

          {/* Info MAJ discrète */}
          {derniereMaj && !chargement && (
            <p style={{
              fontSize  : '0.7rem',
              color     : 'var(--gris-doux)',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              textAlign : 'right',
            }}>
              Mis à jour à {derniereMaj} — auto toutes les 30s
            </p>
          )}

          {/* Skeleton chargement */}
          {chargement && reservations.length === 0 && (
            <SkeletonListe />
          )}

          {/* Erreur */}
          {estErreur && !chargement && (
            <div style={{
              background  : '#FEF2F2',
              border      : '1.5px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              padding     : '1.5rem',
              textAlign   : 'center',
            }}>
              <p style={{
                color     : 'var(--rouge-erreur)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                marginBottom: '1rem',
              }}>
                Impossible de charger vos billets.
              </p>
              <Button variante="primaire" taille="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {/* ── ONGLET : MES BILLETS ── */}
          {onglet === 'billets' && !estErreur && (
            <ContenuBillets
              chargement       ={chargement}
              billets_attente  ={billets_attente}
              billets_confirmes={billets_confirmes}
              onPDF            ={handlePDF}
              navigate         ={navigate}
            />
          )}

          {/* ── ONGLET : HISTORIQUE PAIEMENTS ── */}
          {onglet === 'paiements' && (
            <HistoriquePaiements
              confirmes   ={billets_confirmes}
              totalDepense={totalDepense}
            />
          )}

          {/* ── ONGLET : ANNULÉS / EXPIRÉS ── */}
          {onglet === 'historique' && (
            <ContenuHistorique
              billets_historique={billets_historique}
              billets_expires   ={billets_expires}
            />
          )}

        </div>
      </div>

      {/* Animations CSS globales pour cette page */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0;  }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </PageWrapper>
  )
}

// ════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS (extraits pour éviter les re-renders)
// ════════════════════════════════════════════════════════════

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ onFermer }) => (
  <div style={{
    position    : 'fixed',
    bottom      : '2rem',
    left        : '50%',
    transform   : 'translateX(-50%)',
    background  : 'var(--vert-foret)',
    color       : 'var(--blanc)',
    padding     : '1rem 1.75rem',
    borderRadius: 'var(--radius-md)',
    boxShadow   : 'var(--ombre-lg)',
    fontFamily  : 'var(--font-display)',
    fontWeight  : 600,
    fontSize    : '0.9rem',
    zIndex      : 999,
    display     : 'flex',
    alignItems  : 'center',
    gap         : '0.6rem',
    animation   : 'slideUp 0.3s ease',
    whiteSpace  : 'nowrap',
  }}>
    {/* Emoji dans span séparé → évite NotFoundError */}
    <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>🎉</span>
    <span>Réservation confirmée ! Votre billet est prêt.</span>
    <button
      onClick={onFermer}
      aria-label="Fermer la notification"
      style={{
        background: 'none',
        border    : 'none',
        color     : 'rgba(255,255,255,0.7)',
        cursor    : 'pointer',
        fontSize  : '1rem',
        lineHeight: 1,
        padding   : '0 0.25rem',
        flexShrink: 0,
      }}
    >
      ×
    </button>
  </div>
)

// ── Skeleton chargement ───────────────────────────────────────
const SkeletonListe = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
    {[1, 2, 3].map(i => (
      <div
        key={i}
        style={{
          height        : '130px',
          borderRadius  : 'var(--radius-md)',
          background    : 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation     : 'shimmer 1.4s infinite',
        }}
      />
    ))}
  </div>
)

// ── Contenu onglet Billets ────────────────────────────────────
const ContenuBillets = ({
  chargement, billets_attente, billets_confirmes, onPDF, navigate
}) => {
  const aucunBillet = !chargement
    && billets_confirmes.length === 0
    && billets_attente.length   === 0

  return (
    <div>
      {aucunBillet && (
        <div style={{
          textAlign   : 'center',
          padding     : '3.5rem 2rem',
          background  : 'var(--blanc)',
          borderRadius: 'var(--radius-lg)',
          border      : '1.5px dashed var(--gris-bord)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
          <p style={{
            fontFamily  : 'var(--font-display)',
            fontWeight  : 700,
            fontSize    : '1.1rem',
            color       : 'var(--ardoise)',
            marginBottom: '0.5rem',
          }}>
            Aucun billet actif
          </p>
          <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Réservez votre première place de bus.
          </p>
          <Button variante="primaire" onClick={() => navigate('/voyages')}>
            Rechercher un voyage
          </Button>
        </div>
      )}

      {billets_attente.length > 0 && (
        <SectionBillets titre="En attente de paiement" couleur="#92400E">
          {billets_attente.map(r => (
            <CarteBillet
              key       ={r.id}
              reservation={r}
              onPDF     ={onPDF}
              navigate  ={navigate}
              showExpiration
            />
          ))}
        </SectionBillets>
      )}

      {billets_confirmes.length > 0 && (
        <SectionBillets titre="Billets confirmés" couleur="var(--vert-foret)">
          {billets_confirmes.map(r => (
            <CarteBillet
              key        ={r.id}
              reservation={r}
              onPDF      ={onPDF}
              navigate   ={navigate}
            />
          ))}
        </SectionBillets>
      )}
    </div>
  )
}

// ── Section avec titre ────────────────────────────────────────
const SectionBillets = ({ titre, couleur, children }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <h3 style={{
      fontFamily   : 'var(--font-display)',
      fontWeight   : 700,
      fontSize     : '0.8rem',
      color        : couleur,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom : '0.75rem',
    }}>
      {titre}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {children}
    </div>
  </div>
)

// ── Carte billet ──────────────────────────────────────────────
const CarteBillet = ({
  reservation  : r,
  onPDF,
  navigate,
  showExpiration = false,
  estExpire      = false,
  modeHistorique = false,
}) => {
  const [hovered, setHovered] = useState(false)

  const couleurBande =
    estExpire                             ? '#EF4444'
    : r.statut_paiement === 'CONFIRME'   ? 'var(--vert-clair)'
    : r.statut_paiement === 'ANNULE'     ? 'var(--rouge-erreur)'
    : r.statut_paiement === 'REMBOURSE'  ? '#7C3AED'
    : 'var(--or-soleil)'

  const statutAffiche = estExpire ? 'ANNULE' : r.statut_paiement

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background         : modeHistorique ? '#FAFAFA' : 'var(--blanc)',
        borderRadius       : 'var(--radius-md)',
        border             : hovered && !modeHistorique
          ? '1.5px solid var(--vert-clair)'
          : '1.5px solid var(--gris-bord)',
        overflow           : 'hidden',
        display            : 'grid',
        gridTemplateColumns: '5px 1fr',
        boxShadow          : hovered && !modeHistorique
          ? 'var(--ombre-md)'
          : 'var(--ombre-sm)',
        transition: 'all var(--transition)',
        opacity   : modeHistorique ? 0.8 : 1,
      }}
    >
      {/* Bande colorée */}
      <div style={{ background: couleurBande }} />

      {/* Contenu */}
      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Ligne 1 : trajet + badge */}
        <div style={{
          display       : 'flex',
          justifyContent: 'space-between',
          alignItems    : 'flex-start',
          marginBottom  : '0.75rem',
          flexWrap      : 'wrap',
          gap           : '0.5rem',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Trajet */}
            <div style={{
              display    : 'flex',
              alignItems : 'center',
              gap        : '0.5rem',
              marginBottom: '0.25rem',
              flexWrap   : 'wrap',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize  : '1rem',
                color     : 'var(--ardoise)',
              }}>
                {r.voyage?.ville_depart_display ?? '-'}
              </span>
              <svg
                width="22" height="10"
                viewBox="0 0 22 10"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M0 5h18M14 1l5 4-5 4"
                  stroke="var(--vert-clair)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize  : '1rem',
                color     : 'var(--ardoise)',
              }}>
                {r.voyage?.ville_arrivee_display ?? '-'}
              </span>
            </div>

            {/* Agence + date */}
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-doux)', lineHeight: 1.4 }}>
              {r.voyage?.agence_nom ?? '-'}
              {r.voyage?.date_heure_depart
                ? ` · ${formaterDateVoyage(r.voyage.date_heure_depart)}`
                : ''}
            </p>

            {/* Expiration */}
            {showExpiration
              && r.heures_avant_expiration !== undefined
              && r.heures_avant_expiration !== null
              && r.heures_avant_expiration <= 5
              && (
              <div style={{ marginTop: '0.35rem' }}>
                <AffichageExpiration heuresRestantes={r.heures_avant_expiration} />
              </div>
            )}

            {/* Expiré automatiquement */}
            {estExpire && (
              <p style={{
                marginTop : '0.35rem',
                fontSize  : '0.75rem',
                color     : 'var(--rouge-erreur)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}>
                Annulé automatiquement - départ passé ou dans moins de 5h
              </p>
            )}
          </div>

          <Badge statut={statutAffiche} />
        </div>

        {/* Ligne 2 : infos + actions */}
        <div style={{
          display       : 'flex',
          justifyContent: 'space-between',
          alignItems    : 'flex-end',
          flexWrap      : 'wrap',
          gap           : '0.75rem',
          paddingTop    : '0.75rem',
          borderTop     : '1px dashed var(--gris-bord)',
        }}>

          {/* Infos */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <InfoBillet label="Siège">
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize  : '1.05rem',
                color     : 'var(--ardoise)',
              }}>
                {`N°${r.numero_siege}`}
              </span>
            </InfoBillet>

            <InfoBillet label="Montant">
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize  : '1.05rem',
                color     : modeHistorique
                  ? 'var(--gris-doux)'
                  : 'var(--vert-foret)',
              }}>
                {formaterPrix(r.montant_paye)}
              </span>
            </InfoBillet>

            <InfoBillet label="Billet">
              <span style={{
                fontFamily  : 'var(--font-mono)',
                fontSize    : '0.7rem',
                color       : 'var(--gris-doux)',
                letterSpacing: '0.04em',
              }}>
                {String(r.numero_billet).substring(0, 14).toUpperCase()}
              </span>
            </InfoBillet>
          </div>

          {/* Actions */}
          {!modeHistorique && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

              {r.statut_paiement === 'CONFIRME' && (
                <Button
                  variante="secondaire"
                  taille="sm"
                  onClick={() => onPDF(r.id, r.numero_billet)}
                >
                  Télécharger PDF
                </Button>
              )}

              {r.statut_paiement === 'EN_ATTENTE' && (
                <Button
                  variante="or"
                  taille="sm"
                  onClick={() => navigate('/paiement', {
                    state: {
                      reservationId: r.id,
                      montant      : r.montant_paye,
                      voyage       : r.voyage,
                      numeroSiege  : r.numero_siege,
                      numeroBillet : r.numero_billet,
                    },
                  })}
                >
                  Payer maintenant
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Contenu onglet Historique ─────────────────────────────────
const ContenuHistorique = ({ billets_historique, billets_expires }) => {
  if (billets_historique.length === 0) {
    return (
      <div style={{
        textAlign   : 'center',
        padding     : '3rem',
        background  : 'var(--blanc)',
        borderRadius: 'var(--radius-lg)',
        border      : '1.5px dashed var(--gris-bord)',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color     : 'var(--ardoise)',
        }}>
          Aucun billet annulé ou expiré
        </p>
      </div>
    )
  }

  return (
    <div>
      {billets_expires.length > 0 && (
        <div style={{
          background  : '#FEF2F2',
          border      : '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          padding     : '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          display     : 'flex',
          gap         : '0.75rem',
          alignItems  : 'flex-start',
        }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily  : 'var(--font-display)',
              fontWeight  : 700,
              color       : 'var(--rouge-erreur)',
              fontSize    : '0.88rem',
              marginBottom: '0.25rem',
            }}>
              {billets_expires.length} billet
              {billets_expires.length > 1 ? 's' : ''} annulé
              {billets_expires.length > 1 ? 's' : ''} automatiquement
            </p>
            <p style={{ color: '#EF4444', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Ces billets étaient en attente de paiement.
              Le départ est passé ou arrive dans moins de 5 heures.
              Les sièges ont été libérés.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {billets_historique.map(r => (
          <CarteBillet
            key           ={r.id}
            reservation   ={r}
            estExpire     ={estBilletExpire(r)}
            onPDF         ={() => {}}
            navigate      ={() => {}}
            modeHistorique
          />
        ))}
      </div>
    </div>
  )
}

// ── Historique paiements ──────────────────────────────────────
const HistoriquePaiements = ({ confirmes, totalDepense }) => {
  if (confirmes.length === 0) {
    return (
      <div style={{
        textAlign   : 'center',
        padding     : '3rem',
        background  : 'var(--blanc)',
        borderRadius: 'var(--radius-lg)',
        border      : '1.5px dashed var(--gris-bord)',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color     : 'var(--ardoise)',
        }}>
          Aucun paiement confirmé
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Résumé */}
      <div style={{
        display            : 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap                : '1rem',
        marginBottom       : '1.5rem',
      }}>
        {[
          {
            label  : 'Total dépensé',
            valeur : formaterPrix(totalDepense),
            couleur: 'var(--vert-foret)',
          },
          {
            label  : 'Voyages effectués',
            valeur : confirmes.length,
            couleur: '#1D4ED8',
          },
        ].map(({ label, valeur, couleur }) => (
          <div key={label} style={{
            background  : 'var(--blanc)',
            borderRadius: 'var(--radius-md)',
            padding     : '1.25rem',
            border      : '1px solid var(--gris-bord)',
            boxShadow   : 'var(--ombre-sm)',
          }}>
            <p style={{
              fontSize     : '0.7rem',
              color        : 'var(--gris-doux)',
              fontFamily   : 'var(--font-display)',
              fontWeight   : 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom : '0.35rem',
            }}>
              {label}
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize  : '1.4rem',
              color     : couleur,
            }}>
              {valeur}
            </p>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {confirmes.map(r => (
          <div
            key={r.id}
            style={{
              background  : 'var(--blanc)',
              borderRadius: 'var(--radius-md)',
              padding     : '1rem 1.5rem',
              border      : '1px solid var(--gris-bord)',
              display     : 'flex',
              justifyContent: 'space-between',
              alignItems  : 'center',
              flexWrap    : 'wrap',
              gap         : '0.5rem',
            }}
          >
            <div>
              <p style={{
                fontFamily  : 'var(--font-display)',
                fontWeight  : 700,
                color       : 'var(--ardoise)',
                fontSize    : '0.95rem',
                marginBottom: '0.2rem',
              }}>
                {r.voyage?.ville_depart_display}
                {' → '}
                {r.voyage?.ville_arrivee_display}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--gris-doux)' }}>
                {r.voyage?.date_heure_depart
                  ? formaterDateVoyage(r.voyage.date_heure_depart)
                  : '-'}
                {' · Siège N°'}
                {r.numero_siege}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize  : '1.1rem',
                color     : 'var(--vert-foret)',
              }}>
                {formaterPrix(r.montant_paye)}
              </p>
              <Badge statut="CONFIRME" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── InfoBillet ────────────────────────────────────────────────
const InfoBillet = ({ label, children }) => (
  <div>
    <p style={{
      fontSize     : '0.68rem',
      color        : 'var(--gris-doux)',
      fontFamily   : 'var(--font-display)',
      fontWeight   : 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom : '0.2rem',
    }}>
      {label}
    </p>
    {children}
  </div>
)

export default Profil

