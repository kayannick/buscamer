// ============================================================
//
// C'EST ICI QUE LE FLUX REACT ↔ DJANGO EST LE PLUS VISIBLE.
//
// FLUX DÉTAILLÉ :
//  1. useLocation() lit les critères passés par Accueil.jsx
//  2. useQuery() de React Query déclenche rechercherVoyages()
//  3. rechercherVoyages() appelle apiClient.get('/voyages/', params)
//  4. axiosConfig.js intercepte → ajoute Bearer token si connecté
//  5. HTTP GET part vers Django : /api/voyages/?ville_depart=...
//  6. VoyageViewSet.get_queryset() filtre + VoyageListSerializer sérialise
//  7. Django renvoie JSON : { results: [...] }
//  8. React Query reçoit → met en cache → passe à {data, isLoading, error}
//  9. Le composant se render avec les vraies données
// ============================================================

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery }                  from '@tanstack/react-query'
import { rechercherVoyages }         from '../services/voyageService'
import {  formaterDuree } from '../utils/formatDate'
import { formaterPrix }              from '../utils/formatPrix'
import Badge                         from '../components/ui/Badge'
import Button                        from '../components/ui/Button'

const VILLES = [
  { valeur: 'YAOUNDE', label: 'Yaoundé' }, { valeur: 'DOUALA', label: 'Douala' },
  { valeur: 'BAFOUSSAM', label: 'Bafoussam' }, { valeur: 'BAMENDA', label: 'Bamenda' },
  { valeur: 'GAROUA', label: 'Garoua' }, { valeur: 'MAROUA', label: 'Maroua' },
  { valeur: 'BERTOUA', label: 'Bertoua' }, { valeur: 'BUEA', label: 'Buea' },
  { valeur: 'LIMBE', label: 'Limbé' }, { valeur: 'EBOLOWA', label: 'Ébolowa' },
]

