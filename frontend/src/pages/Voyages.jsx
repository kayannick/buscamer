
// ============================================================
//
// RÈGLES :
//   ✅ data: voyagesBruts = [] (jamais undefined)
//   ✅ useMemo AVANT tout return conditionnel
//   ✅ Affiche uniquement voyages futurs (filtrés par le backend)
//   ✅ Badge "Dernier délai" si départ dans moins de 12h
//   ✅ Badge "Impossible" si départ dans moins de 5h
//   ✅ Pagination 10 par page
//   ✅ border shorthand seul — hover via useState
//   ✅ Emojis dans span aria-hidden
// ============================================================

import { useState, useMemo }        from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery }                 from '@tanstack/react-query'
import { rechercherVoyages }        from '../services/voyageService'
import { formaterPrix }             from '../utils/formatPrix'
import Badge                        from '../components/ui/Badge'
import Button                       from '../components/ui/Button'
//                     from '../components/ui/Spinner'
import PageWrapper                  from '../components/layout/PageWrapper'

const PAR_PAGE = 10

const VILLES = [
  { valeur: 'YAOUNDE',    label: 'Yaoundé'    },
  { valeur: 'DOUALA',     label: 'Douala'      },
  { valeur: 'BAFOUSSAM',  label: 'Bafoussam'   },
  { valeur: 'BAMENDA',    label: 'Bamenda'     },
  { valeur: 'GAROUA',     label: 'Garoua'      },
  { valeur: 'MAROUA',     label: 'Maroua'      },
  { valeur: 'BERTOUA',    label: 'Bertoua'     },
  { valeur: 'BUEA',       label: 'Buea'        },
  { valeur: 'LIMBE',      label: 'Limbé'       },
  { valeur: 'EBOLOWA',    label: 'Ébolowa'     },
  { valeur: 'NGAOUNDERE', label: 'Ngaoundéré'  },
  { valeur: 'KRIBI',      label: 'Kribi'       },
  { valeur: 'KUMBA',      label: 'Kumba'       },
  { valeur: 'DSCHANG',    label: 'Dschang'     },
  { valeur: 'FOUMBAN',    label: 'Foumban'     },
]

// ── Calcule les infos temporelles d'un voyage ────────────────
const getInfosTemporelles = (voyage) => {
  const maintenant  = new Date()
  const depart      = new Date(voyage.date_heure_depart)
  const diffMs      = depart - maintenant
  const diffHeures  = diffMs / (1000 * 60 * 60)

  return {
    estPasse        : diffMs <= 0,
    estDansLes5h    : diffHeures <= 5 && diffHeures > 0,
    estDansLes12h   : diffHeures <= 12 && diffHeures > 5,
    heuresRestantes : Math.max(0, diffHeures),
    peutReserver    : diffHeures > 5 && (voyage.places_disponibles ?? 0) > 0 && voyage.statut === 'PROGRAMME',
  }
}

// ── Select filtre ─────────────────────────────────────────────
const SelectFiltre = ({ value, onChange, children }) => (
  <select
    value={value} onChange={onChange}
    style={{
      padding:'0.55rem 2rem 0.55rem 0.75rem', borderRadius:'var(--radius-sm)',
      border:'none', fontSize:'0.88rem', background:'rgba(255,255,255,0.12)',
      color:'var(--blanc)', outline:'none', appearance:'none',
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='white' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
      backgroundRepeat:'no-repeat', backgroundPosition:'right 0.6rem center',
      fontFamily:'var(--font-body)', cursor:'pointer', width:'100%',
    }}
  >
    {children}
  </select>
)

