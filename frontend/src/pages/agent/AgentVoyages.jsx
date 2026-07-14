//  ============================================================
//  RÔLE : Gestion complète des voyages de l'agence
//
// LOGIQUE :
//   PROGRAMME  → départ > maintenant (réservable)
//   EN_COURS   → en train de se dérouler maintenant
//   TERMINE    → départ passé + durée écoulée
//   ANNULE     → annulé
//
// ONGLETS :
//   "Programmés" → PROGRAMME uniquement
//   "En cours"   → EN_COURS
//   "Terminés"   → TERMINE
//   "Annulés"    → ANNULE
// ============================================================

import { useState }    from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AgentLayout     from '../../components/agent/AgentLayout'
import Button          from '../../components/ui/Button'
import Spinner         from '../../components/ui/Spinner'
// import Badge           from '../../components/ui/Badge'
import { formaterPrix } from '../../utils/formatPrix'
import {
  getAgentVoyages, creerVoyageAgent,
  modifierVoyageAgent, supprimerVoyageAgent, getAgentBus,
} from '../../services/agentService'

const ONGLETS = [
  { id: 'PROGRAMME', label: 'Programmés', couleur: 'var(--vert-foret)' },
  { id: 'EN_COURS',  label: 'En cours',   couleur: '#D97706'           },
  { id: 'TERMINE',   label: 'Terminés',   couleur: 'var(--gris-doux)'  },
  { id: 'ANNULE',    label: 'Annulés',    couleur: 'var(--rouge-erreur)'},
]

const VILLES = [
  { v:'YAOUNDE',l:'Yaoundé'},{ v:'DOUALA',l:'Douala'},
  { v:'BAFOUSSAM',l:'Bafoussam'},{ v:'BAMENDA',l:'Bamenda'},
  { v:'GAROUA',l:'Garoua'},{ v:'MAROUA',l:'Maroua'},
  { v:'BERTOUA',l:'Bertoua'},{ v:'BUEA',l:'Buea'},
  { v:'LIMBE',l:'Limbé'},{ v:'EBOLOWA',l:'Ébolowa'},
  { v:'NGAOUNDERE',l:'Ngaoundéré'},{ v:'KRIBI',l:'Kribi'},
]

