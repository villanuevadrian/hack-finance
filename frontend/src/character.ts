import type { OnboardingAnswers } from './api/types'

/** Purely cosmetic: it never affects the questionnaire, the game or the result. The alias is not a real name. */
export type Accessory = 'none' | 'cap' | 'headphones' | 'backpack'

export interface Avatar {
  alias: string
  suit: string
  visor: string
  accessory: Accessory
  /** Equipment unlocked by COMPLETING blocks of the questionnaire, never by what was answered. */
  gear?: Gear[]
}

/**
 * One piece per block. Unlocking depends only on finishing the block, so every player gets the same pieces
 * whatever they answer: a reward for an answer ("universitario" gives armour) would push people to inflate
 * their profile, which is exactly what the CNMV guide asks to avoid.
 */
export type Gear = 'cape' | 'pauldrons' | 'shield' | 'boots' | 'banner'
export const GEAR_BY_BLOCK: Record<string, { gear: Gear; name: string }> = {
  who: { gear: 'cape', name: 'Capa de aventura' },
  inventory: { gear: 'pauldrons', name: 'Hombreras de exploración' },
  quiz: { gear: 'shield', name: 'Escudo del saber' },
  base: { gear: 'boots', name: 'Botas de campamento' },
  mission: { gear: 'banner', name: 'Estandarte de tu misión' },
}

export const SUITS = [
  { color: '#f4f1ff', label: 'Blanco' },
  { color: '#4cc3ff', label: 'Azul' },
  { color: '#ff8a3d', label: 'Naranja' },
  { color: '#3ddc97', label: 'Verde' },
  { color: '#c084fc', label: 'Violeta' },
]
export const VISORS = [
  { color: '#4cc3ff', label: 'Azul' },
  { color: '#ffc94a', label: 'Oro' },
  { color: '#3ddc97', label: 'Verde' },
  { color: '#ff6b9a', label: 'Rosa' },
]
export const ACCESSORIES: { key: Accessory; label: string }[] = [
  { key: 'none', label: 'Nada' },
  { key: 'cap', label: 'Gorra' },
  { key: 'headphones', label: 'Auriculares' },
  { key: 'backpack', label: 'Mochila' },
]
export const DEFAULT_AVATAR: Avatar = { alias: '', suit: SUITS[0].color, visor: VISORS[0].color, accessory: 'none', gear: [] }

/** What the player built in the onboarding: the avatar plus the contract answers, confirmed in "Tu ficha". */
export interface InvestorSheet {
  avatar: Avatar
  answers: OnboardingAnswers
  confirmedFlags: string[]
  confirmedAt: string
}
