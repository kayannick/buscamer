// ============================================================
// ============================================================

import { useState }                               from 'react'
import { useParams, useNavigate, Link }           from 'react-router-dom'
import { useMutation, useQuery, useQueryClient }  from '@tanstack/react-query'
import { useVoyageDetail }                        from '../hooks/useVoyages'
import { creerReservation }                       from '../services/reservationService'
import { formaterDateVoyage, formaterDuree }      from '../utils/formatDate'
import { formaterPrix }                           from '../utils/formatPrix'
import GrilleDesSeats                             from '../components/ui/GrilleDesSeats'
import Badge                                      from '../components/ui/Badge'
import Button                                     from '../components/ui/Button'
import useAuth                                    from '../hooks/useAuth'
import apiClient                                  from '../services/axiosConfig'

// ── Hook : sièges déjà occupés pour un voyage ──────────────
const useSiegesOccupes = (voyageId) => {
  return useQuery({
    queryKey : ['sieges-occupes', voyageId],
    queryFn  : async () => {
      try {
        const res = await apiClient.get(`/voyages/${voyageId}/sieges-occupes/`)
        return res.data
      } catch {
        return []
      }
    },
    enabled  : !!voyageId,
    staleTime: 30 * 1000,
  })
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const VoyageDetail = () => {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const { estConnecte } = useAuth()

  const [siegeSelectionne,   setSiegeSelectionne]   = useState(null)
  const [etape,              setEtape]              = useState('selection')
  const [erreurReservation,  setErreurReservation]  = useState('')

  // ── Données du voyage ──────────────────────────────────────
  const {
    data     : voyage,
    isLoading: chargementVoyage,
    isError  : erreurVoyage,
  } = useVoyageDetail(id)

  // ── Sièges occupés ─────────────────────────────────────────
  const { data: siegesOccupes = [] } = useSiegesOccupes(id)

  // ── Mutation de réservation ────────────────────────────────
  const { mutate: reserver, isPending: reservationEnCours } = useMutation({
    mutationFn: creerReservation,
    onSuccess : () => {
      queryClient.invalidateQueries({ queryKey: ['mes-reservations'] })
      navigate('/profil', { state: { nouveauBillet: true } })
    },
    onError: (err) => {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const premierMessage = Object.values(data).flat()[0]
        setErreurReservation(
          typeof premierMessage === 'string'
            ? premierMessage
            : 'Erreur lors de la réservation.'
        )
      } else {
        setErreurReservation('Erreur lors de la réservation. Réessayez.')
      }
      setEtape('selection')
    },
  })

  const handleConfirmerReservation = () => {
    if (!siegeSelectionne || !voyage) return
    setErreurReservation('')
    reserver({
      voyage       : Number(id),
      numero_siege : siegeSelectionne,
      montant_paye : voyage.prix,
    })
  }

  const handleSelectSiege = (numero) => {
    setSiegeSelectionne(prev => prev === numero ? null : numero)
    setEtape('selection')
    setErreurReservation('')
  }

  // ── États de chargement / erreur ───────────────────────────
  if (chargementVoyage) return <PageChargement />
  if (erreurVoyage || !voyage) return <PageErreur />

  const placesRestantes = voyage.places_disponibles ?? 0
  const estComplet      = placesRestantes === 0
  const heureDepart     = voyage.date_heure_depart?.split('T')[1]?.substring(0, 5) ?? '--:--'

  return (
    <div style={{ minHeight: '80vh', background: 'var(--creme)', paddingBottom: '3rem' }}>

      {/* ====== BANDEAU EN-TÊTE ====== */}
      <div style={{
        background : 'var(--vert-foret)',
        padding    : '2rem 0 3rem',
        position   : 'relative',
        overflow   : 'hidden',
      }}>
        {/* Fond décoratif */}
        <div style={{
          position         : 'absolute',
          inset            : 0,
          backgroundImage  : 'radial-gradient(circle at 80% 50%, rgba(244,161,0,0.08) 0%, transparent 60%)',
          pointerEvents    : 'none',
        }} />

        <div className="conteneur" style={{ position: 'relative', zIndex: 1 }}>

          {/* Fil d'Ariane */}
          <nav style={{
            display      : 'flex',
            alignItems   : 'center',
            gap          : '0.4rem',
            marginBottom : '1.5rem',
            fontSize     : '0.82rem',
            color        : 'rgba(255,255,255,0.55)',
            fontFamily   : 'var(--font-display)',
          }}>
            <Link to="/"        style={{ color: 'rgba(255,255,255,0.55)' }}>Accueil</Link>
            <span>/</span>
            <Link to="/voyages" style={{ color: 'rgba(255,255,255,0.55)' }}>Voyages</Link>
            <span>/</span>
            <span style={{ color: 'var(--or-soleil)' }}>
              {voyage.ville_depart_display} → {voyage.ville_arrivee_display}
            </span>
          </nav>

          {/* Trajet principal */}
          <div style={{
            display    : 'flex',
            alignItems : 'center',
            gap        : '1.5rem',
            flexWrap   : 'wrap',
            marginBottom: '1.5rem',
          }}>
            {/* Ville départ */}
            <div>
              <p style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 800,
                fontSize     : 'clamp(2rem, 5vw, 3rem)',
                color        : 'var(--blanc)',
                lineHeight   : 1,
                letterSpacing: '-0.03em',
              }}>
                {heureDepart}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                {voyage.ville_depart_display}
              </p>
            </div>

            {/* Séparateur durée */}
            <div style={{
              flex       : 1,
              display    : 'flex',
              alignItems : 'center',
              gap        : '0.75rem',
              minWidth   : '100px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                <p style={{
                  color      : 'var(--or-soleil)',
                  fontSize   : '0.78rem',
                  fontFamily : 'var(--font-display)',
                  fontWeight : 600,
                  marginBottom: '0.25rem',
                }}>
                  ~{formaterDuree(voyage.duree_estimee)}
                </p>
                <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
                  <path
                    d="M0 6h20M16 2l5 4-5 4"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Ville arrivée */}
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 800,
                fontSize     : 'clamp(2rem, 5vw, 3rem)',
                color        : 'var(--blanc)',
                lineHeight   : 1,
                letterSpacing: '-0.03em',
              }}>
                ···
              </p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                {voyage.ville_arrivee_display}
              </p>
            </div>
          </div>

          {/* Badges méta-infos */}
          <div style={{
            display    : 'flex',
            gap        : '0.6rem',
            flexWrap   : 'wrap',
            alignItems : 'center',
          }}>
            <PillInfo>
              📅 {formaterDateVoyage(voyage.date_heure_depart)}
            </PillInfo>
            <PillInfo>
              🚌 {voyage.agence?.nom ?? '—'}
            </PillInfo>
            {voyage.bus?.type_bus && <Badge statut={voyage.bus.type_bus} />}
            <PillInfo couleur={
              estComplet          ? 'rgba(220,38,38,0.25)'
              : placesRestantes <= 5 ? 'rgba(244,161,0,0.25)'
              : 'rgba(64,145,108,0.25)'
            } textCouleur={
              estComplet          ? '#FCA5A5'
              : placesRestantes <= 5 ? 'var(--or-soleil)'
              : '#86EFAC'
            }>
              {estComplet
                ? '🔴 Complet'
                : placesRestantes <= 5
                ? `🟠 ${placesRestantes} places`
                : `🟢 ${placesRestantes} places`}
            </PillInfo>
          </div>
        </div>
      </div>

      {/* ====== CORPS PRINCIPAL (2 colonnes) ====== */}
      <div className="conteneur" style={{ paddingTop: '0' }}>
        <div
          className="detail-grid"
          style={{
            display             : 'grid',
            gridTemplateColumns : '1fr 380px',
            gap                 : '2rem',
            marginTop           : '-1.5rem',
            alignItems          : 'start',
          }}
        >

          {/* ─────────────────────────────────────────────────
              COLONNE GAUCHE : infos bus + grille sièges
          ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Carte informations bus */}
            <div style={{
              background   : 'var(--blanc)',
              borderRadius : 'var(--radius-lg)',
              padding      : '1.5rem',
              boxShadow    : 'var(--ombre-md)',
            }}>
              <h2 style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 700,
                fontSize     : '1.05rem',
                color        : 'var(--ardoise)',
                marginBottom : '1.25rem',
              }}>
                🚌 Informations du véhicule
              </h2>

              <div style={{
                display             : 'grid',
                gridTemplateColumns : 'repeat(auto-fit, minmax(140px, 1fr))',
                gap                 : '1.25rem',
              }}>
                {[
                  {
                    label  : 'Agence',
                    valeur : voyage.agence?.nom ?? '—',
                  },
                  {
                    label  : 'Immatriculation',
                    valeur : voyage.bus?.immatriculation ?? '—',
                  },
                  {
                    label  : 'Type de bus',
                    valeur : voyage.bus?.type_bus
                      ? <Badge statut={voyage.bus.type_bus} />
                      : '—',
                  },
                  {
                    label  : 'Capacité',
                    valeur : voyage.bus?.capacite
                      ? `${voyage.bus.capacite} sièges`
                      : '—',
                  },
                  {
                    label  : 'Chauffeur',
                    valeur : voyage.bus?.chauffeur_attitre?.nom_complet
                      ?? 'Non assigné',
                  },
                  {
                    label  : 'Prix / place',
                    valeur : (
                      <span style={{
                        fontFamily : 'var(--font-mono)',
                        fontWeight : 700,
                        color      : 'var(--vert-foret)',
                        fontSize   : '1rem',
                      }}>
                        {formaterPrix(voyage.prix)}
                      </span>
                    ),
                  },
                ].map(({ label, valeur }) => (
                  <div key={label}>
                    <p style={{
                      fontSize      : '0.7rem',
                      color         : 'var(--gris-doux)',
                      fontFamily    : 'var(--font-display)',
                      fontWeight    : 600,
                      textTransform : 'uppercase',
                      letterSpacing : '0.06em',
                      marginBottom  : '0.3rem',
                    }}>
                      {label}
                    </p>
                    <div style={{
                      fontFamily : 'var(--font-display)',
                      fontWeight : 500,
                      color      : 'var(--ardoise)',
                      fontSize   : '0.9rem',
                    }}>
                      {valeur}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grille des sièges (si pas complet) */}
            {!estComplet ? (
              <div style={{
                background   : 'var(--blanc)',
                borderRadius : 'var(--radius-lg)',
                padding      : '1.5rem',
                boxShadow    : 'var(--ombre-md)',
              }}>
                <h2 style={{
                  fontFamily   : 'var(--font-display)',
                  fontWeight   : 700,
                  fontSize     : '1.05rem',
                  color        : 'var(--ardoise)',
                  marginBottom : '0.4rem',
                }}>
                  Choisissez votre siège
                </h2>
                <p style={{
                  color        : 'var(--gris-doux)',
                  fontSize     : '0.85rem',
                  marginBottom : '1.5rem',
                }}>
                  Cliquez sur un siège disponible pour le sélectionner.
                </p>

                <GrilleDesSeats
                  capacite={voyage.bus?.capacite ?? 70}
                  siegesOccupes={siegesOccupes}
                  siegeSelectionne={siegeSelectionne}
                  onSelectSiege={handleSelectSiege}
                  typeBus={voyage.bus?.type_bus ?? 'CLASSIQUE'}
                />
              </div>
            ) : (
              /* Voyage complet */
              <div style={{
                background   : '#FEF2F2',
                border       : '1.5px solid #FECACA',
                borderRadius : 'var(--radius-lg)',
                padding      : '2.5rem 2rem',
                textAlign    : 'center',
              }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>😞</p>
                <p style={{
                  fontFamily   : 'var(--font-display)',
                  fontWeight   : 700,
                  fontSize     : '1.1rem',
                  color        : 'var(--rouge-erreur)',
                  marginBottom : '0.5rem',
                }}>
                  Ce voyage est complet
                </p>
                <p style={{
                  color        : '#EF4444',
                  fontSize     : '0.875rem',
                  marginBottom : '1.5rem',
                }}>
                  Tous les sièges sont réservés pour ce trajet.
                </p>
                <Button variante="secondaire" onClick={() => navigate(-1)}>
                  ← Voir d'autres voyages
                </Button>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────
              COLONNE DROITE : récapitulatif + CTA
          ───────────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: '80px' }}>

            {/* Carte récapitulatif */}
            <div style={{
              background   : 'var(--blanc)',
              borderRadius : 'var(--radius-lg)',
              boxShadow    : 'var(--ombre-lg)',
              overflow     : 'hidden',
              marginBottom : '1rem',
            }}>
              {/* En-tête carte */}
              <div style={{
                background : 'var(--vert-foret)',
                padding    : '1.25rem 1.5rem',
              }}>
                <p style={{
                  fontFamily   : 'var(--font-display)',
                  fontWeight   : 700,
                  color        : 'var(--blanc)',
                  fontSize     : '1rem',
                  marginBottom : '0.2rem',
                }}>
                  Récapitulatif
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>
                  {voyage.ville_depart_display} → {voyage.ville_arrivee_display}
                </p>
              </div>

              {/* Corps carte */}
              <div style={{ padding: '1.5rem' }}>

                {/* Lignes de détail */}
                <div style={{
                  display       : 'flex',
                  flexDirection : 'column',
                  gap           : '0.7rem',
                  marginBottom  : '1.25rem',
                }}>
                  {[
                    {
                      label  : 'Date',
                      valeur : formaterDateVoyage(voyage.date_heure_depart),
                    },
                    {
                      label  : 'Agence',
                      valeur : voyage.agence?.nom ?? '—',
                    },
                    {
                      label  : 'Type de bus',
                      valeur : voyage.bus?.type_bus ?? '—',
                    },
                    {
                      label  : 'Siège',
                      valeur : siegeSelectionne
                        ? `N°${siegeSelectionne}`
                        : (
                          <span style={{
                            color      : 'var(--or-soleil)',
                            fontStyle  : 'italic',
                            fontSize   : '0.85rem',
                          }}>
                            À choisir →
                          </span>
                        ),
                    },
                  ].map(({ label, valeur }) => (
                    <div
                      key={label}
                      style={{
                        display        : 'flex',
                        justifyContent : 'space-between',
                        alignItems     : 'center',
                        gap            : '0.5rem',
                      }}
                    >
                      <span style={{
                        fontSize   : '0.82rem',
                        color      : 'var(--gris-doux)',
                        fontFamily : 'var(--font-display)',
                        flexShrink : 0,
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize   : '0.88rem',
                        fontWeight : 600,
                        color      : 'var(--ardoise)',
                        fontFamily : 'var(--font-display)',
                        textAlign  : 'right',
                      }}>
                        {valeur}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Séparateur */}
                <div style={{
                  height     : '1px',
                  background : 'var(--gris-bord)',
                  margin     : '1.25rem 0',
                }} />

                {/* Total */}
                <div style={{
                  display        : 'flex',
                  justifyContent : 'space-between',
                  alignItems     : 'center',
                  marginBottom   : '1.5rem',
                }}>
                  <span style={{
                    fontFamily : 'var(--font-display)',
                    fontWeight : 700,
                    color      : 'var(--ardoise)',
                  }}>
                    Total
                  </span>
                  <span style={{
                    fontFamily : 'var(--font-mono)',
                    fontWeight : 800,
                    fontSize   : '1.5rem',
                    color      : 'var(--vert-foret)',
                  }}>
                    {formaterPrix(voyage.prix)}
                  </span>
                </div>

                {/* Message d'erreur réservation */}
                {erreurReservation && (
                  <div style={{
                    background   : '#FEF2F2',
                    border       : '1px solid #FECACA',
                    borderRadius : 'var(--radius-sm)',
                    padding      : '0.75rem',
                    marginBottom : '1rem',
                    fontSize     : '0.82rem',
                    color        : 'var(--rouge-erreur)',
                    fontWeight   : 500,
                    lineHeight   : 1.5,
                  }}>
                    ⚠️ {erreurReservation}
                  </div>
                )}

                {/* ── Zone CTA dynamique ── */}
                <ZoneCTA
                  estConnecte={estConnecte}
                  estComplet={estComplet}
                  siegeSelectionne={siegeSelectionne}
                  etape={etape}
                  reservationEnCours={reservationEnCours}
                  onContinuer={() => setEtape('confirmation')}
                  onConfirmer={handleConfirmerReservation}
                  onChangerSiege={() => {
                    setEtape('selection')
                    setErreurReservation('')
                  }}
                  onSeConnecter={() =>
                    navigate('/connexion', { state: { from: `/voyages/${id}` } })
                  }
                  voyageId={id}
                />
              </div>
            </div>

            {/* Politique de réservation */}
            <div style={{
              background   : 'var(--blanc)',
              borderRadius : 'var(--radius-md)',
              padding      : '1rem 1.25rem',
              border       : '1.5px solid var(--gris-bord)',
            }}>
              <p style={{
                fontFamily   : 'var(--font-display)',
                fontWeight   : 700,
                fontSize     : '0.82rem',
                color        : 'var(--ardoise)',
                marginBottom : '0.6rem',
              }}>
                ℹ️ Politique de réservation
              </p>
              {[
                'Réservation gratuite — paiement à l\'embarquement',
                'Annulation possible jusqu\'à 2h avant le départ',
                'Billet envoyé par SMS après confirmation',
              ].map(item => (
                <p key={item} style={{
                  fontSize    : '0.78rem',
                  color       : 'var(--gris-doux)',
                  marginBottom: '0.35rem',
                  display     : 'flex',
                  gap         : '0.4rem',
                  alignItems  : 'flex-start',
                  lineHeight  : 1.5,
                }}>
                  <span style={{ color: 'var(--vert-clair)', flexShrink: 0 }}>✓</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// ZoneCTA — Boutons d'action selon l'état
// ============================================================
const ZoneCTA = ({
  estConnecte,
  estComplet,
  siegeSelectionne,
  etape,
  reservationEnCours,
  onContinuer,
  onConfirmer,
  onChangerSiege,
  onSeConnecter,
//   voyageId,
}) => {
  if (!estConnecte) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize     : '0.85rem',
          color        : 'var(--gris-doux)',
          marginBottom : '1rem',
          lineHeight   : 1.5,
        }}>
          Connectez-vous pour réserver votre place
        </p>
        <Button variante="primaire" pleineLargeur taille="lg" onClick={onSeConnecter}>
          Se connecter
        </Button>
        <p style={{ fontSize: '0.78rem', color: 'var(--gris-doux)', marginTop: '0.75rem' }}>
          Pas de compte ?{' '}
          <Link to="/inscription" style={{ color: 'var(--vert-clair)', fontWeight: 600 }}>
            S'inscrire gratuitement
          </Link>
        </p>
      </div>
    )
  }

  if (estComplet) {
    return (
      <Button variante="fantome" pleineLargeur disabled>
        Voyage complet
      </Button>
    )
  }

  if (!siegeSelectionne) {
    return (
      <Button variante="secondaire" pleineLargeur disabled>
        ← Choisissez un siège
      </Button>
    )
  }

  if (etape === 'selection') {
    return (
      <Button variante="or" pleineLargeur taille="lg" onClick={onContinuer}>
        Continuer avec le siège N°{siegeSelectionne} →
      </Button>
    )
  }

  // Étape confirmation
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Confirmation visuelle du siège */}
      <div style={{
        background   : 'var(--vert-pale)',
        borderRadius : 'var(--radius-md)',
        padding      : '0.875rem 1rem',
        textAlign    : 'center',
        fontFamily   : 'var(--font-display)',
        color        : 'var(--vert-foret)',
        fontWeight   : 600,
        fontSize     : '0.88rem',
        lineHeight   : 1.5,
      }}>
        ✅ Siège N°{siegeSelectionne} sélectionné
      </div>

      <Button
        variante="primaire"
        pleineLargeur
        taille="lg"
        chargement={reservationEnCours}
        onClick={onConfirmer}
      >
        Confirmer la réservation
      </Button>

      <Button
        variante="fantome"
        pleineLargeur
        taille="sm"
        onClick={onChangerSiege}
      >
        ← Changer de siège
      </Button>

      <p style={{
        fontSize   : '0.72rem',
        color      : 'var(--gris-doux)',
        textAlign  : 'center',
        lineHeight : 1.6,
        marginTop  : '0.25rem',
      }}>
        En confirmant, vous acceptez les conditions générales.
        Le paiement s'effectue à l'embarquement.
      </p>
    </div>
  )
}

// ============================================================
// PillInfo — Badge d'information dans le bandeau
// ============================================================
const PillInfo = ({ children, couleur = 'rgba(255,255,255,0.12)', textCouleur = 'rgba(255,255,255,0.85)' }) => (
  <span style={{
    background   : couleur,
    borderRadius : 'var(--radius-md)',
    padding      : '0.35rem 0.75rem',
    fontSize     : '0.82rem',
    color        : textCouleur,
    fontFamily   : 'var(--font-display)',
    fontWeight   : 500,
    whiteSpace   : 'nowrap',
  }}>
    {children}
  </span>
)

// ============================================================
// PageChargement — Skeleton loader
// ─── CORRECTION : "height" était utilisé comme variable JS ─
// ─── On utilise des valeurs directement dans les styles    ─
// ============================================================
const PageChargement = () => (
  <div style={{ minHeight: '80vh', background: 'var(--creme)' }}>
    {/* Skeleton bandeau */}
    <div style={{
      height     : '220px',
      background : 'var(--vert-foret)',
      opacity    : 0.4,
    }} />

    <div className="conteneur" style={{ paddingTop: '1rem' }}>
      <div
        className="detail-grid"
        style={{
          display             : 'grid',
          gridTemplateColumns : '1fr 380px',
          gap                 : '2rem',
          marginTop           : '-1.5rem',
        }}
      >
        {/* Skeleton colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            height         : '200px',
            borderRadius   : 'var(--radius-lg)',
            background     : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize : '200% 100%',
            animation      : 'shimmer 1.4s infinite',
          }} />
          <div style={{
            height         : '400px',
            borderRadius   : 'var(--radius-lg)',
            background     : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize : '200% 100%',
            animation      : 'shimmer 1.4s infinite',
          }} />
        </div>

        {/* Skeleton colonne droite */}
        <div style={{
          height         : '380px',
          borderRadius   : 'var(--radius-lg)',
          background     : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize : '200% 100%',
          animation      : 'shimmer 1.4s infinite',
        }} />
      </div>
    </div>

    <style>{`
      @keyframes shimmer {
        0%   { background-position: 200% 0;  }
        100% { background-position: -200% 0; }
      }
      @media (max-width: 900px) {
        .detail-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </div>
)

// ============================================================
// PageErreur — Voyage introuvable
// ============================================================
const PageErreur = () => {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight      : '70vh',
      display        : 'flex',
      alignItems     : 'center',
      justifyContent : 'center',
      padding        : '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚌</p>
        <h2 style={{
          fontFamily   : 'var(--font-display)',
          fontWeight   : 700,
          fontSize     : '1.3rem',
          color        : 'var(--ardoise)',
          marginBottom : '0.5rem',
        }}>
          Voyage introuvable
        </h2>
        <p style={{
          color        : 'var(--gris-doux)',
          fontSize     : '0.9rem',
          marginBottom : '1.5rem',
          lineHeight   : 1.6,
        }}>
          Ce voyage n'existe pas ou a été supprimé.
        </p>
        <Button variante="primaire" onClick={() => navigate('/voyages')}>
          ← Retour aux voyages
        </Button>
      </div>
    </div>
  )
}

export default VoyageDetail