// ============================================================
// frontend/src/components/ui/GrilleDesSeats.jsx
//
// RÔLE : Affiche la grille interactive des sièges d'un bus.
//        L'utilisateur clique sur un siège libre pour le choisir.
//
// ENTRÉES (props) :
//   - capacite        : nombre total de sièges du bus
//   - siegesOccupes   : tableau des numéros déjà réservés [3, 7, 12, ...]
//   - siegeSelectionne: numéro du siège actuellement choisi (ou null)
//   - onSelectSiege   : callback(numero) appelé au clic sur un siège libre
//   - typeBus         : 'CLASSIQUE' | 'VIP' | 'BUSINESS'
//
// INTERACTIONS :
//   ← Utilisé par : pages/VoyageDetail.jsx
//   → Appelle     : onSelectSiege(numero) → state dans VoyageDetail
// ============================================================

const CONFIGS_BUS = {
  CLASSIQUE : { colonnes: 4, disposition: [2, 2], couloir: 1 },
  VIP       : { colonnes: 3, disposition: [1, 2], couloir: 1 },
  BUSINESS  : { colonnes: 2, disposition: [1, 1], couloir: 1 },
}

const STATUTS = {
  LIBRE     : 'libre',
  OCCUPE    : 'occupe',
  SELECTIONNE: 'selectionne',
}

