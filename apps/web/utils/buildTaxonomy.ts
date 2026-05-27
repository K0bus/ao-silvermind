import {
  BUILD_BUDGET_OPTIONS,
  BUILD_CONTENT_TYPE_OPTIONS,
  BUILD_DIFFICULTY_OPTIONS,
  BUILD_GROUP_SCALE_OPTIONS,
  BUILD_PLAYSTYLE_OPTIONS,
  BUILD_ROLE_OPTIONS,
  buildTagLabel,
  type BuildBudget,
  type BuildContentType,
  type BuildDifficulty,
  type BuildGroupScale,
  type BuildPlaystyle,
  type BuildRole,
} from '@albion-tool/types'

type BuildSlotKey = 'weapon' | 'offhand' | 'helmet' | 'armor' | 'shoes' | 'cape' | 'bag' | 'food' | 'potion' | 'mount'

export {
  BUILD_BUDGET_OPTIONS,
  BUILD_CONTENT_TYPE_OPTIONS,
  BUILD_DIFFICULTY_OPTIONS,
  BUILD_GROUP_SCALE_OPTIONS,
  BUILD_PLAYSTYLE_OPTIONS,
  BUILD_ROLE_OPTIONS,
  buildTagLabel,
}

export type BuildMetadataOption =
  | BuildContentType
  | BuildRole
  | BuildGroupScale
  | BuildPlaystyle
  | BuildDifficulty
  | BuildBudget

export interface PickerFamilyOption {
  value: string
  label: string
}

export interface PickerSlotTaxonomy {
  category?: PickerFamilyOption | null
  families: PickerFamilyOption[]
}

export interface BuildTaxonomyResponse {
  slots: Record<BuildSlotKey, PickerSlotTaxonomy>
}

const WEAPON_FAMILY_LABELS: Record<string, string> = {
  axe: 'Haches',
  bow: 'Arcs',
  crossbow: 'Arbalètes',
  cursestaff: 'Bâtons maudits', // Match database "cursestaff"
  dagger: 'Dagues',
  demonicstaff: 'Bâtons démoniaques',
  firestaff: 'Bâtons de feu',
  froststaff: 'Bâtons de givre',
  hammer: 'Marteaux',
  holystaff: 'Bâtons sacrés',
  mace: 'Masses',
  naturestaff: 'Bâtons de nature',
  quarterstaff: 'Bâtons de combat',
  shapeshifterstaff: 'Bâtons métamorphes',
  spear: 'Lances',
  sword: 'Épées',
  arcanestaff: 'Bâtons arcaniques', // Match database "arcanestaff"
}

const OFFHAND_FAMILY_LABELS: Record<string, string> = {
  shield: 'Boucliers',
  torch: 'Torches',
  horn: 'Cornes',
  orb: 'Orbes',
  tome: 'Tomes',
  book: 'Livres',
  totem: 'Totems',
  cryptcandle: 'Bougies',
  facebreaker: 'Facebreaker',
  mistcaller: 'Mistcaller',
  sarcophagus: 'Sarcophage',
  muisak: 'Muisak',
  censer: 'Encensoirs',
  leash: 'Leashes',
}

const ARMOR_FAMILY_LABELS: Record<string, string> = {
  cloth: 'Tissu',
  leather: 'Cuir',
  plate: 'Plaque',
}

const MOUNT_FAMILY_LABELS: Record<string, string> = {
  mount: 'Montures',
  horse: 'Chevaux',
  ox: 'Bœufs',
  giantstag: 'Cerfs',
  direboar: 'Sangliers',
  direwolf: 'Loups',
  moabird: 'Moas',
  terrorbird: 'Terrorbirds',
  armoredhorse: 'Chevaux blindés',
}

const CONSUMABLE_FAMILY_LABELS: Record<string, string> = {
  food: 'Nourriture',
  potions: 'Potions',
  potion: 'Potions',
  meal: 'Repas',
  omelette: 'Omelettes',
  stew: 'Ragoûts',
  soup: 'Soupes',
  sandwich: 'Sandwichs',
  pie: 'Tartes',
}

function titleizeSlug(input: string): string {
  return input
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function normalizeFamilyOptions(values: string[], labels: Record<string, string>): PickerFamilyOption[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))]
    .sort((a, b) => {
      const labelA = labels[a] ?? titleizeSlug(a)
      const labelB = labels[b] ?? titleizeSlug(b)
      return labelA.localeCompare(labelB, 'fr-FR')
    })
    .map((value) => ({
      value,
      label: labels[value] ?? titleizeSlug(value),
    }))
}

export function getDefaultBuildTaxonomy(): BuildTaxonomyResponse {
  return {
    slots: {
      weapon: {
        category: { value: 'weapon', label: 'Familles d’armes' },
        families: normalizeFamilyOptions(Object.keys(WEAPON_FAMILY_LABELS), WEAPON_FAMILY_LABELS),
      },
      offhand: {
        category: { value: 'offhand', label: 'Secondaires' },
        families: normalizeFamilyOptions(Object.keys(OFFHAND_FAMILY_LABELS), OFFHAND_FAMILY_LABELS),
      },
      helmet: {
        category: { value: 'armor', label: 'Matière' },
        families: normalizeFamilyOptions(Object.keys(ARMOR_FAMILY_LABELS), ARMOR_FAMILY_LABELS),
      },
      armor: {
        category: { value: 'armor', label: 'Matière' },
        families: normalizeFamilyOptions(Object.keys(ARMOR_FAMILY_LABELS), ARMOR_FAMILY_LABELS),
      },
      shoes: {
        category: { value: 'armor', label: 'Matière' },
        families: normalizeFamilyOptions(Object.keys(ARMOR_FAMILY_LABELS), ARMOR_FAMILY_LABELS),
      },
      cape: {
        category: null,
        families: [],
      },
      bag: {
        category: null,
        families: [],
      },
      food: {
        category: { value: 'food', label: 'Type de nourriture' },
        families: normalizeFamilyOptions(['food', 'omelette', 'stew', 'soup', 'sandwich', 'pie'], CONSUMABLE_FAMILY_LABELS),
      },
      potion: {
        category: { value: 'potion', label: 'Type de potion' },
        families: normalizeFamilyOptions(['potions'], CONSUMABLE_FAMILY_LABELS),
      },
      mount: {
        category: { value: 'mount', label: 'Familles de montures' },
        families: normalizeFamilyOptions(Object.keys(MOUNT_FAMILY_LABELS), MOUNT_FAMILY_LABELS),
      },
    },
  }
}

export function normalizeWeaponTag(value?: string | null): string | null {
  if (!value) return null
  return value.trim().toLowerCase()
}

export function labelWeaponSubcategory(value?: string | null): string | null {
  if (!value) return null
  return WEAPON_FAMILY_LABELS[value] ?? titleizeSlug(value)
}

export function labelWeaponCategory(value?: string | null): string | null {
  if (!value) return null
  const labels: Record<string, string> = {
    melee: 'Mêlée',
    ranged: 'Distance',
    magic: 'Magie',
    support: 'Support',
  }
  return labels[value] ?? titleizeSlug(value)
}
