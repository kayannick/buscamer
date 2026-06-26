// ============================================================

// ============================================================

import { useState, useEffect }          from 'react'
import { useLocation, useNavigate }     from 'react-router-dom'
import { useQuery }     from '@tanstack/react-query'
import { getMesReservations }           from '../services/reservationService'
import { formaterDateVoyage }           from '../utils/formatDate'
import { formaterPrix }                 from '../utils/formatPrix'
import useAuth                          from '../hooks/useAuth'
import Badge                            from '../components/ui/Badge'
import Button                           from '../components/ui/Button'
import Spinner                          from '../components/ui/Spinner'
import PageWrapper                      from '../components/layout/PageWrapper'
import apiClient                        from '../services/axiosConfig'

// ── Téléchargement billet PDF ─────────────────────────────────
const telechargerBilletPDF = async (reservationId, numeroBillet) => {
  try {
    const response = await apiClient.get(
      `/reservations/${reservationId}/billet-pdf/`,
      { responseType: 'blob' }
    )
    const url  = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `BusCam-Billet-${String(numeroBillet).substring(0,8).toUpperCase()}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch {
    alert('Erreur lors du téléchargement. Réessayez.')
  }
}

const Profil = () => {
  const { utilisateur }  = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  // const queryClient      = useQueryClient()

  const [toastVisible, setToastVisible] = useState(location.state?.nouveauBillet ?? false)
  const [onglet,       setOnglet]       = useState('billets') // 'billets' | 'paiements'

  useEffect(() => {
    if (!toastVisible) return
    const t = setTimeout(() => setToastVisible(false), 4000)
    return () => clearTimeout(t)
  }, [toastVisible])

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
    ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  // Sépare les réservations par statut
  const confirmes   = reservations.filter(r => r.statut_paiement === 'CONFIRME')
  const enAttente   = reservations.filter(r => r.statut_paiement === 'EN_ATTENTE')
  const autres      = reservations.filter(r => !['CONFIRME','EN_ATTENTE'].includes(r.statut_paiement))

  return (
    <PageWrapper titre="BusCam — Mes billets">
      <div style={{ minHeight: '80vh', background: 'var(--creme)', paddingBottom: '3rem' }}>

        {/* ── Toast succès ── */}
        {toastVisible && (
          <>
            <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--vert-foret)', color: 'var(--blanc)', padding: '1rem 1.75rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--ombre-lg)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', zIndex: 999, display: 'flex', alignItems: 'center', gap: '0.6rem', animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '1.25rem' }}>🎉</span>
              Réservation confirmée ! Votre billet est prêt.
              <button onClick={() => setToastVisible(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0 0.25rem', fontSize: '1rem' }}>✕</button>
            </div>
            <style>{`@keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>
          </>
        )}

        {/* ── En-tête profil ── */}
        <div style={{ background: 'var(--vert-foret)', padding: '2.5rem 0' }}>
          <div className="conteneur">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--or-soleil)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--vert-foret)', flexShrink: 0, border: '3px solid rgba(255,255,255,0.2)' }}>
                {(utilisateur?.first_name?.[0] || utilisateur?.username?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--blanc)', marginBottom: '0.3rem' }}>
                  {utilisateur?.first_name ? `${utilisateur.first_name} ${utilisateur.last_name}` : utilisateur?.username}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>
                  {utilisateur?.telephone}{utilisateur?.email && ` · ${utilisateur.email}`}
                </p>
                {!chargement && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-display)' }}>
                    {reservations.length} réservation{reservations.length !== 1 ? 's' : ''} au total
                  </p>
                )}
              </div>
              {/* <button
                onClick={() => refetch()}
                disabled={chargement}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontSize: '0.8rem', cursor: chargement ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
              >
                {chargement ? <Spinner taille="sm" couleur="rgba(255,255,255,0.8)" /> : '↻'}
                {chargement ? 'Chargement...' : 'Actualiser'}
              </button> */}
            </div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div style={{ background: 'var(--blanc)', borderBottom: '1px solid var(--gris-bord)', marginBottom: '2rem' }}>
          <div className="conteneur">
            <div style={{ display: 'flex', gap: '0' }}>
              {[
                { id: 'billets',    label: '🎫 Mes billets',           count: reservations.length },
                { id: 'paiements',  label: '💳 Historique paiements',  count: confirmes.length    },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => setOnglet(id)}
                  style={{
                    background  : 'transparent',
                    border      : 'none',
                    borderBottom: onglet === id ? '3px solid var(--vert-foret)' : '3px solid transparent',
                    color       : onglet === id ? 'var(--vert-foret)' : 'var(--gris-doux)',
                    fontFamily  : 'var(--font-display)',
                    fontWeight  : onglet === id ? 700 : 500,
                    fontSize    : '0.9rem',
                    padding     : '1rem 1.5rem',
                    cursor      : 'pointer',
                    transition  : 'all var(--transition)',
                    display     : 'flex',
                    alignItems  : 'center',
                    gap         : '0.4rem',
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span style={{ background: onglet === id ? 'var(--vert-foret)' : 'var(--gris-bord)', color: onglet === id ? 'var(--blanc)' : 'var(--gris-doux)', borderRadius: '999px', fontSize: '0.7rem', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="conteneur">

          {/* ── Info dernière MAJ ── */}
          {derniereMaj && !chargement && (
            <p style={{ fontSize: '0.72rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', marginBottom: '1rem', textAlign: 'right' }}>
              ↻ Mis à jour à {derniereMaj} · Auto toutes les 30s
            </p>
          )}

          {/* ── Chargement initial ── */}
          {chargement && reservations.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: '140px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          )}

          {/* ── Erreur ── */}
          {estErreur && !chargement && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--rouge-erreur)', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1rem' }}>Impossible de charger vos billets.</p>
              <Button variante="primaire" taille="sm" onClick={() => refetch()}>Réessayer</Button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ONGLET 1 : MES BILLETS
          ══════════════════════════════════════════════════ */}
          {onglet === 'billets' && !estErreur && (
            <>
              {/* Rechargement silencieux */}
              {chargement && reservations.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Spinner taille="sm" />
                  <p style={{ fontSize: '0.78rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>Mise à jour...</p>
                </div>
              )}

              {/* Aucun billet */}
              {!chargement && reservations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: 'var(--blanc)', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--gris-bord)' }}>
                  <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ardoise)', marginBottom: '0.5rem' }}>Aucun billet pour le moment</p>
                  <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Réservez votre première place de bus.</p>
                  <Button variante="primaire" onClick={() => navigate('/voyages')}>Rechercher un voyage →</Button>
                </div>
              )}

              {/* En attente de paiement */}
              {enAttente.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    ⏳ En attente de paiement ({enAttente.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {enAttente.map(r => <CarteBillet key={r.id} reservation={r} onPDF={() => {}} navigate={navigate} />)}
                  </div>
                </div>
              )}

              {/* Confirmés */}
              {confirmes.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--vert-foret)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    ✅ Billets confirmés ({confirmes.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {confirmes.map(r => (
                      <CarteBillet
                        key       ={r.id}
                        reservation={r}
                        onPDF     ={() => telechargerBilletPDF(r.id, r.numero_billet)}
                        navigate  ={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Autres (annulés, remboursés) */}
              {autres.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--gris-doux)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                    Historique ({autres.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {autres.map(r => <CarteBillet key={r.id} reservation={r} onPDF={() => {}} navigate={navigate} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════
              ONGLET 2 : HISTORIQUE PAIEMENTS
          ══════════════════════════════════════════════════ */}
          {onglet === 'paiements' && (
            <HistoriquePaiements reservations={reservations} />
          )}

        </div>
      </div>
    </PageWrapper>
  )
}

// ── CarteBillet ───────────────────────────────────────────────
const CarteBillet = ({ reservation: r, onPDF, navigate }) => {
  const [hovered, setHovered] = useState(false)

  const couleurBande =
    r.statut_paiement === 'CONFIRME'    ? 'var(--vert-clair)'
    : r.statut_paiement === 'ANNULE'    ? 'var(--rouge-erreur)'
    : r.statut_paiement === 'REMBOURSE' ? '#7C3AED'
    : 'var(--or-soleil)'

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background          : 'var(--blanc)',
        borderRadius        : 'var(--radius-md)',
        // ✅ border shorthand seul, jamais mixé avec borderColor
        border              : hovered ? '1.5px solid var(--vert-clair)' : '1.5px solid var(--gris-bord)',
        overflow            : 'hidden',
        display             : 'grid',
        gridTemplateColumns : '5px 1fr',
        boxShadow           : hovered ? 'var(--ombre-md)' : 'var(--ombre-sm)',
        transition          : 'all var(--transition)',
      }}
    >
      <div style={{ background: couleurBande }} />
      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Ligne trajet + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ardoise)' }}>{r.voyage?.ville_depart_display ?? '—'}</span>
              <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><path d="M0 5h18M14 1l5 4-5 4" stroke="var(--vert-clair)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ardoise)' }}>{r.voyage?.ville_arrivee_display ?? '—'}</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--gris-doux)', lineHeight: 1.4 }}>
              {r.voyage?.agence_nom ?? '—'}{r.voyage?.date_heure_depart ? ` · ${formaterDateVoyage(r.voyage.date_heure_depart)}` : ''}
            </p>
          </div>
          <Badge statut={r.statut_paiement} />
        </div>

        {/* Infos + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--gris-bord)' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <InfoBillet label="Siège">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ardoise)' }}>N°{r.numero_siege}</span>
            </InfoBillet>
            <InfoBillet label="Montant">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--vert-foret)' }}>{formaterPrix(r.montant_paye)}</span>
            </InfoBillet>
            <InfoBillet label="N° Billet">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--gris-doux)', letterSpacing: '0.04em', wordBreak: 'break-all' }}>
                {String(r.numero_billet).substring(0, 18).toUpperCase()}…
              </span>
            </InfoBillet>
          </div>

          {/* Bouton PDF (seulement si confirmé) — pas de bouton annuler */}
          {r.statut_paiement === 'CONFIRME' && (
            <Button variante="secondaire" taille="sm" onClick={onPDF}>
              📄 Télécharger PDF
            </Button>
          )}

          {/* Bouton payer (si en attente) */}
          {r.statut_paiement === 'EN_ATTENTE' && (
            <Button variante="or" taille="sm" onClick={() => navigate('/paiement', { state: { reservationId: r.id, montant: r.montant_paye, voyage: r.voyage, numeroSiege: r.numero_siege, numeroBillet: r.numero_billet } })}>
              💳 Payer maintenant
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Historique des paiements ──────────────────────────────────
const HistoriquePaiements = ({ reservations }) => {
  const confirmes = reservations.filter(r => r.statut_paiement === 'CONFIRME')

  if (confirmes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--blanc)', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--gris-bord)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</p>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ardoise)' }}>Aucun paiement confirmé</p>
      </div>
    )
  }

  const totalDepense = confirmes.reduce((acc, r) => acc + parseFloat(r.montant_paye || 0), 0)

  return (
    <div>
      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total dépensé',      valeur: formaterPrix(totalDepense), couleur: 'var(--vert-foret)' },
          { label: 'Voyages effectués',  valeur: confirmes.length,            couleur: 'var(--vert-foret)' },
        ].map(({ label, valeur, couleur }) => (
          <div key={label} style={{ background: 'var(--blanc)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--gris-bord)', boxShadow: 'var(--ombre-sm)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.4rem', color: couleur }}>{valeur}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {confirmes.map(r => (
          <div key={r.id} style={{ background: 'var(--blanc)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', border: '1px solid var(--gris-bord)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ardoise)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                {r.voyage?.ville_depart_display} → {r.voyage?.ville_arrivee_display}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--gris-doux)' }}>
                {r.voyage?.date_heure_depart ? formaterDateVoyage(r.voyage.date_heure_depart) : '—'} · Siège N°{r.numero_siege}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--vert-foret)' }}>{formaterPrix(r.montant_paye)}</p>
              <Badge statut="CONFIRME" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const InfoBillet = ({ label, children }) => (
  <div>
    <p style={{ fontSize: '0.68rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</p>
    {children}
  </div>
)

export default Profil

