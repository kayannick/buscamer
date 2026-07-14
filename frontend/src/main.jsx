// ============================================================
// 
// //
// // RÔLE : Point d'entrée de l'application React.
// //        Monte l'arbre de composants dans le DOM.
// //
// // FLUX :
// //   1. Vite charge index.html
// //   2. index.html charge ce fichier via <script type="module">
// //   3. Ce fichier monte <App /> dans <div id="root">
// //      (le div "root" est dans index.html)
//
// RÈGLE ABSOLUE :
//   BrowserRouter doit englober TOUT ce qui utilise
//   useLocation, useNavigate, useParams, <Link>, <Route>...
//
//   App.jsx contient des composants qui utilisent ces hooks
//   → BrowserRouter doit être ICI, dans main.jsx,
//     AVANT le rendu de <App />.
// ============================================================

import { StrictMode }       from 'react'
import { createRoot }       from 'react-dom/client'
import { BrowserRouter }    from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import  { AuthProvider }      from './context/AuthProvider'
import App                  from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry          : 1,
      refetchOnWindowFocus: false,
      staleTime      : 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/*
      BrowserRouter EN PREMIER — englobe tout.
      Permet useLocation/useNavigate partout dans l'arbre.
    */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
