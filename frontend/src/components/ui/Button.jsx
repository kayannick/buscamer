// ============================================================
//
// ERREURS CORRIGÉES DÉFINITIVEMENT :
//   - Plus AUCUN onMouseEnter/onMouseLeave qui modifie border*
//   - Le hover est géré via useState → pas de mélange shorthand
//   - Aucune propriété border dans les handlers d'événements
//
// PRINCIPE :
//   useState(false) pour hovered → style calculé directement
//   dans le JSX selon hovered → React gère le re-render proprement
//   sans jamais mixer shorthand et non-shorthand.
//
// INTERACTIONS :
//   → Utilisé par : toutes les pages et composants
// ============================================================

import { useState }  from 'react'
import Spinner       from './Spinner'

// ── Configurations des variantes ─────────────────────────────
// Chaque variante définit son style NORMAL et son style HOVER.
// Toutes les propriétés border sont en shorthand PARTOUT.
// On ne mélange JAMAIS border (shorthand) avec borderColor seul.
const VARIANTES = {
  primaire: {
    normal : { background: 'var(--vert-foret)', border: '2px solid transparent', color: 'var(--blanc)'  },
    hover  : { background: 'var(--vert-clair)', border: '2px solid transparent', color: 'var(--blanc)'  },
  },
  or: {
    normal : { background: 'var(--or-soleil)',  border: '2px solid transparent', color: 'var(--ardoise)'},
    hover  : { background: '#E8940A',           border: '2px solid transparent', color: 'var(--ardoise)'},
  },
  secondaire: {
    normal : { background: 'transparent', border: '2px solid var(--vert-foret)', color: 'var(--vert-foret)' },
    hover  : { background: 'var(--vert-pale)', border: '2px solid var(--vert-foret)', color: 'var(--vert-foret)' },
  },
  fantome: {
    normal : { background: 'transparent', border: '2px solid transparent', color: 'var(--gris-doux)' },
    hover  : { background: 'var(--creme)', border: '2px solid var(--gris-bord)', color: 'var(--ardoise)' },
  },
  danger: {
    normal : { background: 'var(--rouge-erreur)', border: '2px solid transparent', color: 'var(--blanc)' },
    hover  : { background: '#B91C1C', border: '2px solid transparent', color: 'var(--blanc)' },
  },
}

const TAILLES = {
  sm : { padding: '0.4rem 1rem',    fontSize: '0.85rem' },
  md : { padding: '0.65rem 1.5rem', fontSize: '0.95rem' },
  lg : { padding: '0.85rem 2rem',   fontSize: '1.05rem' },
}

const Button = ({
  children,
  variante     = 'primaire',
  taille       = 'md',
  chargement   = false,
  pleineLargeur= false,
  type         = 'button',
  onClick,
  disabled,
  style        = {},
  ...props
}) => {
  // ── useState pour le hover ────────────────────────────────
  // C'est la seule façon de modifier les styles border en React
  // sans provoquer les warnings de mélange shorthand/non-shorthand.
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const config     = VARIANTES[variante] ?? VARIANTES.primaire
  const tailleConf = TAILLES[taille]     ?? TAILLES.md

  // Style calculé selon l'état actuel
  const styleActif = (disabled || chargement)
    ? config.normal
    : pressed
    ? { ...config.hover, transform: 'translateY(0px)', boxShadow: 'none' }
    : hovered
    ? { ...config.hover, transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }
    : config.normal

  return (
    <button
      type     ={type}
      onClick  ={onClick}
      disabled ={disabled || chargement}
      style    ={{
        display        : 'inline-flex',
        alignItems     : 'center',
        justifyContent : 'center',
        gap            : '0.5rem',
        fontFamily     : 'var(--font-display)',
        fontWeight     : 600,
        borderRadius   : 'var(--radius-md)',
        transition     : 'all var(--transition)',
        width          : pleineLargeur ? '100%' : 'auto',
        cursor         : disabled || chargement ? 'not-allowed' : 'pointer',
        opacity        : disabled || chargement ? 0.6 : 1,
        whiteSpace     : 'nowrap',
        outline        : 'none',
        ...tailleConf,
        ...styleActif,
        ...style,        // styles externes en dernier
      }}
      onMouseEnter={() => { if (!disabled && !chargement) setHovered(true)  }}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown ={() => { if (!disabled && !chargement) setPressed(true)  }}
      onMouseUp   ={() => setPressed(false)}
      {...props}
    >
      {chargement ? <Spinner taille="sm" couleur="currentColor" /> : children}
    </button>
  )
}

export default Button
