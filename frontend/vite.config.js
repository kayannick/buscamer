
// ============================================================

//
// RÔLE : Configuration du serveur de développement Vite.
//
// INTERACTIONS :
//   Utilsé par : 'npm run dev' (serveur de dev)
//                'npm run build' (compilation prod)
// ============================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // '@' pointe vers src/ :
      // Permet d'écrire : import Button from '@/components/ui/Button'
      // Au lieu de      : import Button from '../../components/ui/Button'
      // (plus lisible, indépendant de la profondeur du fichier)
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,  // Port du serveur de développement React

    // --------------------------------------------------------
    // PROXY DE DÉVELOPPEMENT
    //
    // Optionnel mais puissant : redirige les appels /api/*
    // vers Django SANS passer par CORS.
    //
    // AVEC proxy :
    //   React appelle  : /api/voyages/
    //   Vite redirige  : http://localhost:8000/api/voyages/
    //   → Comme si React et Django étaient sur le même serveur
    //   → Plus besoin de CORS en développement !
    //
    // SANS proxy (notre choix actuel) :
    //   React appelle  : http://localhost:8000/api/voyages/
    //   CORS est géré par django-cors-headers (configuré Étape 2)
    //
    // On garde le proxy en commentaire pour référence :
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000',
    //     changeOrigin: true,
    //   }
    // }
    // --------------------------------------------------------
  },
})
