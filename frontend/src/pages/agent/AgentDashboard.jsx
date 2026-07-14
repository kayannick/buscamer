// ============================================================
//
// INSPIRÉ DES MEILLEURS DASHBOARDS (Metabase, Retool, Linear) :
//   - KPIs avec variation période précédente
//   - Graphique barres CA + courbe réservations
//   - Taux de remplissage en anneau
//   - Top 5 trajets avec barre de progression
//   - Alertes intelligentes (bus sans chauffeur, voyage complet, etc.)
//   - Prochains départs avec indicateur temps réel
//   - Actions rapides contextuelles
// ============================================================

import { useState, useMemo }    from 'react'
import { useQuery }             from '@tanstack/react-query'
import { useNavigate }          from 'react-router-dom'
import AgentLayout              from '../../components/agent/AgentLayout'
import Spinner                  from '../../components/ui/Spinner'
import { formaterPrix }         from '../../utils/formatPrix'
import { getDashboardStats }    from '../../services/agentService'

// ── Sélecteur période ─────────────────────────────────────────
const PERIODES = [
  { id: 'jour',      label: "Aujourd'hui" },
  { id: 'semaine',   label: '7 jours'     },
  { id: 'mois',      label: '30 jours'    },
  { id: 'trimestre', label: '3 mois'      },
  { id: 'semestre',  label: '6 mois'      },
  { id: 'annee',     label: '1 an'        },
]

// ── Carte KPI ─────────────────────────────────────────────────
const KPICard = ({ icone, label, valeur, couleur, sousTitre, accent = false }) => (
  <div style={{
    background  : accent ? couleur : 'var(--blanc)',
    borderRadius: 'var(--radius-md)',
    padding     : '1.25rem',
    border      : accent ? 'none' : '1px solid var(--gris-bord)',
    boxShadow   : 'var(--ombre-sm)',
    position    : 'relative',
    overflow    : 'hidden',
  }}>
    {/* Cercle décoratif */}
    {accent && (
      <div style={{
        position    : 'absolute',
        top         : '-20px',
        right       : '-20px',
        width       : '100px',
        height      : '100px',
        borderRadius: '50%',
        background  : 'rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }} />
    )}

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', position: 'relative' }}>
      <div style={{
        width         : '40px',
        height        : '40px',
        borderRadius  : '10px',
        background    : accent ? 'rgba(255,255,255,0.2)' : `${couleur}18`,
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'center',
        fontSize      : '1.25rem',
      }}>
        {/* Emoji dans span — évite bug insertBefore */}
        <span aria-hidden="true">{icone}</span>
      </div>
    </div>

    <p style={{
      fontFamily  : 'var(--font-mono)',
      fontWeight  : 800,
      fontSize    : '1.7rem',
      color       : accent ? 'var(--blanc)' : couleur,
      lineHeight  : 1,
      marginBottom: '0.3rem',
      position    : 'relative',
    }}>
      {valeur}
    </p>
    <p style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      fontSize  : '0.78rem',
      color     : accent ? 'rgba(255,255,255,0.75)' : 'var(--gris-doux)',
      position  : 'relative',
    }}>
      {label}
    </p>
    {sousTitre && (
      <p style={{
        fontSize  : '0.7rem',
        color     : accent ? 'rgba(255,255,255,0.55)' : 'var(--gris-doux)',
        marginTop : '0.25rem',
        position  : 'relative',
      }}>
        {sousTitre}
      </p>
    )}
  </div>
)

