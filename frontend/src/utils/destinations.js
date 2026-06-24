// ============================================================
// frontend/src/utils/destinations.js
//
// RÔLE : Centralise toutes les destinations disponibles
//        et les agences de voyage du Cameroun et sous-région.
//        Utilisé par Accueil.jsx, Voyages.jsx, et les modèles Django.
//
// SOURCES : agences réelles opérant au Cameroun en 2026.
//
// INTERACTIONS :
//   ← Importé par : pages/Accueil.jsx, pages/Voyages.jsx
//   ← Référencé par : backend/voyages/models.py (VilleChoices)
// ============================================================

// ── Destinations Cameroun ─────────────────────────────────────
export const VILLES_CAMEROUN = [
  // Grand Centre
  { valeur: 'YAOUNDE',      label: 'Yaoundé',       region: 'Centre',      emoji: '🏛️' },
  { valeur: 'MBALMAYO',     label: 'Mbalmayo',      region: 'Centre',      emoji: '🌿' },
  { valeur: 'OBALA',        label: 'Obala',          region: 'Centre',      emoji: '🌾' },
  { valeur: 'BAFIA',        label: 'Bafia',          region: 'Centre',      emoji: '🌿' },
  { valeur: 'NANGA_EBOKO',  label: 'Nanga Eboko',   region: 'Centre',      emoji: '🌿' },

  // Littoral
  { valeur: 'DOUALA',       label: 'Douala',         region: 'Littoral',    emoji: '🏙️' },
  { valeur: 'NKONGSAMBA',   label: 'Nkongsamba',     region: 'Littoral',    emoji: '🌄' },
  { valeur: 'EDEA',         label: 'Édéa',           region: 'Littoral',    emoji: '⚡' },
  { valeur: 'LOUM',         label: 'Loum',           region: 'Littoral',    emoji: '🌿' },

  // Ouest
  { valeur: 'BAFOUSSAM',    label: 'Bafoussam',      region: 'Ouest',       emoji: '🏔️' },
  { valeur: 'DSCHANG',      label: 'Dschang',        region: 'Ouest',       emoji: '🌄' },
  { valeur: 'MBOUDA',       label: 'Mbouda',         region: 'Ouest',       emoji: '🌿' },
  { valeur: 'FOUMBAN',      label: 'Foumban',        region: 'Ouest',       emoji: '🕌' },
  { valeur: 'BAFANG',       label: 'Bafang',         region: 'Ouest',       emoji: '🌿' },
  { valeur: 'BANGANGTE',    label: 'Bangangté',      region: 'Ouest',       emoji: '🌄' },

  // Nord-Ouest
  { valeur: 'BAMENDA',      label: 'Bamenda',        region: 'Nord-Ouest',  emoji: '🏔️' },
  { valeur: 'KUMBO',        label: 'Kumbo',          region: 'Nord-Ouest',  emoji: '🌿' },
  { valeur: 'WUMF',         label: 'Wum',            region: 'Nord-Ouest',  emoji: '🌿' },
  { valeur: 'NKAMBE',       label: 'Nkambé',         region: 'Nord-Ouest',  emoji: '🌿' },

  // Sud-Ouest
  { valeur: 'BUEA',         label: 'Buea',           region: 'Sud-Ouest',   emoji: '🌋' },
  { valeur: 'LIMBE',        label: 'Limbé',          region: 'Sud-Ouest',   emoji: '🌊' },
  { valeur: 'KUMBA',        label: 'Kumba',          region: 'Sud-Ouest',   emoji: '🌿' },
  { valeur: 'MAMFE',        label: 'Mamfé',          region: 'Sud-Ouest',   emoji: '🌿' },
  { valeur: 'MUNDEMBA',     label: 'Mundemba',       region: 'Sud-Ouest',   emoji: '🌿' },

  // Nord
  { valeur: 'GAROUA',       label: 'Garoua',         region: 'Nord',        emoji: '🌅' },
  { valeur: 'GUIDER',       label: 'Guider',         region: 'Nord',        emoji: '🌾' },
  { valeur: 'POLI',         label: 'Poli',           region: 'Nord',        emoji: '🌿' },
  { valeur: 'TCHOLLIRE',    label: 'Tcholliré',      region: 'Nord',        emoji: '🌾' },

  // Extrême-Nord
  { valeur: 'MAROUA',       label: 'Maroua',         region: 'Extrême-Nord',emoji: '🏜️' },
  { valeur: 'KOUSSERI',     label: 'Kousseri',       region: 'Extrême-Nord',emoji: '🌅' },
  { valeur: 'MORA',         label: 'Mora',           region: 'Extrême-Nord',emoji: '🏜️' },
  { valeur: 'MOKOLO',       label: 'Mokolo',         region: 'Extrême-Nord',emoji: '🏔️' },

  // Adamaoua
  { valeur: 'NGAOUNDERE',   label: 'Ngaoundéré',     region: 'Adamaoua',    emoji: '🌄' },
  { valeur: 'MEIGANGA',     label: 'Meiganga',       region: 'Adamaoua',    emoji: '🌿' },
  { valeur: 'TIBATI',       label: 'Tibati',         region: 'Adamaoua',    emoji: '🌿' },

  // Est
  { valeur: 'BERTOUA',      label: 'Bertoua',        region: 'Est',         emoji: '🌿' },
  { valeur: 'BATOURI',      label: 'Batouri',        region: 'Est',         emoji: '🌿' },
  { valeur: 'ABONG_MBANG',  label: 'Abong-Mbang',   region: 'Est',         emoji: '🌿' },
  { valeur: 'YOKADOUMA',    label: 'Yokadouma',      region: 'Est',         emoji: '🌿' },

  // Sud
  { valeur: 'EBOLOWA',      label: 'Ébolowa',        region: 'Sud',         emoji: '🌿' },
  { valeur: 'KRIBI',        label: 'Kribi',          region: 'Sud',         emoji: '🌊' },
  { valeur: 'SANGMELIMA',   label: 'Sangmélima',     region: 'Sud',         emoji: '🌿' },
  { valeur: 'AMBAM',        label: 'Ambam',          region: 'Sud',         emoji: '🌿' },
]

