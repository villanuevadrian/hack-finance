/** Accessibility preferences chosen by the player, remembered in this browser. */
export interface Prefs {
  /** Double time per decision (recorded in the game, so the entity knows). */
  moreTime: boolean
  /** Read each month's situation aloud automatically during the game. */
  listen: boolean
  /** If Vega's voice is not available, read with the device's own voice (off by default). */
  deviceVoice: boolean
}

const KEY = 'behaviorlab.prefs'

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>
    return { moreTime: Boolean(p.moreTime), listen: Boolean(p.listen), deviceVoice: Boolean(p.deviceVoice) }
  } catch {
    return { moreTime: false, listen: false, deviceVoice: false }
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable */
  }
}
