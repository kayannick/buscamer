// ============================================================
//
// RÔLE : Conteneur visuel réutilisable (carte blanche avec ombre).
//        Utilisé pour encadrer du contenu : formulaires, billets,
//        statistiques, informations de voyage, etc.
//
// PROPS :
//   children     : contenu de la carte
//   padding      : '0' | 'sm' | 'md' (défaut) | 'lg'
//   ombre        : 'sm' | 'md' (défaut) | 'lg' | 'none'
//   radius       : 'sm' | 'md' | 'lg' (défaut) | 'xl'
//   bordure      : boolean (affiche une bordure fine)
//   bordureGauche: couleur CSS (bande colorée à gauche, style billet)
//   hover        : boolean (effet de survol)
//   onClick      : fonction (rend la carte cliquable)
//   style        : styles additionnels (merge avec les styles de base)
//
// EXEMPLE D'USAGE :
//   <Card ombre="lg" padding="lg">
//     <h2>Contenu de la carte</h2>
//   </Card>
//
//   <Card bordureGauche="var(--vert-clair)" hover onClick={handleClick}>
//     Billet de voyage
//   </Card>
//
// INTERACTIONS :
//   ← Utilisé par : pages/Profil.jsx, pages/VoyageDetail.jsx,
//                   pages/Paiement.jsx, et tous les futurs formulaires
// ============================================================

const PADDINGS = {
  '0' : '0',
  sm  : '1rem',
  md  : '1.5rem',
  lg  : '2rem',
}

const OMBRES = {
  none: 'none',
  sm  : 'var(--ombre-sm)',
  md  : 'var(--ombre-md)',
  lg  : 'var(--ombre-lg)',
}

const RADIUS = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
}

const Card = ({
  children,
  padding       = 'md',
  ombre         = 'md',
  radius        = 'lg',
  bordure       = false,
  bordureGauche = '',
  hover         = false,
  onClick,
  style         = {},
  ...props
}) => {
  const estCliquable = !!onClick || hover

  return (
    <div
      onClick={onClick}
      style={{
        // Style de base
        background   : 'var(--blanc)',
        borderRadius : RADIUS[radius] ?? RADIUS.lg,
        boxShadow    : OMBRES[ombre]  ?? OMBRES.md,
        overflow     : 'hidden',
        transition   : hover ? 'all var(--transition)' : undefined,
        cursor       : estCliquable ? 'pointer' : 'default',

        // Bordure fine optionnelle
        border       : bordure ? '1.5px solid var(--gris-bord)' : 'none',

        // Bande colorée à gauche (style "billet")
        // Technique : affichage en grille avec une colonne de 5px
        ...(bordureGauche ? {
          display             : 'grid',
          gridTemplateColumns : `5px 1fr`,
        } : {
          padding: PADDINGS[padding] ?? PADDINGS.md,
        }),

        // Styles additionnels passés en prop
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.transform  = 'translateY(-2px)'
        e.currentTarget.style.boxShadow  = 'var(--ombre-lg)'
        e.currentTarget.style.borderColor = 'var(--vert-clair)'
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.transform  = 'none'
        e.currentTarget.style.boxShadow  = OMBRES[ombre]
        e.currentTarget.style.borderColor = 'var(--gris-bord)'
      } : undefined}
      {...props}
    >
      {/* Bande colorée gauche (si bordureGauche est définie) */}
      {bordureGauche && (
        <>
          <div style={{ background: bordureGauche }} />
          <div style={{ padding: PADDINGS[padding] ?? PADDINGS.md }}>
            {children}
          </div>
        </>
      )}

      {/* Contenu normal (si pas de bordureGauche) */}
      {!bordureGauche && children}
    </div>
  )
}

export default Card