// ── Destinations sous-régionales (CEMAC) ─────────────────────
// Ces destinations nécessitent un passeport ou CEDEAO
export const VILLES_SOUS_REGION = [
  // Gabon
  { valeur: 'LIBREVILLE',   label: 'Libreville (Gabon)',   pays: 'Gabon',   emoji: '🇬🇦' },
  { valeur: 'OYEM_GA',      label: 'Oyem (Gabon)',         pays: 'Gabon',   emoji: '🇬🇦' },

  // Congo Brazzaville
  { valeur: 'BRAZZAVILLE',  label: 'Brazzaville (Congo)',  pays: 'Congo',   emoji: '🇨🇬' },
  { valeur: 'POINTE_NOIRE', label: 'Pointe-Noire (Congo)', pays: 'Congo',   emoji: '🇨🇬' },

  // Centrafrique
  { valeur: 'BANGUI',       label: 'Bangui (RCA)',         pays: 'RCA',     emoji: '🇨🇫' },

  // Tchad
  { valeur: 'NDJAMENA',     label: 'N\'Djaména (Tchad)',   pays: 'Tchad',   emoji: '🇹🇩' },

  // Nigéria
  { valeur: 'CALABAR',      label: 'Calabar (Nigéria)',    pays: 'Nigéria', emoji: '🇳🇬' },

  // Guinée Équatoriale
  { valeur: 'MALABO',       label: 'Malabo (GE)',          pays: 'G. Équ.', emoji: '🇬🇶' },
]

