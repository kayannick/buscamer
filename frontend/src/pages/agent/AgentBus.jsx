// ============================================================
// RÔLE : Gestion de la flotte de bus de l'agence
// ============================================================

import { useState }    from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AgentLayout     from '../../components/agent/AgentLayout'
import Button          from '../../components/ui/Button'
import Spinner         from '../../components/ui/Spinner'
import { Modal }       from './AgentVoyages'
import { getAgentBus, creerBus, modifierBus, desactiverBus } from '../../services/agentService'

const FormulaireBus = ({ initial, onSave, onAnnuler, chargement }) => {
  const [form, setForm] = useState(initial || {
    immatriculation: '', capacite: '', type_bus: 'CLASSIQUE', est_actif: true
  })

  const champ = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(p => ({ ...p, [e.target.name]: val }))
  }

  const inputSt = {
    width: '100%', padding: '0.65rem 0.875rem',
    border: '1.5px solid var(--gris-bord)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--creme)',
  }
  const labelSt = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--ardoise)', display: 'block', marginBottom: '0.3rem' }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelSt}>Immatriculation *</label>
          <input name="immatriculation" value={form.immatriculation} onChange={champ} placeholder="LT-1234-A" style={inputSt} required />
        </div>
        <div>
          <label style={labelSt}>Capacité (places) *</label>
          <input name="capacite" type="number" value={form.capacite} onChange={champ} placeholder="70" style={inputSt} required min="1" max="200" />
        </div>
        <div>
          <label style={labelSt}>Type de bus</label>
          <select name="type_bus" value={form.type_bus} onChange={champ} style={inputSt}>
            <option value="CLASSIQUE">Classique</option>
            <option value="VIP">VIP</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" name="est_actif" id="est_actif" checked={form.est_actif} onChange={champ} style={{ width: '18px', height: '18px' }} />
          <label htmlFor="est_actif" style={{ ...labelSt, marginBottom: 0 }}>Bus actif</label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Button variante="fantome" onClick={onAnnuler} type="button">Annuler</Button>
        <Button variante="primaire" chargement={chargement} type="submit">
          {initial ? 'Enregistrer' : 'Ajouter le bus'}
        </Button>
      </div>
    </form>
  )
}

const AgentBus = () => {
  const queryClient = useQueryClient()
  const [modalOuvert, setModalOuvert] = useState(false)
  const [busEdit, setBusEdit]         = useState(null)

  const { data: busList = [], isLoading } = useQuery({
    queryKey: ['agent-bus'],
    queryFn : getAgentBus,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agent-bus'] })
  const mutCreate  = useMutation({ mutationFn: creerBus,                              onSuccess: () => { invalidate(); setModalOuvert(false) } })
  const mutUpdate  = useMutation({ mutationFn: ({ id, d }) => modifierBus(id, d),    onSuccess: () => { invalidate(); setBusEdit(null) } })
  const mutDeact   = useMutation({ mutationFn: desactiverBus,                         onSuccess: invalidate })

  const TYPE_STYLE = {
    CLASSIQUE: { bg: '#F3F4F6', color: 'var(--ardoise)'   },
    VIP      : { bg: 'var(--ardoise)', color: 'var(--or-soleil)' },
    BUSINESS : { bg: '#DBEAFE', color: '#1D4ED8'           },
  }

  return (
    <AgentLayout titre="Gestion de la flotte">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
          {busList.filter(b => b.est_actif).length} bus actifs sur {busList.length}
        </p>
        <Button variante="primaire" onClick={() => setModalOuvert(true)}>➕ Ajouter un bus</Button>
      </div>

      {modalOuvert && (
        <Modal titre="Ajouter un bus" onFermer={() => setModalOuvert(false)}>
          <FormulaireBus chargement={mutCreate.isPending} onSave={(d) => mutCreate.mutate(d)} onAnnuler={() => setModalOuvert(false)} />
        </Modal>
      )}

      {busEdit && (
        <Modal titre="Modifier le bus" onFermer={() => setBusEdit(null)}>
          <FormulaireBus initial={busEdit} chargement={mutUpdate.isPending} onSave={(d) => mutUpdate.mutate({ id: busEdit.id, d })} onAnnuler={() => setBusEdit(null)} />
        </Modal>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner taille="lg" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {busList.map(b => {
            const ts = TYPE_STYLE[b.type_bus] || TYPE_STYLE.CLASSIQUE
            return (
              <div key={b.id} style={{ background: 'var(--blanc)', borderRadius: 'var(--radius-md)', border: `1.5px solid ${b.est_actif ? 'var(--gris-bord)' : '#FECACA'}`, padding: '1.25rem', boxShadow: 'var(--ombre-sm)', opacity: b.est_actif ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ardoise)' }}>{b.immatriculation}</p>
                    {!b.est_actif && <span style={{ fontSize: '0.7rem', color: 'var(--rouge-erreur)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Désactivé</span>}
                  </div>
                  <span style={{ background: ts.bg, color: ts.color, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {b.type_bus}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Capacité</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ardoise)' }}>{b.capacite} places</p>
                  </div>
                  {b.chauffeur_attitre && (
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Chauffeur</p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--ardoise)', fontSize: '0.85rem' }}>{b.chauffeur_attitre.nom_complet}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setBusEdit(b)} style={{ flex: 1, padding: '0.5rem', background: '#EFF6FF', border: 'none', borderRadius: 'var(--radius-sm)', color: '#1D4ED8', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem' }}>✏️ Modifier</button>
                  {b.est_actif && (
                    <button onClick={() => mutDeact.mutate(b.id)} style={{ flex: 1, padding: '0.5rem', background: '#FEF2F2', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--rouge-erreur)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem' }}>🔒 Désactiver</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AgentLayout>
  )
}

export default AgentBus