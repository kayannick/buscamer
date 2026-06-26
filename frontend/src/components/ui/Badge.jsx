// ============================================================
// Étiquette de statut colorée (voyage, paiement, type de bus)
// ============================================================

const VARIANTES = {
  PROGRAMME : { bg: 'var(--vert-pale)',   color: 'var(--vert-foret)', label: 'Programmé'  },
  EN_COURS  : { bg: 'var(--or-pale)',     color: '#92400E',           label: 'En cours'   },
  TERMINE   : { bg: '#F3F4F6',            color: 'var(--gris-doux)',  label: 'Terminé'    },
  ANNULE    : { bg: '#FEE2E2',            color: 'var(--rouge-erreur)',label: 'Annulé'    },
  CONFIRME  : { bg: 'var(--vert-pale)',   color: 'var(--vert-foret)', label: 'Confirmé'   },
  EN_ATTENTE: { bg: 'var(--or-pale)',     color: '#92400E',           label: 'En attente' },
  REMBOURSE : { bg: '#EDE9FE',            color: '#5B21B6',           label: 'Remboursé'  },
  VIP       : { bg: 'var(--ardoise)',     color: 'var(--or-soleil)',  label: 'VIP'        },
  CLASSIQUE : { bg: '#F3F4F6',            color: 'var(--ardoise)',    label: 'Classique'  },
  BUSINESS  : { bg: '#DBEAFE',            color: '#1D4ED8',           label: 'Business'   },
}

const Badge = ({ statut, textePersonnalise }) => {
  const config = VARIANTES[statut] ?? {
    bg: '#F3F4F6', color: 'var(--gris-doux)', label: statut
  }

  return (
    <span style={{
      display      : 'inline-flex',
      alignItems   : 'center',
      gap          : '0.3rem',
      padding      : '0.2rem 0.65rem',
      borderRadius : '999px',
      fontSize     : '0.75rem',
      fontWeight   : 600,
      fontFamily   : 'var(--font-display)',
      background   : config.bg,
      color        : config.color,
      letterSpacing: '0.02em',
    }}>
      <span style={{
        width        : 6, height: 6,
        borderRadius : '50%',
        background   : config.color,
        flexShrink   : 0,
      }} />
      {textePersonnalise ?? config.label}
    </span>
  )
}

export default Badge