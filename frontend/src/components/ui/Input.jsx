// ============================================================
//
// RÔLE : Champ de saisie réutilisable avec label, aide et erreur.
//        Centralise le style des inputs pour toute l'application.
//        Évite de répéter les mêmes styles dans chaque formulaire.
//
// PROPS :
//   label       : texte du label affiché au-dessus
//   name        : attribut HTML name (aussi utilisé comme id)
//   type        : 'text' | 'email' | 'password' | 'tel' | 'date' | ...
//   value       : valeur contrôlée (depuis useState du parent)
//   onChange    : fonction appelée à chaque frappe
//   placeholder : texte gris quand le champ est vide
//   erreur      : message d'erreur (vide = pas d'erreur)
//   aide        : texte d'aide discret sous le champ
//   requis      : boolean → affiche une étoile dans le label
//   disabled    : boolean → grise le champ
//
// INTERACTIONS :
//   ← Utilisé par : pages/Connexion.jsx, pages/Inscription.jsx,
//                   et tous les formulaires futurs
// ============================================================

const Input = ({
  label       = '',
  name        = '',
  type        = 'text',
  value       = '',
  onChange,
  placeholder = '',
  erreur      = '',
  aide        = '',
  requis      = false,
  disabled    = false,
  autoComplete= '',
  ...props
}) => {

  // ── Styles calculés selon l'état ──────────────────────────
  // La couleur de bordure change selon l'état du champ
  const couleurBordure = erreur
    ? 'var(--rouge-erreur)'
    : 'var(--gris-bord)'

  const inputStyle = {
    width        : '100%',
    padding      : '0.7rem 1rem',
    borderRadius : 'var(--radius-sm)',
    border       : `1.5px solid ${couleurBordure}`,
    fontSize     : '0.92rem',
    fontFamily   : 'var(--font-body)',
    color        : 'var(--ardoise)',
    background   : disabled ? '#F9FAFB' : 'var(--creme)',
    outline      : 'none',
    transition   : 'border-color var(--transition), box-shadow var(--transition)',
    cursor       : disabled ? 'not-allowed' : 'text',
    opacity      : disabled ? 0.7 : 1,
  }

  return (
    <div style={{
      display      : 'flex',
      flexDirection: 'column',
      gap          : '0.35rem',
      width        : '100%',
    }}>

      {/* ── Label ── */}
      {label && (
        <label
          htmlFor={name}
          style={{
            fontFamily   : 'var(--font-display)',
            fontWeight   : 600,
            fontSize     : '0.82rem',
            color        : erreur ? 'var(--rouge-erreur)' : 'var(--ardoise)',
            display      : 'flex',
            alignItems   : 'center',
            gap          : '0.25rem',
          }}
        >
          {label}
          {/* Étoile pour les champs obligatoires */}
          {requis && (
            <span style={{ color: 'var(--or-soleil)', fontSize: '0.9rem' }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* ── Champ de saisie ── */}
      <input
        id          ={name}
        name        ={name}
        type        ={type}
        value       ={value}
        onChange    ={onChange}
        placeholder ={placeholder}
        required    ={requis}
        disabled    ={disabled}
        autoComplete={autoComplete}
        style       ={inputStyle}
        aria-invalid={!!erreur}
        aria-describedby={erreur ? `${name}-erreur` : aide ? `${name}-aide` : undefined}
        onFocus={e => {
          if (!disabled) {
            e.target.style.borderColor = erreur
              ? 'var(--rouge-erreur)'
              : 'var(--vert-clair)'
            e.target.style.boxShadow = erreur
              ? '0 0 0 3px rgba(220,38,38,0.1)'
              : '0 0 0 3px rgba(64,145,108,0.12)'
          }
        }}
        onBlur={e => {
          e.target.style.borderColor = couleurBordure
          e.target.style.boxShadow   = 'none'
        }}
        {...props}
      />

      {/* ── Message d'erreur (prioritaire sur l'aide) ── */}
      {erreur && (
        <span
          id={`${name}-erreur`}
          style={{
            fontSize  : '0.75rem',
            color     : 'var(--rouge-erreur)',
            display   : 'flex',
            alignItems: 'center',
            gap       : '0.25rem',
            lineHeight: 1.4,
          }}
          role="alert"
        >
          ⚠️ {erreur}
        </span>
      )}

      {/* ── Texte d'aide (affiché seulement si pas d'erreur) ── */}
      {aide && !erreur && (
        <span
          id={`${name}-aide`}
          style={{
            fontSize  : '0.72rem',
            color     : 'var(--gris-doux)',
            lineHeight: 1.4,
          }}
        >
          {aide}
        </span>
      )}
    </div>
  )
}

export default Input