// ============================================================
// frontend/src/components/ui/Button.jsx
// ============================================================

const Button = ({
  children,
  variante = 'primaire',  // 'primaire' | 'secondaire' | 'fantome' | 'danger'
  taille = 'md',          // 'sm' | 'md' | 'lg'
  chargement = false,
  pleineLargeur = false,
  type = 'button',
  onClick,
  disabled,
  ...props
}) => {
  const styles = {
    display        : 'inline-flex',
    alignItems     : 'center',
    justifyContent : 'center',
    gap            : '0.5rem',
    fontFamily     : 'var(--font-display)',
    fontWeight     : 600,
    borderRadius   : 'var(--radius-md)',
    transition     : `all var(--transition)`,
    width          : pleineLargeur ? '100%' : 'auto',
    cursor         : disabled || chargement ? 'not-allowed' : 'pointer',
    opacity        : disabled || chargement ? 0.65 : 1,
    border         : '2px solid transparent',
    whiteSpace     : 'nowrap',

    // Taille
    ...(taille === 'sm' && { padding: '0.4rem 1rem',   fontSize: '0.85rem' }),
    ...(taille === 'md' && { padding: '0.65rem 1.5rem', fontSize: '0.95rem' }),
    ...(taille === 'lg' && { padding: '0.85rem 2rem',   fontSize: '1.05rem' }),

    // Variante
    ...(variante === 'primaire' && {
      background: 'var(--vert-foret)',
      color     : 'var(--blanc)',
    }),
    ...(variante === 'or' && {
      background: 'var(--or-soleil)',
      color     : 'var(--ardoise)',
    }),
    ...(variante === 'secondaire' && {
      background  : 'transparent',
      color       : 'var(--vert-foret)',
      borderColor : 'var(--vert-foret)',
    }),
    ...(variante === 'fantome' && {
      background: 'transparent',
      color     : 'var(--gris-doux)',
    }),
    ...(variante === 'danger' && {
      background: 'var(--rouge-erreur)',
      color     : 'var(--blanc)',
    }),
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || chargement}
      style={styles}
      onMouseEnter={e => {
        if (!disabled && !chargement) {
          if (variante === 'primaire')
            e.currentTarget.style.background = 'var(--vert-clair)'
          if (variante === 'or')
            e.currentTarget.style.filter = 'brightness(1.08)'
          if (variante === 'secondaire')
            e.currentTarget.style.background = 'var(--vert-pale)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background =
          variante === 'primaire' ? 'var(--vert-foret)'
          : variante === 'or'    ? 'var(--or-soleil)'
          : 'transparent'
        e.currentTarget.style.filter = ''
      }}
      {...props}
    >
      {chargement ? <Spinner taille="sm" /> : children}
    </button>
  )
}

// Spinner inline (évite un import circulaire)
const Spinner = ({ taille = 'md' }) => {
  const dim = taille === 'sm' ? 16 : 24
  return (
    <svg
      width={dim} height={dim} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  )
}

export default Button