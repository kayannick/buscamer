// ============================================================
//
// RÔLE : Hooks personnalisés pour encapsuler la logique
//        de récupération des voyages avec React Query.
//
// AVANTAGE :
//   Les pages n'ont pas besoin de connaître React Query.
//   Elles appellent juste useVoyageDetail(id) et reçoivent
//   { data, isLoading, isError }.
//
// INTERACTIONS :
//   → Utilise : services/voyageService.js
//   ← Utilisé par : pages/Voyages.jsx, pages/VoyageDetail.jsx
// ============================================================

import { useQuery } from '@tanstack/react-query'
import {
  rechercherVoyages,
  getVoyageDetail,
  getSiegesOccupes,
} from '../services/voyageService'

/**
 * Hook pour rechercher des voyages selon des critères.
 *
 * PARAMÈTRES :
 *   criteres = { ville_depart, ville_arrivee, date }
 *   actif    = true/false (déclenche ou suspend la requête)
 *
 * React Query re-fetche automatiquement si criteres change.
 * Met en cache le résultat 3 minutes.
 */
export const useRechercheVoyages = (criteres, actif = true) => {
  return useQuery({
    queryKey : ['voyages', criteres],
    queryFn  : () => rechercherVoyages(criteres),
    enabled  : actif && !!(criteres?.ville_depart && criteres?.ville_arrivee),
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook pour récupérer le détail d'un voyage par ID.
 *
 * PARAMÈTRE : id (string ou number depuis useParams)
 *
 * enabled: !!id → ne lance pas la requête si id est undefined.
 */
export const useVoyageDetail = (id) => {
  return useQuery({
    queryKey : ['voyage', id],
    queryFn  : () => getVoyageDetail(id),
    enabled  : !!id,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook pour récupérer les sièges occupés d'un voyage.
 *
 * PARAMÈTRE : voyageId
 *
 * staleTime court (30s) car les sièges peuvent se remplir vite.
 */
export const useSiegesOccupes = (voyageId) => {
  return useQuery({
    queryKey : ['sieges-occupes', voyageId],
    queryFn  : () => getSiegesOccupes(voyageId),
    enabled  : !!voyageId,
    staleTime: 30 * 1000,
  })
}