// ── Pagination ────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onChangePage }) => {
  // ✅ Hook AVANT le return conditionnel
  const pages = useMemo(() => {
    const l = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) l.push(i)
    } else {
      l.push(1)
      if (page > 3) l.push('...')
      for (let i = Math.max(2, page-1); i <= Math.min(totalPages-1, page+1); i++) l.push(i)
      if (page < totalPages - 2) l.push('...')
      l.push(totalPages)
    }
    return l
  }, [page, totalPages])

  // ✅ return conditionnel APRÈS le hook
  if (totalPages <= 1) return null

  const btn = (actif) => ({
    minWidth:'36px', height:'36px', borderRadius:'var(--radius-sm)',
    border: actif ? '1.5px solid var(--vert-foret)' : '1.5px solid var(--gris-bord)',
    background: actif ? 'var(--vert-foret)' : 'var(--blanc)',
    color: actif ? 'var(--blanc)' : 'var(--ardoise)',
    fontFamily:'var(--font-display)', fontWeight: actif ? 700 : 500,
    fontSize:'0.85rem', cursor:'pointer', padding:'0 0.5rem',
    display:'flex', alignItems:'center', justifyContent:'center',
  })

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.3rem', marginTop:'2rem', flexWrap:'wrap' }}>
      <button onClick={() => onChangePage(page-1)} disabled={page===1} style={{ ...btn(false), opacity: page===1 ? 0.4:1, cursor: page===1 ? 'not-allowed':'pointer', padding:'0 0.875rem' }}>
        ← Préc.
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} style={{ ...btn(false), border:'none', background:'transparent', cursor:'default' }}>…</span>
        ) : (
          <button key={p} onClick={() => onChangePage(p)} style={btn(p === page)}>{p}</button>
        )
      )}
      <button onClick={() => onChangePage(page+1)} disabled={page===totalPages} style={{ ...btn(false), opacity: page===totalPages ? 0.4:1, cursor: page===totalPages ? 'not-allowed':'pointer', padding:'0 0.875rem' }}>
        Suiv. →
      </button>
    </div>
  )
}

