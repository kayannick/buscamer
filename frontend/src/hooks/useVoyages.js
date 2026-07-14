//  ============================================================
// 
//  RÔLE : Hooks personnalisés pour encapsuler la logique
//         de récupération des voyages avec React Query.
// 
//  AVANTAGE :
//    Les pages n'ont pas besoin de connaître React Query.
//    Elles appellent juste useVoyageDetail(id) et reçoivent
//    { data, isLoading, isError }.
// 
//  INTERACTIONS :
//    → Utilise : services/voyageService.js
//    ← Utilisé par : pages/Voyages.jsx, pages/VoyageDetail.jsx
//
// CORRECTION : useVoyagesDuJour() charge tous les voyages futurs
// sans filtre de date par défaut.
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { rechercherVoyages, getVoyageDetail, getSiegesOccupes } from '../services/voyageService'

/**
 * Hook : tous les voyages futurs disponibles.
 * Utilisé au chargement de la page Voyages (sans filtres).
 */
export const useVoyages = (params = {}) => useQuery({
  queryKey : ['voyages', params],
  queryFn  : () => rechercherVoyages(params),
  staleTime: 3 * 60 * 1000,
  refetchOnWindowFocus: false,
})

export const useVoyageDetail = (id) => useQuery({
  queryKey : ['voyage', id],
  queryFn  : () => getVoyageDetail(id),
  enabled  : !!id,
  staleTime: 5 * 60 * 1000,
})

export const useSiegesOccupes = (voyageId) => useQuery({
  queryKey         : ['sieges-occupes', voyageId],
  queryFn          : () => getSiegesOccupes(voyageId),
  enabled          : !!voyageId,
  staleTime        : 0,
  refetchInterval  : 30000,
})