const GrilleDesSeats = ({
  capacite        = 70,
  siegesOccupes   = [],
  siegeSelectionne= null,
  onSelectSiege,
  typeBus         = 'CLASSIQUE',
}) => {
  const config = CONFIGS_BUS[typeBus] ?? CONFIGS_BUS.CLASSIQUE
  const [gauche, droite] = config.disposition

  // Génère les rangées de sièges
  // Bus camerounais : rangée de 4 (2+2) avec couloir central
  const nbRangees = Math.ceil(capacite / config.colonnes)

  const getStatut = (numero) => {
    if (numero > capacite)         return null
    if (numero === siegeSelectionne) return STATUTS.SELECTIONNE
    if (siegesOccupes.includes(numero)) return STATUTS.OCCUPE
    return STATUTS.LIBRE
  }

  const couleurs = {
    [STATUTS.LIBRE]      : { bg: 'var(--blanc)',    border: 'var(--gris-bord)',  color: 'var(--ardoise)' },
    [STATUTS.OCCUPE]     : { bg: '#F3F4F6',          border: '#D1D5DB',           color: '#9CA3AF'        },
    [STATUTS.SELECTIONNE]: { bg: 'var(--or-soleil)', border: 'var(--or-soleil)',  color: 'var(--vert-foret)' },
  }

  const styleSiege = (statut) => ({
    width        : '36px',
    height       : '40px',
    borderRadius : '6px 6px 3px 3px',
    border       : `2px solid ${couleurs[statut]?.border ?? '#E5E7EB'}`,
    background   : couleurs[statut]?.bg ?? '#F9FAFB',
    color        : couleurs[statut]?.color ?? '#6B7280',
    fontSize     : '0.7rem',
    fontFamily   : 'var(--font-mono)',
    fontWeight   : 700,
    cursor       : statut === STATUTS.LIBRE || statut === STATUTS.SELECTIONNE
                   ? 'pointer' : 'not-allowed',
    transition   : 'all 150ms ease',
    display      : 'flex',
    alignItems   : 'center',
    justifyContent: 'center',
    position     : 'relative',
    flexShrink   : 0,
  })

  const renderSiege = (numero) => {
    const statut = getStatut(numero)
    if (statut === null) return <div key={numero} style={{ width: '36px' }} />

    return (
      <button
        key={numero}
        type="button"
        disabled={statut === STATUTS.OCCUPE}
        onClick={() => onSelectSiege?.(numero)}
        style={styleSiege(statut)}
        title={
          statut === STATUTS.OCCUPE
            ? `Siège ${numero} — occupé`
            : statut === STATUTS.SELECTIONNE
            ? `Siège ${numero} — votre choix`
            : `Siège ${numero} — libre`
        }
        onMouseEnter={e => {
          if (statut === STATUTS.LIBRE)
            e.currentTarget.style.borderColor = 'var(--vert-clair)'
        }}
        onMouseLeave={e => {
          if (statut === STATUTS.LIBRE)
            e.currentTarget.style.borderColor = couleurs[STATUTS.LIBRE].border
        }}
      >
        {statut === STATUTS.OCCUPE
          ? <span style={{ fontSize: '0.85rem' }}>✕</span>
          : statut === STATUTS.SELECTIONNE
          ? <span style={{ fontSize: '0.85rem' }}>✓</span>
          : numero
        }

        {/* Dossier du siège — détail visuel */}
        <div style={{
          position  : 'absolute',
          top       : '-5px',
          left      : '4px', right: '4px',
          height    : '4px',
          borderRadius: '2px 2px 0 0',
          background: statut === STATUTS.SELECTIONNE
            ? 'var(--or-soleil)'
            : statut === STATUTS.OCCUPE
            ? '#D1D5DB'
            : 'var(--gris-bord)',
        }} />
      </button>
    )
  }

  return (
    <div style={{ userSelect: 'none' }}>

      {/* Vue du bus */}
      <div style={{
        background   : 'var(--creme)',
        border       : '2px solid var(--gris-bord)',
        borderRadius : 'var(--radius-lg)',
        padding      : '1.5rem',
        maxWidth     : '320px',
        margin       : '0 auto',
      }}>

        {/* Pare-brise */}
        <div style={{
          background   : 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
          borderRadius : 'var(--radius-md) var(--radius-md) 0 0',
          height       : '40px',
          display      : 'flex',
          alignItems   : 'center',
          justifyContent: 'center',
          marginBottom : '1rem',
          border       : '1.5px solid #93C5FD',
          fontSize     : '0.7rem',
          color        : '#1D4ED8',
          fontFamily   : 'var(--font-display)',
          fontWeight   : 600,
          letterSpacing: '0.05em',
        }}>
          🚌 AVANT DU BUS
        </div>

        {/* Siège chauffeur */}
        <div style={{
          display      : 'flex',
          justifyContent: 'flex-start',
          marginBottom : '1.25rem',
          paddingLeft  : '0.25rem',
        }}>
          <div style={{
            ...styleSiege(STATUTS.OCCUPE),
            background: '#1B4332',
            borderColor: '#1B4332',
            color: 'var(--or-soleil)',
            cursor: 'default',
            fontSize: '0.6rem',
          }}>
            🚗
          </div>
          <span style={{
            fontSize  : '0.7rem',
            color     : 'var(--gris-doux)',
            marginLeft: '0.5rem',
            alignSelf : 'center',
            fontFamily: 'var(--font-display)',
          }}>
            Chauffeur
          </span>
        </div>

        {/* Grille des sièges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: nbRangees }, (_, rangeeIdx) => {
            const base = rangeeIdx * config.colonnes

            // Génère les sièges gauche, couloir, droite
            const siegesGauche = Array.from({ length: gauche }, (_, i) => base + i + 1)
            const siegesDroite = Array.from({ length: droite }, (_, i) => base + gauche + i + 1)

            return (
              <div
                key={rangeeIdx}
                style={{
                  display      : 'flex',
                  alignItems   : 'center',
                  gap          : '0.35rem',
                  justifyContent: 'center',
                }}
              >
                {/* Numéro de rangée */}
                <span style={{
                  width     : '18px',
                  fontSize  : '0.65rem',
                  color     : 'var(--gris-doux)',
                  fontFamily: 'var(--font-mono)',
                  textAlign : 'right',
                  flexShrink: 0,
                }}>
                  {rangeeIdx + 1}
                </span>

                {/* Sièges côté gauche */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {siegesGauche.map(renderSiege)}
                </div>

                {/* Couloir */}
                <div style={{ width: '20px' }} />

                {/* Sièges côté droit */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {siegesDroite.map(renderSiege)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Légende */}
        <div style={{
          display      : 'flex',
          justifyContent: 'center',
          gap          : '1.25rem',
          marginTop    : '1.5rem',
          paddingTop   : '1rem',
          borderTop    : '1px solid var(--gris-bord)',
        }}>
          {[
            { couleur: 'var(--blanc)',    bordure: 'var(--gris-bord)',  label: 'Libre'    },
            { couleur: 'var(--or-soleil)',bordure: 'var(--or-soleil)',  label: 'Votre choix' },
            { couleur: '#F3F4F6',         bordure: '#D1D5DB',           label: 'Occupé'   },
          ].map(({ couleur, bordure, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{
                width       : '14px', height: '14px',
                borderRadius: '3px',
                background  : couleur,
                border      : `2px solid ${bordure}`,
                flexShrink  : 0,
              }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GrilleDesSeats