// ── Carte voyage ──────────────────────────────────────────────
const CarteVoyage = ({ voyage, onClick }) => {
  const [hovered, setHovered] = useState(false)

  const infos     = getInfosTemporelles(voyage)
  const places    = voyage.places_disponibles ?? 0
  const complet   = places === 0
  const heure     = voyage.date_heure_depart?.split('T')[1]?.substring(0, 5) ?? '--:--'
  const dateStr   = voyage.date_heure_depart
    ? new Date(voyage.date_heure_depart).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'2-digit' })
    : ''

  // Couleur de la bordure selon disponibilité
  const couleurBord = infos.estDansLes5h ? '#FECACA'
    : infos.peutReserver ? 'var(--vert-clair)' : 'var(--gris-bord)'

  return (
    <article
      onClick     ={() => { if (infos.peutReserver) onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background  : 'var(--blanc)',
        borderRadius: 'var(--radius-md)',
        border      : hovered && infos.peutReserver
          ? `1.5px solid ${couleurBord}`
          : '1.5px solid var(--gris-bord)',
        padding     : '1.25rem 1.5rem',
        cursor      : infos.peutReserver ? 'pointer' : 'default',
        transition  : 'all var(--transition)',
        display     : 'grid',
        gridTemplateColumns: '1fr auto',
        gap         : '1rem',
        alignItems  : 'center',
        boxShadow   : hovered && infos.peutReserver ? 'var(--ombre-md)' : 'var(--ombre-sm)',
        transform   : hovered && infos.peutReserver ? 'translateY(-1px)' : 'none',
        opacity     : infos.estDansLes5h || complet ? 0.7 : 1,
      }}
    >
      <div>
        {/* Agence + badges */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.65rem', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', color:'var(--ardoise)' }}>
            {voyage.agence_nom}
          </span>
          {voyage.type_bus && <Badge statut={voyage.type_bus} />}

          {/* Badge temporel */}
          {infos.estDansLes5h && (
            <span style={{ background:'#FEE2E2', color:'#DC2626', padding:'0.15rem 0.5rem', borderRadius:'999px', fontSize:'0.7rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
              <span aria-hidden="true">⏰</span>{' '}Réservation fermée
            </span>
          )}
          {infos.estDansLes12h && !infos.estDansLes5h && (
            <span style={{ background:'#FFF3CD', color:'#92400E', padding:'0.15rem 0.5rem', borderRadius:'999px', fontSize:'0.7rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
              <span aria-hidden="true">⚡</span>{' '}Dernier délai
            </span>
          )}
        </div>

        {/* Trajet */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.65rem' }}>
          <div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem', color:'var(--ardoise)', lineHeight:1 }}>{heure}</p>
            <p style={{ color:'var(--gris-doux)', fontSize:'0.78rem', marginTop:'2px' }}>{voyage.ville_depart_display}</p>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <div style={{ flex:1, height:'1.5px', background:'var(--gris-bord)' }} />
            <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
              <path d="M0 4h13M9 1l4 3-4 3" stroke="var(--vert-clair)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.5rem', color:'var(--ardoise)', lineHeight:1 }}>{voyage.ville_arrivee_display}</p>
            <p style={{ color:'var(--gris-doux)', fontSize:'0.78rem', marginTop:'2px' }}>{dateStr}</p>
          </div>
        </div>

        {/* Indicateur places */}
        <p style={{ fontSize:'0.78rem', color: complet ? 'var(--rouge-erreur)' : infos.estDansLes5h ? '#DC2626' : places <= 5 ? '#D97706' : 'var(--gris-doux)', fontWeight: places <= 5 ? 600 : 400, display:'flex', alignItems:'center', gap:'0.3rem' }}>
          <span aria-hidden="true">{complet ? '🔴' : infos.estDansLes5h ? '🔒' : places <= 5 ? '🟠' : '🟢'}</span>
          {complet ? 'Complet'
            : infos.estDansLes5h ? `Réservations fermées (départ dans ${Math.round(infos.heuresRestantes * 60)} min)`
            : places <= 5 ? `Plus que ${places} place${places > 1 ? 's' : ''}`
            : `${places} places disponibles`}
        </p>
      </div>

      {/* Prix + CTA */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'1.4rem', color:'var(--vert-foret)', lineHeight:1, marginBottom:'4px' }}>
          {formaterPrix(voyage.prix)}
        </p>
        <p style={{ fontSize:'0.7rem', color:'var(--gris-doux)', marginBottom:'8px' }}>par personne</p>
        <Button
          variante={infos.peutReserver ? 'or' : 'fantome'}
          taille="sm"
          disabled={!infos.peutReserver}
          onClick={(e) => { e.stopPropagation(); if (infos.peutReserver) onClick() }}
        >
          {complet ? 'Complet' : infos.estDansLes5h ? 'Fermé' : 'Réserver'}
        </Button>
      </div>
    </article>
  )
}

// ── Composant principal ───────────────────────────────────────
const Voyages = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const today    = new Date().toISOString().split('T')[0]

  const [filtres, setFiltres] = useState({
    ville_depart  : location.state?.ville_depart  || '',
    ville_arrivee : location.state?.ville_arrivee || '',
    date          : location.state?.date          || '',
    type_bus      : '',
    tri           : 'date',
  })
  const [page, setPage] = useState(1)

  const majFiltre = (champ, valeur) => {
    setFiltres(prev => ({ ...prev, [champ]: valeur }))
    setPage(1)
  }

  const paramsApi = useMemo(() => {
    const p = {}
    if (filtres.ville_depart)  p.ville_depart  = filtres.ville_depart
    if (filtres.ville_arrivee) p.ville_arrivee = filtres.ville_arrivee
    if (filtres.date)          p.date          = filtres.date
    return p
  }, [filtres.ville_depart, filtres.ville_arrivee, filtres.date])

  // ✅ data: voyagesBruts = [] — jamais undefined
  const {
    data     : voyagesBruts = [],
    isLoading: chargement,
    isError,
    refetch,
  } = useQuery({
    queryKey            : ['voyages-liste', paramsApi],
    queryFn             : () => rechercherVoyages(paramsApi),
    staleTime           : 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval     : 5 * 60 * 1000,  // Rafraîchit toutes les 5min
  })

  // ✅ useMemo AVANT tout return conditionnel
  const voyagesFiltres = useMemo(() => {
    const source = Array.isArray(voyagesBruts) ? voyagesBruts : []
    let liste = [...source]

    if (filtres.type_bus) {
      liste = liste.filter(v => v.type_bus === filtres.type_bus)
    }

    liste.sort((a, b) => {
      switch (filtres.tri) {
        case 'prix_asc' : return parseFloat(a.prix||0) - parseFloat(b.prix||0)
        case 'prix_desc': return parseFloat(b.prix||0) - parseFloat(a.prix||0)
        case 'places'   : return (b.places_disponibles??0) - (a.places_disponibles??0)
        default         : return new Date(a.date_heure_depart) - new Date(b.date_heure_depart)
      }
    })

    return liste
  }, [voyagesBruts, filtres.type_bus, filtres.tri])

  const totalPages  = Math.max(1, Math.ceil(voyagesFiltres.length / PAR_PAGE))
  const voyagesPage = voyagesFiltres.slice((page-1)*PAR_PAGE, page*PAR_PAGE)

  const handleChangePage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEffacer = () => {
    setFiltres({ ville_depart:'', ville_arrivee:'', date:'', type_bus:'', tri:'date' })
    setPage(1)
  }

  const optionsVilles = (
    <>
      <option value="" style={{ background:'var(--ardoise)' }}>Toutes les villes</option>
      {VILLES.map(v => (
        <option key={v.valeur} value={v.valeur} style={{ background:'var(--ardoise)' }}>{v.label}</option>
      ))}
    </>
  )

  const labelStyle = { display:'block', fontSize:'0.66rem', fontWeight:700, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.3rem' }

  return (
    <PageWrapper titre="BusCam — Voyages disponibles">

      {/* Barre de filtres */}
      <div style={{ background:'var(--vert-foret)', padding:'1.25rem 0', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 12px rgba(0,0,0,0.18)' }}>
        <div className="conteneur">
          <div className="filtres-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 150px 130px 150px auto', gap:'0.65rem', alignItems:'end' }}>

            <div><label style={labelStyle}>Départ</label>
              <SelectFiltre value={filtres.ville_depart} onChange={e => majFiltre('ville_depart', e.target.value)}>{optionsVilles}</SelectFiltre>
            </div>
            <div><label style={labelStyle}>Arrivée</label>
              <SelectFiltre value={filtres.ville_arrivee} onChange={e => majFiltre('ville_arrivee', e.target.value)}>{optionsVilles}</SelectFiltre>
            </div>
            <div><label style={labelStyle}>Date</label>
              <input type="date" value={filtres.date} min={today} onChange={e => majFiltre('date', e.target.value)}
                style={{ padding:'0.55rem 0.75rem', borderRadius:'var(--radius-sm)', border:'none', fontSize:'0.88rem', background:'rgba(255,255,255,0.12)', color:'var(--blanc)', outline:'none', fontFamily:'var(--font-body)', width:'100%', colorScheme:'dark' }}
              />
            </div>
            <div><label style={labelStyle}>Type</label>
              <SelectFiltre value={filtres.type_bus} onChange={e => majFiltre('type_bus', e.target.value)}>
                <option value="" style={{ background:'var(--ardoise)' }}>Tous</option>
                <option value="CLASSIQUE" style={{ background:'var(--ardoise)' }}>Classique</option>
                <option value="VIP" style={{ background:'var(--ardoise)' }}>VIP</option>
                <option value="BUSINESS" style={{ background:'var(--ardoise)' }}>Business</option>
              </SelectFiltre>
            </div>
            <div><label style={labelStyle}>Trier par</label>
              <SelectFiltre value={filtres.tri} onChange={e => majFiltre('tri', e.target.value)}>
                <option value="date" style={{ background:'var(--ardoise)' }}>Heure départ</option>
                <option value="prix_asc" style={{ background:'var(--ardoise)' }}>Prix ↑</option>
                <option value="prix_desc" style={{ background:'var(--ardoise)' }}>Prix ↓</option>
                <option value="places" style={{ background:'var(--ardoise)' }}>Places dispo</option>
              </SelectFiltre>
            </div>

            {(filtres.ville_depart || filtres.ville_arrivee || filtres.date || filtres.type_bus) && (
              <button onClick={handleEffacer} style={{ padding:'0.55rem 0.875rem', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--radius-sm)', color:'rgba(255,255,255,0.75)', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:'0.82rem', whiteSpace:'nowrap' }}>
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="conteneur" style={{ padding:'1.75rem 1rem 2rem' }}>

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.5rem' }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.3rem', color:'var(--ardoise)', marginBottom:'0.2rem' }}>
              {filtres.ville_depart && filtres.ville_arrivee
                ? `${VILLES.find(v=>v.valeur===filtres.ville_depart)?.label} → ${VILLES.find(v=>v.valeur===filtres.ville_arrivee)?.label}`
                : 'Tous les voyages disponibles'
              }
            </h1>
            <p style={{ color:'var(--gris-doux)', fontSize:'0.85rem' }}>
              {chargement ? 'Chargement...' : `${voyagesFiltres.length} voyage${voyagesFiltres.length!==1?'s':''} disponible${voyagesFiltres.length!==1?'s':''}`}
            </p>
          </div>
          {!chargement && voyagesFiltres.length > 0 && (
            <span style={{ background:'var(--vert-pale)', color:'var(--vert-foret)', padding:'0.3rem 0.875rem', borderRadius:'999px', fontSize:'0.78rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
              Page {page} / {totalPages}
            </span>
          )}
        </div>

        {/* Skeleton */}
        {chargement && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height:'130px', borderRadius:'var(--radius-md)', background:'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {/* Erreur */}
        {isError && !chargement && (
          <div style={{ textAlign:'center', padding:'3rem', background:'var(--blanc)', borderRadius:'var(--radius-lg)', border:'1px solid #FECACA' }}>
            <p style={{ color:'var(--rouge-erreur)', fontFamily:'var(--font-display)', fontWeight:600, marginBottom:'1rem' }}>Impossible de charger les voyages.</p>
            <Button variante="primaire" onClick={() => refetch()}>Réessayer</Button>
          </div>
        )}

        {/* Vide */}
        {!chargement && !isError && voyagesFiltres.length === 0 && (
          <div style={{ textAlign:'center', padding:'4rem 2rem', background:'var(--blanc)', borderRadius:'var(--radius-lg)', border:'1.5px dashed var(--gris-bord)' }}>
            <p style={{ fontSize:'3rem', marginBottom:'1rem' }}>🚌</p>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', color:'var(--ardoise)', marginBottom:'0.5rem' }}>Aucun voyage disponible</p>
            <p style={{ color:'var(--gris-doux)', fontSize:'0.875rem', marginBottom:'1.5rem' }}>Essayez une autre date ou un autre trajet.</p>
            <Button variante="secondaire" onClick={handleEffacer}>Voir tous les voyages</Button>
          </div>
        )}

        {/* Liste */}
        {!chargement && !isError && voyagesPage.length > 0 && (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              {voyagesPage.map(voyage => (
                <CarteVoyage
                  key    ={voyage.id}
                  voyage ={voyage}
                  onClick={() => navigate(`/voyages/${voyage.id}`)}
                />
              ))}
            </div>
            <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.78rem', color:'var(--gris-doux)', fontFamily:'var(--font-display)' }}>
              Affichage {(page-1)*PAR_PAGE+1} à {Math.min(page*PAR_PAGE, voyagesFiltres.length)} sur {voyagesFiltres.length} voyages
            </p>
            <Pagination page={page} totalPages={totalPages} onChangePage={handleChangePage} />
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) { .filtres-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .filtres-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </PageWrapper>
  )
}

export default Voyages