const Voyages = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const today    = new Date().toISOString().split('T')[0]

  // Récupère les critères passés depuis Accueil.jsx (ou URL directe)
  const [criteres, setCriteres] = useState({
    ville_depart  : location.state?.ville_depart  || '',
    ville_arrivee : location.state?.ville_arrivee || '',
    date          : location.state?.date          || today,
  })

  // --------------------------------------------------------
  // useQuery — LE COEUR DU FLUX
  //
  // queryKey : ['voyages', criteres]
  //   → React Query met en CACHE la réponse sous cette clé.
  //   → Si les critères changent → nouvelle requête automatique.
  //   → Si les mêmes critères reviennent dans les 5 min →
  //     utilise le cache (pas de requête HTTP inutile).
  //
  // queryFn : () => rechercherVoyages(criteres)
  //   → La fonction qui va chercher les données.
  //   → Appelée automatiquement au montage ET quand queryKey change.
  //
  // enabled : true seulement si on a les deux villes
  //   → Évite une requête vide au premier render
  // --------------------------------------------------------
  const {
    data     : voyages   = [],
    isLoading: chargement,
    isError  : estErreur,
    error,
    refetch,
  } = useQuery({
    queryKey : ['voyages', criteres],
    queryFn  : () => rechercherVoyages(criteres),
    enabled  : !!(criteres.ville_depart && criteres.ville_arrivee),
  })

  const handleRecherche = (e) => {
    e.preventDefault()
    refetch()
  }

  const villeLabel = (val) => VILLES.find(v => v.valeur === val)?.label || val

  return (
    <div style={{ minHeight: '80vh', background: 'var(--creme)' }}>

      {/* ====== BARRE DE RECHERCHE PERSISTANTE ====== */}
      <div style={{
        background  : 'var(--vert-foret)',
        padding     : '1.25rem 0',
        position    : 'sticky',
        top         : '64px',
        zIndex      : 50,
        boxShadow   : '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        <div className="conteneur">
          <form onSubmit={handleRecherche}>
            <div style={{
              display             : 'grid',
              gridTemplateColumns : '1fr 1fr 1fr auto',
              gap                 : '0.75rem',
              alignItems          : 'end',
            }} className="form-recherche-compact">

              {[
                { name: 'ville_depart',  label: 'Départ',  placeholder: 'Ville de départ' },
                { name: 'ville_arrivee', label: 'Arrivée', placeholder: 'Ville d\'arrivée' },
              ].map(({ name, label, placeholder }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                  </label>
                  <select
                    value={criteres[name]}
                    onChange={e => setCriteres(prev => ({ ...prev, [name]: e.target.value }))}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: '0.9rem', background: 'rgba(255,255,255,0.12)', color: 'var(--blanc)', outline: 'none' }}
                  >
                    <option value="" style={{ background: 'var(--ardoise)' }}>{placeholder}</option>
                    {VILLES.map(v => <option key={v.valeur} value={v.valeur} style={{ background: 'var(--ardoise)' }}>{v.label}</option>)}
                  </select>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</label>
                <input
                  type="date"
                  value={criteres.date}
                  min={today}
                  onChange={e => setCriteres(prev => ({ ...prev, date: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: '0.9rem', background: 'rgba(255,255,255,0.12)', color: 'var(--blanc)', outline: 'none' }}
                />
              </div>

              <Button type="submit" variante="or" taille="md" chargement={chargement}>
                Rechercher
              </Button>
            </div>
          </form>
        </div>
        <style>{`
          @media (max-width: 768px) {
            .form-recherche-compact { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </div>

      <div className="conteneur" style={{ padding: '2rem 1.5rem' }}>

        {/* En-tête des résultats */}
        {criteres.ville_depart && criteres.ville_arrivee && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--ardoise)' }}>
              {villeLabel(criteres.ville_depart)}
              <span style={{ color: 'var(--gris-doux)', margin: '0 0.5rem', fontWeight: 400 }}>→</span>
              {villeLabel(criteres.ville_arrivee)}
            </h1>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {criteres.date} · {chargement ? '...' : `${voyages.length} voyage${voyages.length !== 1 ? 's' : ''} trouvé${voyages.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {/* ====== ÉTATS DE L'UI ====== */}

        {/* Chargement */}
        {chargement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: '140px', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}/>
            ))}
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
          </div>
        )}

        {/* Erreur */}
        {estErreur && !chargement && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ardoise)', marginBottom: '0.5rem' }}>
              Impossible de charger les voyages
            </p>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {error?.message || 'Vérifiez votre connexion et réessayez.'}
            </p>
            <Button variante="primaire" onClick={() => refetch()}>Réessayer</Button>
          </div>
        )}

        {/* Aucun résultat */}
        {!chargement && !estErreur && voyages.length === 0 && criteres.ville_depart && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--blanc)', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--gris-bord)' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚌</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ardoise)', marginBottom: '0.5rem' }}>
              Aucun voyage disponible
            </p>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.9rem' }}>
              Essayez une autre date ou un autre itinéraire.
            </p>
          </div>
        )}

        {/* ====== LISTE DES VOYAGES ====== */}
        {!chargement && !estErreur && voyages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {voyages.map(voyage => (
              <CarteVoyage
                key={voyage.id}
                voyage={voyage}
                onClick={() => navigate(`/voyages/${voyage.id}`)}
              />
            ))}
          </div>
        )}

        {/* État initial (pas encore de recherche) */}
        {!criteres.ville_depart && !chargement && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ardoise)' }}>
              Choisissez votre destination ci-dessus
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CarteVoyage — Affiche UN résultat de recherche
// ============================================================
const CarteVoyage = ({ voyage, onClick }) => {
  const placesRestantes = voyage.places_disponibles
  const alertePlaces    = placesRestantes <= 5 && placesRestantes > 0

  return (
    <article
      onClick={onClick}
      style={{
        background   : 'var(--blanc)',
        borderRadius : 'var(--radius-md)',
        border       : '1.5px solid var(--gris-bord)',
        padding      : '1.25rem 1.5rem',
        cursor       : 'pointer',
        transition   : 'all var(--transition)',
        display      : 'grid',
        gridTemplateColumns: '1fr auto',
        gap          : '1rem',
        alignItems   : 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--vert-clair)'; e.currentTarget.style.boxShadow = 'var(--ombre-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gris-bord)';  e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      <div>
        {/* Agence + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ardoise)' }}>
            {voyage.agence_nom}
          </span>
          <Badge statut={voyage.type_bus} />
          <Badge statut={voyage.statut} />
        </div>

        {/* Trajet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ardoise)', lineHeight: 1 }}>
              {voyage.date_heure_depart.split('T')[1]?.substring(0,5) || '--:--'}
            </p>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.8rem', marginTop: '2px' }}>
              {voyage.ville_depart_display}
            </p>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1.5px', background: 'var(--gris-bord)' }}/>
            <span style={{ fontSize: '0.75rem', color: 'var(--gris-doux)', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>
              ~{formaterDuree(voyage.duree_estimee)}
            </span>
            <svg width="16" height="8" viewBox="0 0 16 8"><path d="M0 4h13M9 1l4 3-4 3" stroke="var(--vert-clair)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ardoise)', lineHeight: 1 }}>
              {/* heure d'arrivée estimée non disponible dans ce serializer, on affiche l'arrivée */}
              ···
            </p>
            <p style={{ color: 'var(--gris-doux)', fontSize: '0.8rem', marginTop: '2px' }}>
              {voyage.ville_arrivee_display}
            </p>
          </div>
        </div>

        {/* Places restantes */}
        <p style={{
          fontSize : '0.8rem',
          color    : alertePlaces ? 'var(--rouge-erreur)' : placesRestantes === 0 ? 'var(--rouge-erreur)' : 'var(--gris-doux)',
          fontWeight: alertePlaces ? 600 : 400,
        }}>
          {placesRestantes === 0
            ? '🔴 Complet'
            : alertePlaces
            ? `🟠 Plus que ${placesRestantes} place${placesRestantes > 1 ? 's' : ''}`
            : `🟢 ${placesRestantes} places disponibles`}
        </p>
      </div>

      {/* Prix + CTA */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--vert-foret)', lineHeight: 1 }}>
          {formaterPrix(voyage.prix)}
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--gris-doux)', marginBottom: '0.75rem', marginTop: '2px' }}>
          par personne
        </p>
        <Button
          variante={placesRestantes === 0 ? 'fantome' : 'or'}
          taille="sm"
          disabled={placesRestantes === 0}
          onClick={e => { e.stopPropagation(); onClick() }}
        >
          {placesRestantes === 0 ? 'Complet' : 'Réserver →'}
        </Button>
      </div>
    </article>
  )
}

export default Voyages