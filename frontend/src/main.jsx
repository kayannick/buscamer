// ============================================================
//
// RÔLE : Point d'entrée de l'application React.
//        Monte l'arbre de composants dans le DOM.
//
// FLUX :
//   1. Vite charge index.html
//   2. index.html charge ce fichier via <script type="module">
//   3. Ce fichier monte <App /> dans <div id="root">
//      (le div "root" est dans index.html)
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// document.getElementById('root') → le <div id="root"> dans index.html
// createRoot() → crée un "root" React 18 (API moderne, remplace ReactDOM.render)
// .render()    → monte App dans ce root
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/*
      StrictMode : en développement seulement (retiré en prod par Vite),
      détecte les mauvaises pratiques :
      - Effets exécutés 2 fois (pour détecter les effets non nettoyés)
      - APIs dépréciées signalées
      - Pas d'impact sur les performances en production
    */}
    <App />
  </StrictMode>
)