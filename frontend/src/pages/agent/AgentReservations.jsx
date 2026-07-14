//  ============================================================
//  RÔLE : Liste et gestion des réservations de l'agence
//
// LOGIQUE :
//   EN_ATTENTE  → non payée + départ dans plus de 5h → peut être confirmée
//   CONFIRME    → payée → aucune action de modification
//   ANNULE      → expirée (départ passé OU dans moins de 5h non payée)
//              → affichée sans colonne actions
//   Aucune action de modification sur les voyages passés
// ============================================================

import { useState, useMemo }  from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AgentLayout     from '../../components/agent/AgentLayout'
import Spinner         from '../../components/ui/Spinner'
import Badge           from '../../components/ui/Badge'
import { formaterPrix } from '../../utils/formatPrix'
import { getAgentReservations, modifierStatutReservation, validerPaiementEspeces } from '../../services/agentService'

// ── Statut affiché d'une réservation ──────────────────────────
const getStatutAffiche = (r) => {
  const depart     = new Date(r.voyage?.date_heure_depart)
  const maintenant = new Date()
  const diffH      = (depart - maintenant) / (1000 * 60 * 60)

  // Départ passé ou dans moins de 5h + non payée → Annulé
  if (r.statut_paiement === 'EN_ATTENTE' && diffH <= 5) {
    return 'ANNULE_AUTO'  // annulé automatiquement
  }
  return r.statut_paiement
}

