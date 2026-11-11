import type { Profile } from './api/types'
import { formatPctPlain } from './format'

/**
 * How much the profile can be trusted, in plain words, built only from backend fields (reliability,
 * timeouts, the 90 % interval of theta and declared versus revealed). It explains WHY a proposal may be
 * prudent and WHAT would make it more precise, instead of presenting an inconclusive profile as final.
 */
export interface Confidence {
  level: 'alta' | 'media' | 'baja'
  title: string
  reasons: string[]
  missing: string[]
  inconclusive: boolean
}

export function confidenceOf(p: Profile, nRounds: number): Confidence {
  const level = (['alta', 'media', 'baja'].includes(p.reliability) ? p.reliability : 'media') as Confidence['level']
  const reasons: string[] = []
  const missing: string[] = []
  const theta = p.parameters.find((x) => x.name === 'theta')

  if (p.timeouts > 0) {
    reasons.push(`No respondiste a tiempo en ${p.timeouts} de ${nRounds} meses: esas rondas cuentan como no hacer nada y no dicen cómo reaccionas.`)
    missing.push('Decidir a tiempo todos los meses (si lo necesitas, activa la opción de más tiempo).')
  }
  if (theta && theta.ci_high - theta.ci_low >= 0.25) {
    reasons.push(`Aún no está claro a partir de qué caída venderías: entre el ${formatPctPlain(theta.ci_low)} y el ${formatPctPlain(theta.ci_high)}.`)
    missing.push('Más decisiones ante caídas del mercado, para acotar cómo reaccionas.')
  }
  if (Math.abs(p.stated_level - p.levels.revealed) >= 2) {
    reasons.push(`Lo que dijiste antes de jugar (nivel ${p.stated_level}) y lo que hiciste (nivel ${p.levels.revealed}) son muy distintos.`)
  }
  if (level === 'baja' && reasons.length === 0) reasons.push('La partida dio pocas señales claras de cómo reaccionas ante las caídas.')

  const title = level === 'alta' ? 'Alta: tu partida da una imagen clara de cómo reaccionas'
    : level === 'media' ? 'Media: la imagen es razonable, aunque con cierta incertidumbre'
      : 'Baja: todavía hay poca información sobre cómo reaccionas'
  return { level, title, reasons, missing, inconclusive: level === 'baja' }
}
