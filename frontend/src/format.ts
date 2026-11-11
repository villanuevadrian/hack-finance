const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const pctPlain = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export const formatEur = (x: number) => eur.format(x)
export const formatPct = (x: number) => pct.format(x)
export const formatPctPlain = (x: number) => pctPlain.format(x)
export const formatNum = (x: number) => num.format(x)

/** Drawdown from the running peak: 1 - W_t / max_{s<=t} W_s. */
export function drawdown(path: number[]): number {
  if (path.length === 0) return 0
  const peak = Math.max(...path)
  return peak > 0 ? 1 - path[path.length - 1] / peak : 0
}