// ── Agences de voyage camerounaises ──────────────────────────
export const AGENCES_CAMEROUN = [
  // Agences majeures (présence nationale)
  {
    nom        : 'Vatican Express',
    villes     : ['YAOUNDE', 'DOUALA', 'BAFOUSSAM', 'BAMENDA', 'NGAOUNDERE'],
    description: 'La plus grande agence nationale, service VIP disponible',
    telephone  : '+237 222 23 00 00',
  },
  {
    nom        : 'Touristique Express',
    villes     : ['YAOUNDE', 'DOUALA', 'BAFOUSSAM', 'BERTOUA', 'NGAOUNDERE'],
    description: 'Confort et ponctualité, flotte moderne',
    telephone  : '+237 233 42 00 00',
  },
  {
    nom        : 'General Express',
    villes     : ['YAOUNDE', 'DOUALA', 'BAMENDA', 'BUEA', 'LIMBE'],
    description: 'Spécialiste des lignes Littoral-Anglophones',
    telephone  : '+237 233 42 11 00',
  },
  {
    nom        : 'Buca Voyages',
    villes     : ['DOUALA', 'BUEA', 'LIMBE', 'KUMBA', 'MAMFE'],
    description: 'Expert des lignes Sud-Ouest',
    telephone  : '+237 233 32 44 44',
  },
  {
    nom        : 'Finexs',
    villes     : ['YAOUNDE', 'DOUALA', 'BAFOUSSAM', 'DSCHANG', 'FOUMBAN'],
    description: 'Service Ouest Cameroun, départs fréquents',
    telephone  : '+237 222 22 39 39',
  },
  {
    nom        : 'Mimboman Voyages',
    villes     : ['YAOUNDE', 'MBALMAYO', 'EBOLOWA', 'KRIBI', 'SANGMELIMA'],
    description: 'Spécialiste des lignes du Sud',
    telephone  : '+237 222 31 00 00',
  },
  {
    nom        : 'Trans Gala',
    villes     : ['YAOUNDE', 'BERTOUA', 'BATOURI', 'ABONG_MBANG', 'YOKADOUMA'],
    description: 'Expert des lignes Est Cameroun',
    telephone  : '+237 222 00 11 22',
  },
  {
    nom        : 'Avenir Voyages',
    villes     : ['YAOUNDE', 'DOUALA', 'GAROUA', 'MAROUA', 'NGAOUNDERE'],
    description: 'Lignes Grand Nord, service climatisé',
    telephone  : '+237 222 51 00 00',
  },
  {
    nom        : 'Guarantee Express',
    villes     : ['DOUALA', 'YAOUNDE', 'BAFOUSSAM', 'BAMENDA', 'KUMBA'],
    description: 'Service express inter-régional',
    telephone  : '+237 233 40 80 80',
  },
  {
    nom        : 'Royal Palace',
    villes     : ['YAOUNDE', 'DOUALA', 'NGAOUNDERE', 'GAROUA', 'MAROUA'],
    description: 'Service Business Class disponible',
    telephone  : '+237 222 22 90 90',
  },
]

// ── Lignes populaires ─────────────────────────────────────────
// Utilisées sur la page d'accueil
export const LIGNES_POPULAIRES = [
  { dep: 'YAOUNDE',   arr: 'DOUALA',     prix: 3500,  duree: '3h',   frequence: 'Toutes les heures'  },
  { dep: 'DOUALA',    arr: 'BAFOUSSAM',  prix: 4000,  duree: '4h',   frequence: '8 départs/jour'     },
  { dep: 'YAOUNDE',   arr: 'BAFOUSSAM',  prix: 4500,  duree: '4h30', frequence: '6 départs/jour'     },
  { dep: 'DOUALA',    arr: 'BUEA',       prix: 2000,  duree: '1h30', frequence: 'Toutes les 2h'      },
  { dep: 'YAOUNDE',   arr: 'BERTOUA',    prix: 6000,  duree: '5h',   frequence: '4 départs/jour'     },
  { dep: 'DOUALA',    arr: 'LIMBE',      prix: 1500,  duree: '1h',   frequence: 'Toutes les heures'  },
  { dep: 'YAOUNDE',   arr: 'EBOLOWA',    prix: 3000,  duree: '3h',   frequence: '5 départs/jour'     },
  { dep: 'BAFOUSSAM', arr: 'BAMENDA',    prix: 2500,  duree: '2h',   frequence: '6 départs/jour'     },
  { dep: 'YAOUNDE',   arr: 'NGAOUNDERE', prix: 10000, duree: '9h',   frequence: '2 départs/jour'     },
  { dep: 'DOUALA',    arr: 'KUMBA',      prix: 3000,  duree: '3h',   frequence: '4 départs/jour'     },
  { dep: 'YAOUNDE',   arr: 'KRIBI',      prix: 4000,  duree: '3h30', frequence: '3 départs/jour'     },
  { dep: 'GAROUA',    arr: 'MAROUA',     prix: 3500,  duree: '3h',   frequence: '4 départs/jour'     },
]

// ── Helpers ───────────────────────────────────────────────────

/**
 * Retourne le label d'une ville depuis sa valeur.
 * Ex: villeLabel('YAOUNDE') → 'Yaoundé'
 */
export const villeLabel = (valeur) => {
  const ville = VILLES_CAMEROUN.find(v => v.valeur === valeur)
  return ville?.label ?? valeur
}

/**
 * Retourne toutes les villes groupées par région.
 * Utilisé pour afficher un <select> avec des groupes.
 */
export const villesParRegion = () => {
  const groupes = {}
  VILLES_CAMEROUN.forEach(ville => {
    if (!groupes[ville.region]) groupes[ville.region] = []
    groupes[ville.region].push(ville)
  })
  return groupes
}