

// ============================================================
//
// ERREUR RÉSOLUE :
//   "Removing a style property (borderColor) when a conflicting
//    property is set (border)"
//
// CAUSE :
//   On utilisait border: "2px solid ..." dans le style de base
//   ET borderColor dans onMouseEnter/onMouseLeave.
//   React ne peut pas mixer les deux.
//
// SOLUTION :
//   Remplacer border (shorthand) par les 3 propriétés séparées :
//   borderWidth, borderStyle, borderColor — PARTOUT.
//   Ainsi onMouseEnter ne change que borderColor sans conflit.
// ============================================================

const CONFIGS_BUS = {
  CLASSIQUE : { colonnes: 4, disposition: [2, 2] },
  VIP       : { colonnes: 3, disposition: [1, 2] },
  BUSINESS  : { colonnes: 2, disposition: [1, 1] },
}

const STATUTS = {
  LIBRE      : 'libre',
  OCCUPE     : 'occupe',
  SELECTIONNE: 'selectionne',
}

const GrilleDesSeats = ({
  capacite         = 0,
  siegesOccupes    = [],
  siegeSelectionne = null,
  onSelectSiege,
  typeBus          = 'CLASSIQUE',
}) => {

  const capaciteValide = typeof capacite === 'number'
    && !isNaN(capacite)
    && capacite > 0

  if (!capaciteValide) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</p>
        <p>Chargement des sièges...</p>
      </div>
    )
  }

  const listeSiegesOccupes = Array.isArray(siegesOccupes) ? siegesOccupes : []
  const config             = CONFIGS_BUS[typeBus] ?? CONFIGS_BUS.CLASSIQUE
  const [gauche, droite]   = config.disposition
  const nbRangees          = Math.ceil(capacite / config.colonnes)

  // ── Couleurs par statut ───────────────────────────────────
  const STYLE_SIEGE = {
    [STATUTS.LIBRE]: {
      background  : 'var(--blanc)',
      borderWidth : '2px',
      borderStyle : 'solid',
      borderColor : 'var(--gris-bord)',   // ← séparé du border
      color       : 'var(--ardoise)',
      cursor      : 'pointer',
    },
    [STATUTS.OCCUPE]: {
      background  : '#F3F4F6',
      borderWidth : '2px',
      borderStyle : 'solid',
      borderColor : '#D1D5DB',
      color       : '#9CA3AF',
      cursor      : 'not-allowed',
    },
    [STATUTS.SELECTIONNE]: {
      background  : 'var(--or-soleil)',
      borderWidth : '2px',
      borderStyle : 'solid',
      borderColor : 'var(--or-soleil)',
      color       : 'var(--vert-foret)',
      cursor      : 'pointer',
    },
  }

  const getStatut = (numero) => {
    if (numero > capacite)                   return null
    if (numero === siegeSelectionne)         return STATUTS.SELECTIONNE
    if (listeSiegesOccupes.includes(numero)) return STATUTS.OCCUPE
    return STATUTS.LIBRE
  }

  const renderSiege = (numero) => {
    const statut = getStatut(numero)

    if (statut === null) {
      return <div key={`fantome-${numero}`} style={{ width: '36px', flexShrink: 0 }} />
    }

    const styleBase = {
      width         : '36px',
      height        : '40px',
      borderRadius  : '6px 6px 3px 3px',
      fontSize      : '0.68rem',
      fontFamily    : 'var(--font-mono)',
      fontWeight    : 700,
      transition    : 'all 150ms ease',
      display       : 'flex',
      alignItems    : 'center',
      justifyContent: 'center',
      position      : 'relative',
      flexShrink    : 0,
      outline       : 'none',
      ...STYLE_SIEGE[statut],  // ← applique background, borderWidth, borderStyle, borderColor, color, cursor
    }

    return (
      <button
        key       ={`siege-${numero}`}
        type      ="button"
        disabled  ={statut === STATUTS.OCCUPE}
        onClick   ={() => { if (statut !== STATUTS.OCCUPE) onSelectSiege?.(numero) }}
        style     ={styleBase}
        title     ={
          statut === STATUTS.OCCUPE      ? `Siège ${numero} — Occupé`
          : statut === STATUTS.SELECTIONNE ? `Siège ${numero} — Votre choix ✓`
          : `Siège ${numero} — Disponible`
        }
        // ── CORRECTION CLÉE : onMouseEnter ne change QUE borderColor ──
        // borderWidth et borderStyle restent inchangés → plus de conflit
        onMouseEnter={e => {
          if (statut === STATUTS.LIBRE) {
            e.currentTarget.style.borderColor = 'var(--vert-clair)'
            e.currentTarget.style.background  = 'var(--vert-pale)'
          }
        }}
        onMouseLeave={e => {
          if (statut === STATUTS.LIBRE) {
            e.currentTarget.style.borderColor = 'var(--gris-bord)'
            e.currentTarget.style.background  = 'var(--blanc)'
          }
        }}
      >
        {statut === STATUTS.OCCUPE
          ? <span style={{ fontSize: '0.75rem' }}>✕</span>
          : statut === STATUTS.SELECTIONNE
          ? <span style={{ fontSize: '0.75rem' }}>✓</span>
          : <span>{numero}</span>
        }
        {/* Dossier visuel */}
        <div style={{
          position     : 'absolute',
          top          : '-5px',
          left         : '4px',
          right        : '4px',
          height       : '4px',
          borderRadius : '2px 2px 0 0',
          background   :
            statut === STATUTS.SELECTIONNE ? 'var(--or-soleil)'
            : statut === STATUTS.OCCUPE    ? '#D1D5DB'
            : 'var(--gris-bord)',
          pointerEvents: 'none',
        }} />
      </button>
    )
  }

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{
        background  : 'var(--creme)',
        borderWidth : '2px',         // ← séparé
        borderStyle : 'solid',
        borderColor : 'var(--gris-bord)',
        borderRadius: 'var(--radius-lg)',
        padding     : '1.25rem',
        maxWidth    : '300px',
        margin      : '0 auto',
      }}>

        {/* Pare-brise */}
        <div style={{
          background    : 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
          borderRadius  : 'var(--radius-md) var(--radius-md) 0 0',
          height        : '38px',
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'center',
          marginBottom  : '0.85rem',
          borderWidth   : '1.5px',
          borderStyle   : 'solid',
          borderColor   : '#93C5FD',
          fontSize      : '0.68rem',
          color         : '#1D4ED8',
          fontFamily    : 'var(--font-display)',
          fontWeight    : 600,
          letterSpacing : '0.05em',
        }}>
          🚌 AVANT DU BUS
        </div>

        {/* Siège chauffeur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width         : '36px',
            height        : '40px',
            borderRadius  : '6px 6px 3px 3px',
            background    : 'var(--vert-foret)',
            borderWidth   : '2px',
            borderStyle   : 'solid',
            borderColor   : 'var(--vert-foret)',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
            fontSize      : '0.9rem',
          }}>
            🚗
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>
            Chauffeur
          </span>
        </div>

        {/* Grille */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '320px' }}>
          {Array.from({ length: nbRangees }, (_, i) => {
            const base         = i * config.colonnes
            const siegesGauche = Array.from({ length: gauche }, (_, j) => base + j + 1)
            const siegesDroite = Array.from({ length: droite }, (_, j) => base + gauche + j + 1)
            return (
              <div key={`rangee-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                <span style={{ width: '16px', fontSize: '0.6rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-mono)', textAlign: 'right', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>{siegesGauche.map(renderSiege)}</div>
                <div style={{ width: '18px', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: '0.3rem' }}>{siegesDroite.map(renderSiege)}</div>
              </div>
            )
          })}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--gris-bord)', flexWrap: 'wrap' }}>
          {[
            { couleur: 'var(--blanc)',     bordure: 'var(--gris-bord)',  label: 'Libre'       },
            { couleur: 'var(--or-soleil)', bordure: 'var(--or-soleil)', label: 'Votre choix' },
            { couleur: '#F3F4F6',          bordure: '#D1D5DB',           label: 'Occupé'      },
          ].map(({ couleur, bordure, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: couleur, borderWidth: '2px', borderStyle: 'solid', borderColor: bordure, flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--gris-doux)', fontFamily: 'var(--font-display)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {siegeSelectionne && (
        <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--vert-foret)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Siège N°{siegeSelectionne} sélectionné ✓
        </p>
      )}
    </div>
  )
}

export default GrilleDesSeats