const AgentReservations = () => {
  const queryClient     = useQueryClient()
  const [onglet, setOnglet] = useState('EN_ATTENTE')
  const [recherche, setRecherche] = useState('')

  const { data: reservations = [], isLoading } = useQuery({
    queryKey            : ['agent-reservations'],
    queryFn             : () => getAgentReservations(),
    staleTime           : 15000,
    refetchOnWindowFocus: true,
    refetchInterval     : 60000,
  })

  // ── Enrichissement avec statut calculé ────────────────────
  const reservationsEnrichies = useMemo(() =>
    reservations.map(r => ({
      ...r,
      statut_calcule: getStatutAffiche(r),
    })),
    [reservations]
  )

  // ── Filtres par onglet ────────────────────────────────────
  const parOnglet = {
    EN_ATTENTE: reservationsEnrichies.filter(r => r.statut_calcule === 'EN_ATTENTE'),
    CONFIRME  : reservationsEnrichies.filter(r => r.statut_calcule === 'CONFIRME'),
    ANNULE    : reservationsEnrichies.filter(r =>
      r.statut_calcule === 'ANNULE' || r.statut_calcule === 'ANNULE_AUTO'
    ),
  }

  const reservationsFiltrees = (parOnglet[onglet] || []).filter(r => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      r.voyageur?.nom?.toLowerCase().includes(q)  ||
      r.voyageur?.telephone?.includes(q)           ||
      r.numero_billet?.toLowerCase().includes(q)
    )
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agent-reservations'] })

  const mutationMM = useMutation({
    mutationFn: ({ id, statut }) => modifierStatutReservation(id, statut),
    onSuccess  : invalidate,
  })
  const mutationEspeces = useMutation({
    mutationFn: validerPaiementEspeces,
    onSuccess  : (data) => { invalidate(); alert(data.message) },
    onError    : (err) => alert(err.response?.data?.erreur || 'Erreur'),
  })

  // Résumé
  const total     = reservations.length
  const confirmes = parOnglet.CONFIRME.length
  const attente   = parOnglet.EN_ATTENTE.length
  const caTotal   = parOnglet.CONFIRME.reduce((a, r) => a + (r.montant_paye || 0), 0)

  const ONGLETS_CONFIG = [
    { id:'EN_ATTENTE', label:'En attente',  count: parOnglet.EN_ATTENTE.length, couleur:'#D97706' },
    { id:'CONFIRME',   label:'Confirmés',   count: parOnglet.CONFIRME.length,   couleur:'var(--vert-foret)' },
    { id:'ANNULE',     label:'Annulés',     count: parOnglet.ANNULE.length,     couleur:'var(--rouge-erreur)' },
  ]

  return (
    <AgentLayout titre="Gestion des réservations">

      {/* Résumé */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total',         valeur: total,             color:'var(--ardoise)'    },
          { label:'Confirmés',     valeur: confirmes,         color:'var(--vert-foret)' },
          { label:'En attente',    valeur: attente,           color:'#D97706'           },
          { label:'CA confirmé',   valeur: formaterPrix(caTotal), color:'var(--vert-foret)' },
        ].map(({ label, valeur, color }) => (
          <div key={label} style={{ background:'var(--blanc)', borderRadius:'var(--radius-md)', padding:'1rem', border:'1px solid var(--gris-bord)' }}>
            <p style={{ fontSize:'0.72rem', color:'var(--gris-doux)', fontFamily:'var(--font-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.3rem' }}>{label}</p>
            <p style={{ fontFamily:'var(--font-mono)', fontWeight:800, fontSize:'1.25rem', color }}>{valeur}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', background:'var(--blanc)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:'1rem', border:'1px solid var(--gris-bord)' }}>
        {ONGLETS_CONFIG.map(({ id, label, count, couleur }) => (
          <button key={id} onClick={() => setOnglet(id)}
            style={{
              flex:1, padding:'0.7rem 1rem',
              background: onglet === id ? couleur : 'transparent',
              color: onglet === id ? 'var(--blanc)' : 'var(--gris-doux)',
              border:'none', fontFamily:'var(--font-display)',
              fontWeight: onglet === id ? 700 : 500, fontSize:'0.85rem',
              cursor:'pointer', transition:'all 0.15s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem',
            }}
          >
            {label}
            {count > 0 && (
              <span style={{ background: onglet === id ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: onglet === id ? 'var(--blanc)' : 'var(--ardoise)', borderRadius:'999px', fontSize:'0.7rem', padding:'0.1rem 0.45rem', fontWeight:700 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ marginBottom:'1rem' }}>
        <input
          type="text" placeholder="🔍 Rechercher (nom, téléphone, billet...)"
          value={recherche} onChange={e => setRecherche(e.target.value)}
          style={{ width:'100%', padding:'0.65rem 1rem', border:'1px solid var(--gris-bord)', borderRadius:'var(--radius-sm)', fontSize:'0.85rem', fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><Spinner taille="lg" /></div>
      ) : reservationsFiltrees.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', background:'var(--blanc)', borderRadius:'var(--radius-lg)', border:'1.5px dashed var(--gris-bord)' }}>
          <p style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🎫</p>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--ardoise)' }}>Aucune réservation dans cet onglet</p>
        </div>
      ) : (
        <div style={{ background:'var(--blanc)', borderRadius:'var(--radius-md)', border:'1px solid var(--gris-bord)', boxShadow:'var(--ombre-sm)', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--gris-bord)', background:'#F9FAFB' }}>
                {[
                  'N° Billet', 'Voyageur', 'Trajet', 'Date voyage',
                  'Siège', 'Montant', 'Statut',
                  // Colonne Actions seulement pour EN_ATTENTE
                  ...(onglet === 'EN_ATTENTE' ? ['Actions'] : []),
                ].map(col => (
                  <th key={col} style={{ padding:'0.75rem 1rem', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.72rem', color:'var(--gris-doux)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservationsFiltrees.map(r => {
                const estExpire = r.statut_calcule === 'ANNULE_AUTO'

                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid var(--gris-bord)', opacity: estExpire ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--creme)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--gris-doux)' }}>
                      {r.numero_billet?.substring(0, 12).toUpperCase()}…
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--ardoise)', fontSize:'0.85rem', marginBottom:'1px' }}>{r.voyageur?.nom}</p>
                      <p style={{ fontSize:'0.75rem', color:'var(--gris-doux)' }}>{r.voyageur?.telephone}</p>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-display)', fontWeight:500, color:'var(--ardoise)', whiteSpace:'nowrap' }}>
                      {r.voyage?.ville_depart} → {r.voyage?.ville_arrivee}
                    </td>
                    <td style={{ padding:'0.875rem 1rem', fontSize:'0.82rem', color: estExpire ? 'var(--rouge-erreur)' : 'var(--ardoise)', whiteSpace:'nowrap' }}>
                      {r.voyage?.date_heure_depart
                        ? new Date(r.voyage.date_heure_depart).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                        : '—'}
                      {estExpire && <span style={{ fontSize:'0.7rem', display:'block', color:'var(--rouge-erreur)' }}>Expiré</span>}
                    </td>
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-mono)', fontWeight:700, textAlign:'center' }}>
                      {r.numero_siege ? `N°${r.numero_siege}` : '—'}
                    </td>
                    <td style={{ padding:'0.875rem 1rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--vert-foret)', whiteSpace:'nowrap' }}>
                      {r.montant_paye ? formaterPrix(r.montant_paye) : '—'}
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <Badge statut={estExpire ? 'ANNULE' : r.statut_paiement} />
                    </td>

                    {/* Actions uniquement pour EN_ATTENTE non expirées */}
                    {onglet === 'EN_ATTENTE' && (
                      <td style={{ padding:'0.875rem 1rem' }}>
                        {estExpire ? (
                          // Expiré → aucune action
                          <span style={{ fontSize:'0.75rem', color:'var(--rouge-erreur)', fontFamily:'var(--font-display)', fontStyle:'italic' }}>
                            Annulé auto
                          </span>
                        ) : (
                          <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
                            {/* Confirmer Mobile Money */}
                            <button
                              onClick={() => mutationMM.mutate({ id: r.id, statut: 'CONFIRME' })}
                              disabled={mutationMM.isPending}
                              style={{ padding:'0.3rem 0.6rem', background:'var(--vert-pale)', border:'none', borderRadius:'var(--radius-sm)', color:'var(--vert-foret)', cursor:'pointer', fontSize:'0.72rem', fontFamily:'var(--font-display)', fontWeight:700, whiteSpace:'nowrap' }}
                            >
                              📱 Mobile Money
                            </button>

                            {/* Valider Espèces */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Confirmer le paiement ESPÈCES pour\n${r.voyageur?.nom} - ${r.voyage?.ville_depart} → ${r.voyage?.ville_arrivee}\nMontant : ${formaterPrix(r.montant_paye)}`)) {
                                  mutationEspeces.mutate(r.id)
                                }
                              }}
                              disabled={mutationEspeces.isPending}
                              style={{ padding:'0.3rem 0.6rem', background:'#FFF3CD', border:'none', borderRadius:'var(--radius-sm)', color:'#92400E', cursor:'pointer', fontSize:'0.72rem', fontFamily:'var(--font-display)', fontWeight:700, whiteSpace:'nowrap' }}
                            >
                              💵 Espèces
                            </button>

                            {/* Annuler */}
                            <button
                              onClick={() => { if (window.confirm('Annuler cette réservation ?')) mutationMM.mutate({ id: r.id, statut: 'ANNULE' }) }}
                              disabled={mutationMM.isPending}
                              style={{ padding:'0.3rem 0.6rem', background:'#FEE2E2', border:'none', borderRadius:'var(--radius-sm)', color:'var(--rouge-erreur)', cursor:'pointer', fontSize:'0.72rem', fontFamily:'var(--font-display)', fontWeight:700 }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
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

export default AgentReservations