// ── Formulaire voyage ─────────────────────────────────────────
const FormulaireVoyage = ({ initial, bus, onSave, onAnnuler, chargement }) => {
  const [form, setForm] = useState(initial || {
    bus:'', ville_depart:'', ville_arrivee:'',
    date_heure_depart:'', duree_estimee:'04:00:00',
    prix:'', statut:'PROGRAMME',
  })
  const [erreurs, setErreurs] = useState({})

  const champ = (e) => {
    setErreurs({})
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const valider = () => {
    const e = {}
    if (!form.bus)               e.bus = 'Choisissez un bus'
    if (!form.ville_depart)      e.ville_depart = 'Obligatoire'
    if (!form.ville_arrivee)     e.ville_arrivee = 'Obligatoire'
    if (form.ville_depart === form.ville_arrivee) e.ville_arrivee = 'Différente du départ'
    if (!form.date_heure_depart) e.date_heure_depart = 'Obligatoire'
    if (!form.prix || isNaN(Number(form.prix))) e.prix = 'Prix invalide'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const st = (nom) => ({
    width:'100%', padding:'0.65rem 0.875rem', outline:'none',
    border: `1.5px solid ${erreurs[nom] ? 'var(--rouge-erreur)' : 'var(--gris-bord)'}`,
    borderRadius:'var(--radius-sm)', fontSize:'0.9rem',
    fontFamily:'var(--font-body)', background:'var(--creme)',
  })
  const lb = { fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.8rem', color:'var(--ardoise)', display:'block', marginBottom:'0.3rem' }

  return (
    <form onSubmit={e => { e.preventDefault(); if (valider()) onSave(form) }}
      style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>

        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lb}>Bus *</label>
          <select name="bus" value={form.bus} onChange={champ} style={st('bus')}>
            <option value="">Choisir un bus</option>
            {bus.map(b => <option key={b.id} value={b.id}>{b.immatriculation} — {b.type_bus} ({b.capacite} places)</option>)}
          </select>
          {erreurs.bus && <span style={{ fontSize:'0.75rem', color:'var(--rouge-erreur)' }}>{erreurs.bus}</span>}
        </div>

        {[
          { name:'ville_depart',  label:'Ville de départ *'  },
          { name:'ville_arrivee', label:"Ville d'arrivée *" },
        ].map(({ name, label }) => (
          <div key={name}>
            <label style={lb}>{label}</label>
            <select name={name} value={form[name]} onChange={champ} style={st(name)}>
              <option value="">Choisir</option>
              {VILLES.map(v => <option key={v.v} value={v.v}>{v.l}</option>)}
            </select>
            {erreurs[name] && <span style={{ fontSize:'0.75rem', color:'var(--rouge-erreur)' }}>{erreurs[name]}</span>}
          </div>
        ))}

        <div>
          <label style={lb}>Date et heure de départ *</label>
          <input type="datetime-local" name="date_heure_depart" value={form.date_heure_depart} onChange={champ} style={st('date_heure_depart')} />
          {erreurs.date_heure_depart && <span style={{ fontSize:'0.75rem', color:'var(--rouge-erreur)' }}>{erreurs.date_heure_depart}</span>}
        </div>

        <div>
          <label style={lb}>Durée estimée (HH:MM:SS)</label>
          <input type="text" name="duree_estimee" value={form.duree_estimee} onChange={champ} placeholder="04:00:00" style={st('duree_estimee')} />
        </div>

        <div>
          <label style={lb}>Prix (FCFA) *</label>
          <input type="number" name="prix" value={form.prix} onChange={champ} placeholder="3500" style={st('prix')} min="0" />
          {erreurs.prix && <span style={{ fontSize:'0.75rem', color:'var(--rouge-erreur)' }}>{erreurs.prix}</span>}
        </div>

        <div>
          <label style={lb}>Statut</label>
          <select name="statut" value={form.statut} onChange={champ} style={st('statut')}>
            <option value="PROGRAMME">Programmé</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>
      </div>

      <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
        <Button variante="fantome" onClick={onAnnuler} type="button">Annuler</Button>
        <Button variante="primaire" chargement={chargement} type="submit">
          {initial ? 'Enregistrer' : 'Créer le voyage'}
        </Button>
      </div>
    </form>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export const Modal = ({ titre, onFermer, children }) => (
  <>
    <div onClick={onFermer} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, backdropFilter:'blur(2px)' }} />
    <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--blanc)', borderRadius:'var(--radius-lg)', padding:'2rem', width:'min(600px, 95vw)', maxHeight:'90vh', overflowY:'auto', zIndex:201, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', color:'var(--ardoise)', margin:0 }}>{titre}</h2>
        <button onClick={onFermer} style={{ background:'#F3F4F6', border:'none', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      {children}
    </div>
  </>
)

// ── Composant principal ───────────────────────────────────────
const AgentVoyages = () => {
  const queryClient = useQueryClient()
  const [onglet,       setOnglet]       = useState('PROGRAMME')
  const [modalOuvert,  setModalOuvert]  = useState(false)
  const [voyageEdit,   setVoyageEdit]   = useState(null)
  const [confirmerSup, setConfirmerSup] = useState(null)

  // Charge tous les voyages de l'agence
  const { data: tousVoyages = [], isLoading } = useQuery({
    queryKey: ['agent-voyages-tous'],
    queryFn : () => getAgentVoyages(),
    staleTime: 30000,
    refetchInterval: 2 * 60 * 1000,  // Rafraîchit toutes les 2 min
  })

  const { data: bus = [] } = useQuery({
    queryKey: ['agent-bus'],
    queryFn : getAgentBus,
  })

  // ── Mise à jour statuts côté client ──────────────────────────
  // Logique miroir du backend pour affichage immédiat
  const maintenant = new Date()

  const getStatutCalcule = (voyage) => {
    if (voyage.statut === 'ANNULE') return 'ANNULE'
    const depart = new Date(voyage.date_heure_depart)
    if (depart > maintenant)                  return 'PROGRAMME'
    // Durée estimée approximation (12h max si pas connue)
    const dureeMs = voyage.duree_estimee ? parseDuree(voyage.duree_estimee) : 12 * 3600 * 1000
    const arrivee = new Date(depart.getTime() + dureeMs)
    if (arrivee > maintenant) return 'EN_COURS'
    return 'TERMINE'
  }

  const parseDuree = (dureeStr) => {
    const [h, m, s] = (dureeStr || '04:00:00').split(':').map(Number)
    return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000
  }

  // Voyages enrichis avec statut calculé
  const voyagesEnrichis = tousVoyages.map(v => ({
    ...v,
    statut_affiche: getStatutCalcule(v),
  }))

  // Filtre par onglet
  const voyagesFiltres = voyagesEnrichis.filter(v => v.statut_affiche === onglet)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agent-voyages-tous'] })

  const mutCreate = useMutation({
    mutationFn: creerVoyageAgent,
    onSuccess : () => { invalidate(); setModalOuvert(false) },
  })
  const mutUpdate = useMutation({
    mutationFn: ({ id, data }) => modifierVoyageAgent(id, data),
    onSuccess : () => { invalidate(); setVoyageEdit(null) },
  })
  const mutDelete = useMutation({
    mutationFn: supprimerVoyageAgent,
    onSuccess : () => { invalidate(); setConfirmerSup(null) },
  })

  const STATUT_STYLE = {
    PROGRAMME: { bg:'var(--vert-pale)',  color:'var(--vert-foret)'   },
    EN_COURS : { bg:'#FEF3C7',           color:'#92400E'             },
    TERMINE  : { bg:'#F3F4F6',           color:'var(--gris-doux)'    },
    ANNULE   : { bg:'#FEE2E2',           color:'var(--rouge-erreur)' },
  }

  // Compteurs par statut
  const compteurs = {
    PROGRAMME: voyagesEnrichis.filter(v => v.statut_affiche === 'PROGRAMME').length,
    EN_COURS : voyagesEnrichis.filter(v => v.statut_affiche === 'EN_COURS').length,
    TERMINE  : voyagesEnrichis.filter(v => v.statut_affiche === 'TERMINE').length,
    ANNULE   : voyagesEnrichis.filter(v => v.statut_affiche === 'ANNULE').length,
  }

  return (
    <AgentLayout titre="Gestion des voyages">

      {/* Onglets */}
      <div style={{ display:'flex', gap:'0', background:'var(--blanc)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:'1.5rem', border:'1px solid var(--gris-bord)' }}>
        {ONGLETS.map(({ id, label, couleur }) => (
          <button
            key    ={id}
            onClick={() => setOnglet(id)}
            style  ={{
              flex       : 1,
              padding    : '0.75rem 1rem',
              background : onglet === id ? couleur : 'transparent',
              color      : onglet === id ? 'var(--blanc)' : 'var(--gris-doux)',
              border     : 'none',
              fontFamily : 'var(--font-display)',
              fontWeight : onglet === id ? 700 : 500,
              fontSize   : '0.85rem',
              cursor     : 'pointer',
              transition : 'all 0.15s ease',
              display    : 'flex',
              alignItems : 'center',
              justifyContent: 'center',
              gap        : '0.4rem',
            }}
          >
            {label}
            {compteurs[id] > 0 && (
              <span style={{ background: onglet === id ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: onglet === id ? 'var(--blanc)' : 'var(--ardoise)', borderRadius:'999px', fontSize:'0.7rem', padding:'0.1rem 0.45rem', fontWeight:700 }}>
                {compteurs[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bouton nouveau voyage (seulement dans Programmés) */}
      {onglet === 'PROGRAMME' && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
          <Button variante="primaire" onClick={() => setModalOuvert(true)}>
            <span aria-hidden="true">➕</span> Nouveau voyage
          </Button>
        </div>
      )}

      {/* Modals */}
      {modalOuvert && (
        <Modal titre="Créer un voyage" onFermer={() => setModalOuvert(false)}>
          <FormulaireVoyage bus={bus} chargement={mutCreate.isPending}
            onSave={(data) => mutCreate.mutate(data)} onAnnuler={() => setModalOuvert(false)} />
        </Modal>
      )}
      {voyageEdit && (
        <Modal titre="Modifier le voyage" onFermer={() => setVoyageEdit(null)}>
          <FormulaireVoyage initial={{ ...voyageEdit, bus: voyageEdit.bus?.id || voyageEdit.bus }}
            bus={bus} chargement={mutUpdate.isPending}
            onSave={(data) => mutUpdate.mutate({ id: voyageEdit.id, data })}
            onAnnuler={() => setVoyageEdit(null)} />
        </Modal>
      )}
      {confirmerSup && (
        <Modal titre="Confirmer la suppression" onFermer={() => setConfirmerSup(null)}>
          <p style={{ color:'var(--ardoise)', marginBottom:'1.5rem', lineHeight:1.6 }}>
            Supprimer le voyage <strong>{confirmerSup.ville_depart_display} → {confirmerSup.ville_arrivee_display}</strong> ?
          </p>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <Button variante="fantome" onClick={() => setConfirmerSup(null)}>Annuler</Button>
            <Button variante="danger" chargement={mutDelete.isPending} onClick={() => mutDelete.mutate(confirmerSup.id)}>Supprimer</Button>
          </div>
        </Modal>
      )}

      {/* Tableau */}
      {isLoading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><Spinner taille="lg" /></div>
      ) : voyagesFiltres.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem', background:'var(--blanc)', borderRadius:'var(--radius-lg)', border:'1.5px dashed var(--gris-bord)' }}>
          <p style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🚌</p>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--ardoise)' }}>
            Aucun voyage {ONGLETS.find(o => o.id === onglet)?.label.toLowerCase()}
          </p>
          {onglet === 'PROGRAMME' && (
            <Button variante="primaire" style={{ marginTop:'1rem' }} onClick={() => setModalOuvert(true)}>
              Créer le premier voyage
            </Button>
          )}
        </div>
      ) : (
        <div style={{ background:'var(--blanc)', borderRadius:'var(--radius-md)', border:'1px solid var(--gris-bord)', boxShadow:'var(--ombre-sm)', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--gris-bord)', background:'#F9FAFB' }}>
                {['Trajet', 'Date départ', 'Prix', 'Places', 'Statut',
                  ...(onglet === 'PROGRAMME' ? ['Actions'] : [])
                ].map(col => (
                  <th key={col} style={{ padding:'0.75rem 1rem', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.72rem', color:'var(--gris-doux)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {voyagesFiltres.map(v => {
                const ss = STATUT_STYLE[v.statut_affiche] || STATUT_STYLE.TERMINE
                return (
                  <tr key={v.id} style={{ borderBottom:'1px solid var(--gris-bord)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--creme)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-display)', fontWeight:600, color:'var(--ardoise)', whiteSpace:'nowrap' }}>
                      {v.ville_depart_display} → {v.ville_arrivee_display}
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'var(--ardoise)', whiteSpace:'nowrap', fontSize:'0.82rem' }}>
                      {new Date(v.date_heure_depart).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--vert-foret)', whiteSpace:'nowrap' }}>
                      {formaterPrix(v.prix)}
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: v.places_disponibles <= 5 ? 'var(--rouge-erreur)' : 'var(--vert-foret)' }}>
                        {v.places_disponibles ?? '-'}
                      </span>
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <span style={{ background:ss.bg, color:ss.color, padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontFamily:'var(--font-display)', fontWeight:700 }}>
                        {v.statut_affiche}
                      </span>
                    </td>
                    {/* Actions seulement pour les voyages PROGRAMME */}
                    {onglet === 'PROGRAMME' && (
                      <td style={{ padding:'0.875rem 1rem' }}>
                        <div style={{ display:'flex', gap:'0.4rem' }}>
                          <button onClick={() => setVoyageEdit(v)} style={{ padding:'0.35rem 0.6rem', background:'#EFF6FF', border:'none', borderRadius:'var(--radius-sm)', color:'#1D4ED8', cursor:'pointer', fontSize:'0.8rem', fontFamily:'var(--font-display)', fontWeight:600 }}>✏️</button>
                          <button onClick={() => setConfirmerSup(v)} style={{ padding:'0.35rem 0.6rem', background:'#FEF2F2', border:'none', borderRadius:'var(--radius-sm)', color:'var(--rouge-erreur)', cursor:'pointer', fontSize:'0.8rem', fontFamily:'var(--font-display)', fontWeight:600 }}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AgentLayout>
  )
}

export default AgentVoyages