// ── Graphique barres CA ───────────────────────────────────────
const GraphiqueCA = ({ data, periode }) => {
  const [hoverIdx, setHoverIdx] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gris-doux)', fontSize: '0.85rem' }}>
        Aucune donnée pour cette période
      </div>
    )
  }

  const maxCA = Math.max(...data.map(d => Number(d.chiffre_affaires) || 0)) || 1

  return (
    <div>
      <div style={{
        display    : 'flex',
        alignItems : 'flex-end',
        gap        : '4px',
        height     : '160px',
        padding    : '0 4px',
        overflowX  : 'auto',
      }}>
        {data.map((d, i) => {
          const ca      = Number(d.chiffre_affaires) || 0
          const hauteur = Math.max((ca / maxCA) * 140, 3)
          const dateObj = new Date(d.date)
          const label   = dateObj.toLocaleDateString('fr-FR', {
            day  : '2-digit',
            month: periode === 'annee' ? 'short' : '2-digit',
          })

          return (
            <div
              key={i}
              style={{
                flex          : 1,
                display       : 'flex',
                flexDirection : 'column',
                alignItems    : 'center',
                gap           : '4px',
                minWidth      : '24px',
                cursor        : 'pointer',
              }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              title={`${label} : ${formaterPrix(ca)} — ${d.nb_reservations || 0} rés.`}
            >
              {/* Valeur au survol */}
              {hoverIdx === i && ca > 0 && (
                <div style={{
                  position    : 'absolute',
                  background  : 'var(--ardoise)',
                  color       : 'var(--blanc)',
                  padding     : '3px 6px',
                  borderRadius: '4px',
                  fontSize    : '0.65rem',
                  fontFamily  : 'var(--font-mono)',
                  fontWeight  : 700,
                  whiteSpace  : 'nowrap',
                  zIndex      : 10,
                  transform   : 'translateY(-24px)',
                }}>
                  {formaterPrix(ca)}
                </div>
              )}

              <div style={{
                width       : '100%',
                height      : `${hauteur}px`,
                background  : hoverIdx === i
                  ? 'var(--or-soleil)'
                  : 'var(--vert-foret)',
                borderRadius: '4px 4px 0 0',
                transition  : 'all 0.2s ease',
                position    : 'relative',
              }} />

              <span style={{
                fontSize  : '0.55rem',
                color     : 'var(--gris-doux)',
                fontFamily: 'var(--font-mono)',
                textAlign : 'center',
                lineHeight: 1.2,
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
        {[
          { couleur: 'var(--vert-foret)', label: 'CA (FCFA)' },
        ].map(({ couleur, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: couleur }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Barre de progression ──────────────────────────────────────
const BarreProgression = ({ valeur, max, couleur = 'var(--vert-foret)', label, extra }) => {
  const pct = max > 0 ? Math.min((valeur / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--ardoise)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {extra && <span style={{ fontSize: '0.72rem', color: 'var(--gris-doux)' }}>{extra}</span>}
          <span style={{ fontSize: '0.82rem', color: couleur, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{valeur}</span>
        </div>
      </div>
      <div style={{ height: '6px', background: 'var(--gris-bord)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width      : `${pct}%`,
          height     : '100%',
          background : couleur,
          borderRadius: '3px',
          transition : 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── Alerte card ───────────────────────────────────────────────
const AlerteCard = ({ type, texte }) => {
  const styles = {
    warning : { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icone: '⚠️' },
    danger  : { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icone: '🔴' },
    info    : { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icone: 'ℹ️' },
    success : { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', icone: '✅' },
  }
  const s = styles[type] || styles.info

  return (
    <div style={{
      background  : s.bg,
      border      : `1px solid ${s.border}`,
      borderRadius: 'var(--radius-sm)',
      padding     : '0.6rem 0.875rem',
      display     : 'flex',
      alignItems  : 'center',
      gap         : '0.5rem',
      marginBottom: '0.5rem',
    }}>
      <span aria-hidden="true" style={{ fontSize: '0.9rem', flexShrink: 0 }}>{s.icone}</span>
      <p style={{ fontSize: '0.8rem', color: s.color, fontFamily: 'var(--font-display)', fontWeight: 500, lineHeight: 1.4 }}>
        {texte}
      </p>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────
const AgentDashboard = () => {
  const navigate         = useNavigate()
  const [periode, setPeriode] = useState('mois')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey : ['agent-dashboard', periode],
    queryFn  : () => getDashboardStats(periode),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // ── Données extraites ──────────────────────────────────────
  // const s   = data?.stats_globales || {}
  // const sb  = data?.stats_bus      || {}
  // const top = data?.top_destinations || []
  // const prochains = data?.prochains_voyages || []
  // const evolution = data?.evolution         || []

  // APRÈS (stable — useMemo) :
  const s = useMemo(
    () => data?.stats_globales || {},
    [data]
  )

  const sb = useMemo(
    () => data?.stats_bus || {},
    [data]
  )

  const top = useMemo(
    () => data?.top_destinations || [],
    [data]
  )

  const prochains = useMemo(
    () => data?.prochains_voyages || [],
    [data]
  )

  const evolution = useMemo(
    () => data?.evolution || [],
    [data]
)

  // ── Alertes intelligentes ──────────────────────────────────
  const alertes = useMemo(() => {
    const liste = []
    if (!data) return liste

    if (s.reservations_attente > 0) {
      liste.push({
        type : 'warning',
        texte: `${s.reservations_attente} réservation${s.reservations_attente > 1 ? 's' : ''} en attente de paiement — vérifiez l'embarquement`
      })
    }
    if (sb.total_bus === 0) {
      liste.push({ type: 'danger', texte: 'Aucun bus enregistré — ajoutez votre flotte pour publier des voyages' })
    }
    if (sb.bus_actifs < sb.total_bus) {
      liste.push({ type: 'info', texte: `${sb.total_bus - sb.bus_actifs} bus désactivé${sb.total_bus - sb.bus_actifs > 1 ? 's' : ''} — vérifiez la disponibilité` })
    }
    if (s.taux_remplissage_moyen >= 85) {
      liste.push({ type: 'success', texte: `Excellent taux de remplissage : ${s.taux_remplissage_moyen}% — envisagez d'ajouter des départs` })
    }
    if (prochains.length === 0 && data) {
      liste.push({ type: 'info', texte: 'Aucun voyage programmé dans les 7 prochains jours — planifiez dès maintenant' })
    }
    return liste
  }, [data, s, sb, prochains])

  // ── Max top destinations (pour les barres) ────────────────
  const maxDest = top.length > 0 ? Math.max(...top.map(d => d.nb)) : 1

  return (
    <AgentLayout titre="Tableau de bord">
      <div style={{ maxWidth: '1400px' }}>

        {/* ── En-tête + sélecteur période ── */}
        <div style={{
          display       : 'flex',
          justifyContent: 'space-between',
          alignItems    : 'center',
          marginBottom  : '1.5rem',
          flexWrap      : 'wrap',
          gap           : '0.75rem',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--gris-doux)' }}>
              Agence :
              <strong style={{ color: 'var(--ardoise)', marginLeft: '0.3rem' }}>
                {data?.agence || '—'}
              </strong>
            </p>
          </div>

          {/* Sélecteur période */}
          <div style={{
            display    : 'flex',
            background : 'var(--blanc)',
            border     : '1px solid var(--gris-bord)',
            borderRadius: 'var(--radius-md)',
            overflow   : 'hidden',
          }}>
            {PERIODES.map(p => (
              <button
                key    ={p.id}
                onClick={() => setPeriode(p.id)}
                style  ={{
                  padding    : '0.45rem 0.875rem',
                  background : periode === p.id ? 'var(--vert-foret)' : 'transparent',
                  color      : periode === p.id ? 'var(--blanc)' : 'var(--gris-doux)',
                  border     : 'none',
                  fontFamily : 'var(--font-display)',
                  fontWeight : periode === p.id ? 700 : 500,
                  fontSize   : '0.78rem',
                  cursor     : 'pointer',
                  transition : 'all 0.15s ease',
                  whiteSpace : 'nowrap',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chargement */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner taille="lg" texte="Chargement des statistiques..." />
          </div>
        )}

        {/* Erreur */}
        {isError && !isLoading && (
          <div style={{
            background  : '#FEF2F2',
            border      : '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding     : '2rem',
            textAlign   : 'center',
          }}>
            <p style={{ color: 'var(--rouge-erreur)', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1rem' }}>
              Erreur de chargement du tableau de bord
            </p>
            <button
              onClick={() => refetch()}
              style={{ padding: '0.5rem 1.25rem', background: 'var(--vert-foret)', color: 'var(--blanc)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Réessayer
            </button>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* ── Alertes intelligentes ── */}
            {alertes.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {alertes.map((a, i) => (
                  <AlerteCard key={i} type={a.type} texte={a.texte} />
                ))}
              </div>
            )}

            {/* ── Grille KPIs ── */}
            <div style={{
              display            : 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
              gap                : '1rem',
              marginBottom       : '1.5rem',
            }}>
              <KPICard
                icone     ="💰"
                label     ="Chiffre d'affaires"
                valeur    ={formaterPrix(s.chiffre_affaires || 0)}
                couleur   ="var(--vert-foret)"
                accent
                sousTitre ={`Moy. ${formaterPrix(s.revenu_moyen_voyage || 0)}/billet`}
              />
              <KPICard
                icone    ="🎫"
                label    ="Billets confirmés"
                valeur   ={s.reservations_confirmees || 0}
                couleur  ="#1D4ED8"
                sousTitre={`${s.total_reservations || 0} au total`}
              />
              <KPICard
                icone    ="👥"
                label    ="Passagers transportés"
                valeur   ={s.total_passagers || 0}
                couleur  ="#7C3AED"
                sousTitre={`${s.reservations_attente || 0} en attente`}
              />
              <KPICard
                icone    ="🚌"
                label    ="Voyages programmés"
                valeur   ={s.voyages_programmes || 0}
                couleur  ="#D97706"
                sousTitre={`${s.voyages_termines || 0} terminés`}
              />
              <KPICard
                icone    ="📊"
                label    ="Taux de remplissage"
                valeur   ={`${s.taux_remplissage_moyen || 0}%`}
                couleur  ={s.taux_remplissage_moyen >= 70 ? 'var(--vert-foret)' : '#D97706'}
                sousTitre="Moyenne par voyage"
              />
              <KPICard
                icone    ="🚍"
                label    ="Bus actifs"
                valeur   ={`${sb.bus_actifs || 0} / ${sb.total_bus || 0}`}
                couleur  ="var(--ardoise)"
                sousTitre={`${sb.capacite_totale || 0} places au total`}
              />
            </div>

            {/* ── Graphiques ── */}
            <div style={{
              display            : 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap                : '1.25rem',
              marginBottom       : '1.25rem',
            }}
            className="dashboard-grid-2"
            >
              {/* Graphique CA */}
              <div style={{
                background  : 'var(--blanc)',
                borderRadius: 'var(--radius-md)',
                padding     : '1.25rem',
                border      : '1px solid var(--gris-bord)',
                boxShadow   : 'var(--ombre-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ardoise)', margin: 0 }}>
                    Évolution du chiffre d'affaires
                  </h2>
                  <span style={{
                    background  : 'var(--vert-pale)',
                    color       : 'var(--vert-foret)',
                    padding     : '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontSize    : '0.72rem',
                    fontFamily  : 'var(--font-display)',
                    fontWeight  : 700,
                  }}>
                    {PERIODES.find(p => p.id === periode)?.label}
                  </span>
                </div>
                <GraphiqueCA data={evolution} periode={periode} />
              </div>

              {/* Top destinations */}
              <div style={{
                background  : 'var(--blanc)',
                borderRadius: 'var(--radius-md)',
                padding     : '1.25rem',
                border      : '1px solid var(--gris-bord)',
                boxShadow   : 'var(--ombre-sm)',
              }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ardoise)', marginBottom: '1rem' }}>
                  Top destinations
                </h2>
                {top.length > 0 ? (
                  top.map((dest, i) => (
                    <BarreProgression
                      key   ={i}
                      label ={dest.ville_arrivee}
                      valeur={dest.nb}
                      max   ={maxDest}
                      couleur={
                        i === 0 ? 'var(--or-soleil)'
                        : i === 1 ? 'var(--vert-clair)'
                        : 'var(--vert-foret)'
                      }
                      extra={`${Math.round((dest.nb / maxDest) * 100)}%`}
                    />
                  ))
                ) : (
                  <p style={{ color: 'var(--gris-doux)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                    Aucune donnée
                  </p>
                )}
              </div>
            </div>

            {/* ── Prochains voyages + Actions rapides ── */}
            <div style={{
              display            : 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap                : '1.25rem',
              marginBottom       : '1.25rem',
            }}
            className="dashboard-grid-2"
            >
              {/* Prochains départs */}
              <div style={{
                background  : 'var(--blanc)',
                borderRadius: 'var(--radius-md)',
                padding     : '1.25rem',
                border      : '1px solid var(--gris-bord)',
                boxShadow   : 'var(--ombre-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ardoise)', margin: 0 }}>
                    Prochains départs (7 jours)
                  </h2>
                  <button
                    onClick={() => navigate('/agent/voyages')}
                    style={{ background: 'none', border: 'none', color: 'var(--vert-clair)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Voir tout →
                  </button>
                </div>

                {prochains.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gris-doux)', fontSize: '0.85rem' }}>
                    Aucun voyage dans les 7 prochains jours
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--gris-bord)', background: '#F9FAFB' }}>
                          {['Trajet', 'Départ', 'Places', 'Prix'].map(col => (
                            <th key={col} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.7rem', color: 'var(--gris-doux)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prochains.map(v => {
                          const places      = v.places_disponibles ?? 0
                          const placesColor = places === 0 ? 'var(--rouge-erreur)' : places <= 5 ? '#D97706' : 'var(--vert-foret)'
                          return (
                            <tr
                              key   ={v.id}
                              style ={{ borderBottom: '1px solid var(--gris-bord)', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--creme)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              onClick={() => navigate('/agent/voyages')}
                            >
                              <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ardoise)', whiteSpace: 'nowrap' }}>
                                {v.ville_depart_display} → {v.ville_arrivee_display}
                              </td>
                              <td style={{ padding: '0.7rem 0.75rem', color: 'var(--ardoise)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {new Date(v.date_heure_depart).toLocaleDateString('fr-FR', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td style={{ padding: '0.7rem 0.75rem' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: placesColor, fontSize: '0.88rem' }}>
                                  {places}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--vert-foret)', whiteSpace: 'nowrap' }}>
                                {formaterPrix(v.prix)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div style={{
                background  : 'var(--blanc)',
                borderRadius: 'var(--radius-md)',
                padding     : '1.25rem',
                border      : '1px solid var(--gris-bord)',
                boxShadow   : 'var(--ombre-sm)',
              }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ardoise)', marginBottom: '1rem' }}>
                  Actions rapides
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { label: 'Publier un voyage',    icone: '🚌', path: '/agent/voyages',      couleur: 'var(--vert-foret)', bg: 'var(--vert-pale)'  },
                    { label: 'Voir réservations',    icone: '🎫', path: '/agent/reservations', couleur: '#1D4ED8',           bg: '#EFF6FF'           },
                    { label: 'Gérer la flotte',      icone: '🚍', path: '/agent/bus',          couleur: '#7C3AED',           bg: '#F5F3FF'           },
                    { label: 'Liste des voyageurs',  icone: '👥', path: '/agent/voyageurs',    couleur: '#D97706',           bg: '#FFFBEB'           },
                  ].map(({ label, icone, path, couleur, bg }) => (
                    <button
                      key    ={path}
                      onClick={() => navigate(path)}
                      style  ={{
                        background  : bg,
                        border      : `1px solid ${couleur}30`,
                        borderRadius: 'var(--radius-sm)',
                        padding     : '0.75rem 1rem',
                        display     : 'flex',
                        alignItems  : 'center',
                        gap         : '0.75rem',
                        cursor      : 'pointer',
                        transition  : 'all 0.15s ease',
                        textAlign   : 'left',
                        width       : '100%',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform   = 'translateX(3px)'
                        e.currentTarget.style.borderColor = couleur
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform   = 'none'
                        e.currentTarget.style.borderColor = `${couleur}30`
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>{icone}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: couleur }}>
                        {label}
                      </span>
                      <span style={{ marginLeft: 'auto', color: couleur, fontSize: '0.8rem' }}>→</span>
                    </button>
                  ))}
                </div>

                {/* Mini stat rapide */}
                {s.chiffre_affaires > 0 && (
                  <div style={{
                    marginTop   : '1rem',
                    background  : 'var(--vert-pale)',
                    borderRadius: 'var(--radius-sm)',
                    padding     : '0.75rem',
                    textAlign   : 'center',
                  }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', marginBottom: '0.2rem' }}>
                      Revenu {PERIODES.find(p => p.id === periode)?.label.toLowerCase()}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--vert-foret)' }}>
                      {formaterPrix(s.chiffre_affaires)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AgentLayout>
  )
}

export default AgentDashboard