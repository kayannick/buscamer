// ============================================================
//
// RÔLE : Indicateur de chargement animé.
//        Utilisé pendant les appels API, les chargements de page,
//        et dans le composant Button (prop chargement=true).
//
// PROPS :
//   taille  : 'sm' | 'md' (défaut) | 'lg'
//   couleur : n'importe quelle couleur CSS (défaut: var(--vert-foret))
//   texte   : texte optionnel affiché sous le spinner
//
// INTERACTIONS :
//   ← Utilisé par : Button.jsx, PageWrapper.jsx,
//                   pages en état de chargement
// ============================================================

const TAILLES = {
  sm : { dim: 18, stroke: 2.5 },
  md : { dim: 32, stroke: 2.5 },
  lg : { dim: 48, stroke: 3   },
}

const Spinner = ({
  taille  = 'md',
  couleur = 'var(--vert-foret)',
  texte   = '',
}) => {
  const { dim, stroke } = TAILLES[taille] ?? TAILLES.md

  return (
    <div style={{
      display       : 'flex',
      flexDirection : 'column',
      alignItems    : 'center',
      justifyContent: 'center',
      gap           : texte ? '0.75rem' : 0,
    }}>
      {/* SVG animé en rotation */}
      <svg
        width    ={dim}
        height   ={dim}
        viewBox  ="0 0 24 24"
        fill     ="none"
        stroke   ={couleur}
        strokeWidth={stroke}
        strokeLinecap="round"
        style={{ animation: 'spinnerRotation 0.75s linear infinite' }}
        aria-label="Chargement en cours"
        role="status"
      >
        {/* Cercle partiel : l'effet de "tourne" vient du fait que  */}
        {/* seul un arc est dessiné, pas un cercle complet          */}
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>

      {/* Texte optionnel sous le spinner */}
      {texte && (
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize  : '0.85rem',
          color     : 'var(--gris-doux)',
          margin    : 0,
        }}>
          {texte}
        </p>
      )}

      {/* Animation CSS injectée une seule fois */}
      <style>{`
        @keyframes spinnerRotation {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Spinner