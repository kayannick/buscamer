// ============================================================
// RÔLE : Liste des voyageurs de l'agence avec statistiques
// ============================================================

import { useState }         from 'react'
import { useQuery }         from '@tanstack/react-query'
import AgentLayout          from '../../components/agent/AgentLayout'
import Spinner              from '../../components/ui/Spinner'
import { formaterPrix }     from '../../utils/formatPrix'
import  { getAgentVoyageurs }  from '../../services/agentService'

const AgentVoyageurs = () => {
  const [recherche, setRecherche] = useState('')

  const { data: voyageurs = [], isLoading } = useQuery({
    queryKey: ['agent-voyageurs'],
    queryFn : getAgentVoyageurs,
    staleTime: 60000,
  })

  const filtres = voyageurs.filter(v => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return v.nom?.toLowerCase().includes(q) || v.telephone?.includes(q) || v.email?.toLowerCase().includes(q)
  })

  const totalVoyageurs = voyageurs.length
  const totalCA        = voyageurs.reduce((a, v) => a + v.total_depense, 0)
  const moyVoyages     = voyageurs.length > 0 ? (voyageurs.reduce((a, v) => a + v.nb_voyages, 0) / voyageurs.length).toFixed(1) : 0

  return (
    <AgentLayout titre="Liste des voyageurs">
      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Voyageurs uniques', valeur: totalVoyageurs, color: 'var(--vert-foret)' },
          { label: 'Revenu total',      valeur: formaterPrix(totalCA), color: 'var(--vert-foret)' },
          { label: 'Moy. voyages/pers', valeur: moyVoyages,     color: '#1D4ED8'           },
        ].map(({ label, valeur, color }) => (
          <div key={label} style={{ background: 'var(--blanc)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--gris-bord)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem', color }}>{valeur}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un voyageur (nom, téléphone, email)"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ width: '100%', padding: '0.65rem 1rem', border: '1px solid var(--gris-bord)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner taille="lg" /></div>
      ) : (
        <div style={{ background: 'var(--blanc)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gris-bord)', boxShadow: 'var(--ombre-sm)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gris-bord)', background: '#F9FAFB' }}>
                {['#', 'Voyageur', 'Téléphone', 'Email', 'Nb voyages', 'Total dépensé', 'Inscrit le'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', color: 'var(--gris-doux)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtres.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--gris-bord)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--creme)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--vert-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--vert-foret)', flexShrink: 0 }}>
                        {v.nom?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ardoise)' }}>{v.nom}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--ardoise)' }}>{v.telephone || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--gris-doux)', fontSize: '0.82rem' }}>{v.email || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      {v.nb_voyages}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--vert-foret)' }}>{formaterPrix(v.total_depense)}</td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--gris-doux)', fontSize: '0.82rem' }}>
                    {new Date(v.date_inscription).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtres.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>Aucun voyageur trouvé</p>
          )}
        </div>
      )}
    </AgentLayout>
  )
}

export default AgentVoyageurs