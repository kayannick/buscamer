// ============================================================ 
//
// RÔLE : Enveloppe standard pour chaque page.
//        Assure que le Footer reste toujours en bas,
//        même si le contenu est court.
//        Affiche un spinner de chargement pendant la vérification
//        du token JWT au démarrage (état "chargement" du AuthContext).
//
// TECHNIQUE "STICKY FOOTER" :
//   Le body est en flex colonne avec min-height: 100vh.
//   PageWrapper est flex colonne et prend tout l'espace disponible.
//   Le main (contenu) a flex: 1 → pousse le footer vers le bas.
//
// PROPS :
//   children    : contenu de la page
//   titre       : titre de la page (affiché dans <title> du navigateur)
//   chargement  : boolean → affiche le Spinner à la place du contenu
//
// INTERACTIONS :
//   ← Utilisé par : toutes les pages (optionnel mais recommandé)
//   → Utilise : Footer.jsx, Spinner.jsx
// ============================================================

import { useEffect }  from 'react'
import Footer         from './Footer'
import Spinner        from '../ui/Spinner'

const PageWrapper = ({
  children,
  titre     = 'BusCam — Réservation de bus au Cameroun',
  chargement= false,
}) => {

  // Met à jour le titre de l'onglet du navigateur
  useEffect(() => {
    document.title = titre
  }, [titre])

  return (
    <div style={{
      display      : 'flex',
      flexDirection: 'column',
      minHeight    : '100vh',  // occupe au minimum toute la hauteur de l'écran
    }}>

      {/* ── Contenu principal ── */}
      <main style={{
        flex      : 1,           // s'étend pour remplir l'espace disponible
        background: 'var(--creme)',
      }}>
        {chargement ? (
          // Spinner centré pendant le chargement
          <div style={{
            minHeight      : '60vh',
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
          }}>
            <Spinner taille="lg" texte="Chargement en cours..." />
          </div>
        ) : (
          children
        )}
      </main>

      {/* ── Footer toujours en bas ── */}
      <Footer />
    </div>
  )
}

export default PageWrapper