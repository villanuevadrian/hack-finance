import type { Posterior } from './api/types'
import { formatNum, formatPctPlain } from './format'

/** How each backend parameter is shown. Ranges come from the posterior grid, not from here. */
export const PARAM_UI: Record<string, { name: string; format: (x: number) => string }> = {
  lambda: { name: 'Aversión a la pérdida', format: formatNum },
  theta: { name: 'Caída de tu cartera a la que venderías', format: formatPctPlain },
  eta: { name: 'Parte de una subida de sueldo que inviertes', format: formatPctPlain },
}

export function domainOf(posterior: Posterior | null, name: string, fallback: [number, number] = [0, 1]): [number, number] {
  const g = posterior?.grid[name]
  return g && g.length > 1 ? [Math.min(...g), Math.max(...g)] : fallback
}

export const LIMIT_TEXT: Record<string, string> = {
  revealed: 'lo que mostraste en la partida',
  capacity: 'tu capacidad para asumir pérdidas',
  horizon: 'cuándo vas a necesitar el dinero',
}

export const LEVEL_LABEL: Record<string, string> = {
  revealed: 'Revelado en la partida',
  capacity: 'Capacidad para asumir pérdidas',
  horizon: 'Horizonte',
}

export const STATED_REACTION: Record<string, string> = {
  sell_all: 'Vendería todo',
  sell_part: 'Vendería una parte',
  wait: 'Esperaría',
  buy_more: 'Invertiría más',
}
