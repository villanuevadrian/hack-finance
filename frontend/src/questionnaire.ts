/**
 * The suitability questionnaire of docs/CUESTIONARIO.md (owner: Producto), with the exact values of the
 * OnboardingAnswers contract. This file only decides how the questions are SHOWN; options, required fields
 * and scoring belong to the backend (backend/behaviorlab/game/onboarding.py).
 *
 * Rules from CUESTIONARIO.md §2 bis: every answer is closed; "Prefiero no responder" in the financial
 * situation (sent as null) and "No lo sé" in the knowledge checks; no answer gives points or a better look;
 * a final "Tu ficha" screen shows everything in plain words before playing.
 */
import type { OnboardingAnswers } from './api/types'

export type FieldId = Exclude<keyof OnboardingAnswers, 'consent'>
/** Draft while the player answers: undefined = not answered yet, null = "Prefiero no responder". */
export type Draft = Partial<Record<FieldId, string | string[] | number | null>>

export interface Choice {
  value: string
  label: string
}

interface Base {
  id: FieldId
  code: string // K1, S3... as in CUESTIONARIO.md
  label: string
  help?: string
}
export interface SingleQ extends Base {
  kind: 'single'
  options: Choice[]
  /** When present, the question can be skipped with this label and is sent as null. */
  skipLabel?: string
}
export interface MultiQ extends Base {
  kind: 'multi'
  options: Choice[]
  noneLabel: string
}
export interface QuizQ extends Base {
  kind: 'quiz'
  options: Choice[]
  correct: string
  explanation: string
}
export interface AmountQ extends Base {
  kind: 'amount'
  amounts: number[]
  skipLabel: string
}
export interface ReturnQ extends Base {
  kind: 'return'
  options: { value: string; bad: number; good: number }[]
}
export type Question = SingleQ | MultiQ | QuizQ | AmountQ | ReturnQ

export type BlockKey = 'who' | 'inventory' | 'quiz' | 'base' | 'mission'

const PRODUCTS: Choice[] = [
  { value: 'deposits', label: 'Depósitos' },
  { value: 'money_market_bond_funds', label: 'Fondos monetarios o de renta fija' },
  { value: 'index_funds_etf', label: 'Fondos indexados o ETF' },
  { value: 'stocks', label: 'Acciones' },
  { value: 'robo_advisor', label: 'Carteras automatizadas' },
  { value: 'derivatives_crypto', label: 'Derivados o criptoactivos' },
]
const NO_ANSWER = 'Prefiero no responder'
const DONT_KNOW = { value: 'dont_know', label: 'No lo sé' }

export const QUESTIONS: Question[] = [
  { id: 'education', code: 'K1', kind: 'single', label: '¿Qué estudios has terminado?', options: [
    { value: 'compulsory', label: 'Educación obligatoria' },
    { value: 'secondary', label: 'Bachillerato o FP' },
    { value: 'university', label: 'Universitarios' },
    { value: 'finance_degree', label: 'Universitarios o posgrado en economía, finanzas o similar' },
  ] },
  { id: 'occupation', code: 'K2', kind: 'single', label: '¿A qué te dedicas?', options: [
    { value: 'student', label: 'Estudio' },
    { value: 'employee', label: 'Trabajo por cuenta ajena' },
    { value: 'self_employed', label: 'Soy autónomo o autónoma' },
    { value: 'finance_professional', label: 'Mi profesión está relacionada con las finanzas' },
    { value: 'unemployed', label: 'Ahora no tengo actividad' },
    { value: 'retired', label: 'Estoy jubilado o jubilada' },
  ] },
  { id: 'known_products', code: 'K3', kind: 'multi', label: '¿Qué productos sabrías explicar a otra persona?', help: 'Marca los que entiendes bien: cómo funcionan y qué riesgos tienen. Puedes elegir varios.', options: PRODUCTS, noneLabel: 'Ninguno' },
  { id: 'invested_products', code: 'K4', kind: 'multi', label: '¿En cuáles has invertido en los últimos 3 años?', help: 'Puedes elegir varios.', options: PRODUCTS, noneLabel: 'Ninguno' },
  { id: 'trading_frequency', code: 'K5', kind: 'single', label: '¿Con qué frecuencia inviertes o mueves tus inversiones?', options: [
    { value: 'never', label: 'Nunca' },
    { value: 'yearly', label: '1 o 2 veces al año' },
    { value: 'several_per_year', label: 'Varias veces al año' },
    { value: 'monthly', label: 'Cada mes o más' },
  ] },
  { id: 'invested_volume', code: 'K6', kind: 'single', label: 'En total, ¿cuánto dinero has invertido en esos 3 años, más o menos?', options: [
    { value: 'none', label: 'Nada' },
    { value: 'lt_3k', label: 'Menos de 3.000 €' },
    { value: '3k_15k', label: 'Entre 3.000 y 15.000 €' },
    { value: 'gt_15k', label: 'Más de 15.000 €' },
  ] },
  { id: 'quiz_risk', code: 'Q1', kind: 'quiz', label: '¿Qué es más arriesgado?', correct: 'single_stock',
    explanation: 'Una sola empresa puede caer mucho o desaparecer; un fondo con mil empresas reparte ese riesgo.',
    options: [
      { value: 'diversified_fund', label: 'Un fondo con 1.000 empresas de todo el mundo' },
      { value: 'single_stock', label: 'La acción de una sola empresa' },
      { value: 'same', label: 'Lo mismo' },
      DONT_KNOW,
    ] },
  { id: 'quiz_recovery', code: 'Q2', kind: 'quiz', label: 'Si tu inversión cae un 50 %, ¿cuánto tiene que subir para volver al punto de partida?', correct: 'p100',
    explanation: 'Si 100 € caen a 50 €, para volver a 100 € tienen que doblarse: subir un 100 %.',
    options: [
      { value: 'p25', label: 'Un 25 %' },
      { value: 'p50', label: 'Un 50 %' },
      { value: 'p100', label: 'Un 100 %' },
      DONT_KNOW,
    ] },
  { id: 'quiz_guarantee', code: 'Q3', kind: 'quiz', label: 'Un fondo indexado de bolsa garantiza no perder dinero en un año.', correct: 'false',
    explanation: 'Falso: sube y baja con la bolsa y en un año malo puede perder dinero.',
    options: [
      { value: 'true', label: 'Verdadero' },
      { value: 'false', label: 'Falso' },
      DONT_KNOW,
    ] },
  { id: 'income', code: 'S1', kind: 'single', label: '¿Cuánto ingresas al mes, neto?', skipLabel: NO_ANSWER, options: [
    { value: 'lt_1000', label: 'Menos de 1.000 €' },
    { value: '1000_1800', label: 'De 1.000 a 1.800 €' },
    { value: '1800_2500', label: 'De 1.800 a 2.500 €' },
    { value: '2500_4000', label: 'De 2.500 a 4.000 €' },
    { value: 'gt_4000', label: 'Más de 4.000 €' },
  ] },
  { id: 'income_source', code: 'S2', kind: 'single', label: '¿De dónde vienen tus ingresos?', skipLabel: NO_ANSWER, options: [
    { value: 'permanent', label: 'Nómina indefinida' },
    { value: 'temporary', label: 'Nómina temporal' },
    { value: 'self_employed', label: 'Trabajo por cuenta propia' },
    { value: 'grant_or_family', label: 'Beca o ayuda familiar' },
    { value: 'pension', label: 'Pensión' },
    { value: 'none', label: 'No tengo ingresos regulares' },
  ] },
  { id: 'fixed_commitments', code: 'S5', kind: 'single', label: '¿Qué parte de tus ingresos se va en pagos fijos (alquiler, hipoteca, préstamos)?', skipLabel: NO_ANSWER, options: [
    { value: 'lt_20', label: 'Menos del 20 %' },
    { value: '20_35', label: 'Del 20 al 35 %' },
    { value: '35_50', label: 'Del 35 al 50 %' },
    { value: 'gt_50', label: 'Más del 50 %' },
  ] },
  { id: 'monthly_saving', code: 'S3', kind: 'single', label: '¿Cuánto ahorras al mes, más o menos?', skipLabel: NO_ANSWER, options: [
    { value: 'zero', label: '0 €' },
    { value: 'lt_100', label: 'Menos de 100 €' },
    { value: '100_300', label: 'De 100 a 300 €' },
    { value: '300_600', label: 'De 300 a 600 €' },
    { value: 'gt_600', label: 'Más de 600 €' },
  ] },
  { id: 'financial_wealth', code: 'S4', kind: 'single', label: '¿Cuánto tienes en cuentas, fondos y acciones?', skipLabel: NO_ANSWER, options: [
    { value: 'lt_5k', label: 'Menos de 5.000 €' },
    { value: '5k_20k', label: 'De 5.000 a 20.000 €' },
    { value: '20k_50k', label: 'De 20.000 a 50.000 €' },
    { value: '50k_150k', label: 'De 50.000 a 150.000 €' },
    { value: 'gt_150k', label: 'Más de 150.000 €' },
  ] },
  { id: 'emergency_months', code: 'S6', kind: 'single', label: 'Si dejaras de ingresar, ¿cuántos meses podrías cubrir tus gastos sin tocar esta inversión?', skipLabel: NO_ANSWER, options: [
    { value: 'lt_1', label: 'Menos de 1 mes' },
    { value: '1_3', label: 'De 1 a 3 meses' },
    { value: '3_6', label: 'De 3 a 6 meses' },
    { value: 'gt_6', label: 'Más de 6 meses' },
  ] },
  { id: 'share_invested', code: 'S7', kind: 'single', label: 'De todos tus ahorros, ¿qué parte vas a invertir aquí?', skipLabel: NO_ANSWER, options: [
    { value: 'lt_25', label: 'Menos de una cuarta parte' },
    { value: '25_50', label: 'Entre una cuarta parte y la mitad' },
    { value: '50_75', label: 'Entre la mitad y tres cuartas partes' },
    { value: 'gt_75', label: 'Más de tres cuartas partes' },
  ] },
  { id: 'amount_eur', code: 'S8', kind: 'amount', label: '¿Cuánto quieres invertir?', help: 'Será el dinero con el que juegues la partida.', amounts: [500, 1000, 3000, 5000, 10000, 20000], skipLabel: NO_ANSWER },
  { id: 'goal', code: 'O1', kind: 'single', label: '¿Para qué es este dinero?', options: [
    { value: 'emergency_fund', label: 'Un colchón para imprevistos' },
    { value: 'purchase', label: 'Comprar algo en unos años: casa, coche, estudios' },
    { value: 'long_term_growth', label: 'Hacer crecer mis ahorros a largo plazo' },
    { value: 'retirement', label: 'Mi jubilación' },
  ] },
  { id: 'horizon', code: 'O2', kind: 'single', label: '¿Cuándo crees que vas a necesitar este dinero?', options: [
    { value: 'lt_2', label: 'En menos de 2 años' },
    { value: '2_3', label: 'De 2 a 3 años' },
    { value: '3_4', label: 'De 3 a 4 años' },
    { value: '4_6', label: 'De 4 a 6 años' },
    { value: '6_7', label: 'De 6 a 7 años' },
    { value: 'gt_7', label: 'Dentro de más de 7 años' },
  ] },
  { id: 'return_preference', code: 'O3', kind: 'return', label: '¿Con qué montaña rusa estarías cómodo?', help: 'Cada vagoneta une un año malo y un año bueno: no se puede tener uno sin el otro. Las cantidades se calculan sobre lo que vas a invertir.', options: [
    { value: 'minus2_plus2', bad: -0.02, good: 0.02 },
    { value: 'minus8_plus4', bad: -0.08, good: 0.04 },
    { value: 'minus15_plus6', bad: -0.15, good: 0.06 },
    { value: 'minus25_plus8', bad: -0.25, good: 0.08 },
    { value: 'minus35_plus10', bad: -0.35, good: 0.1 },
  ] },
  { id: 'stated_reaction', code: 'O4', kind: 'single', label: 'Antes de empezar: si tu inversión cayera un 20 %, ¿qué crees que harías?', help: 'Lo guardamos para compararlo con lo que hagas en la partida.', options: [
    { value: 'sell_all', label: 'Vendería todo' },
    { value: 'sell_part', label: 'Vendería una parte' },
    { value: 'wait', label: 'Esperaría' },
    { value: 'buy_more', label: 'Invertiría más' },
  ] },
]

export const BLOCKS: { key: BlockKey; title: string; intro: string; fields: FieldId[] }[] = [
  { key: 'who', title: 'Quién eres', intro: 'Tu yo inversor eres tú ahora mismo, no el que te gustaría ser.', fields: ['education', 'occupation'] },
  { key: 'inventory', title: 'Tu inventario', intro: 'Los productos que ya conoces y los que has usado.', fields: ['known_products', 'invested_products', 'trading_frequency', 'invested_volume'] },
  { key: 'quiz', title: 'Retos rápidos', intro: 'Tres preguntas cortas. Si no sabes la respuesta, elige "No lo sé": es mejor que adivinar.', fields: ['quiz_risk', 'quiz_recovery', 'quiz_guarantee'] },
  { key: 'base', title: 'Tu base', intro: 'Tus recursos de hoy. Ninguna respuesta es mejor que otra.', fields: ['income', 'income_source', 'fixed_commitments', 'monthly_saving', 'financial_wealth', 'emergency_months', 'share_invested', 'amount_eur'] },
  { key: 'mission', title: 'Tu misión', intro: 'A dónde quieres llegar. Tu misión decide tu mundo.', fields: ['goal', 'horizon', 'return_preference', 'stated_reaction'] },
]

/** Fields without which the backend cannot issue a profile (onboarding.REQUIRED_FINANCIAL_FIELDS). */
export const REQUIRED_FINANCIAL: FieldId[] = ['income', 'income_source', 'fixed_commitments', 'emergency_months', 'share_invested']

export const questionOf = (id: FieldId): Question => QUESTIONS.find((q) => q.id === id)!

/** Answered: anything but undefined ("Prefiero no responder" is an answer, stored as null). */
export const isAnswered = (d: Draft, id: FieldId) => d[id] !== undefined
export const blockComplete = (d: Draft, key: BlockKey) => BLOCKS.find((b) => b.key === key)!.fields.every((f) => isAnswered(d, f))
export const missingRequired = (d: Draft): FieldId[] => REQUIRED_FINANCIAL.filter((f) => d[f] === null || d[f] === undefined)

/** Amount the game uses for amounts in euros: S8 if given, else the backend default (CALIBRACION.md §7). */
export const DEFAULT_AMOUNT_EUR = 10_000
export const amountOf = (d: Draft) => (typeof d.amount_eur === 'number' ? d.amount_eur : DEFAULT_AMOUNT_EUR)

export function toAnswers(d: Draft): OnboardingAnswers {
  return { consent: true, ...d } as OnboardingAnswers
}

/** Plain-language text of an answer for "Tu ficha" and the report. */
export function answerText(id: FieldId, value: Draft[FieldId]): string {
  const q = questionOf(id)
  if (value === null) return q.kind === 'amount' ? `${NO_ANSWER} (se usarán ${DEFAULT_AMOUNT_EUR.toLocaleString('es-ES')} €)` : NO_ANSWER
  if (value === undefined) return 'Sin responder'
  if (q.kind === 'multi') {
    const vs = value as string[]
    return vs.length === 0 ? q.noneLabel : vs.map((v) => q.options.find((o) => o.value === v)?.label ?? v).join(', ')
  }
  if (q.kind === 'amount') return `${(value as number).toLocaleString('es-ES')} €`
  if (q.kind === 'return') {
    const o = q.options.find((x) => x.value === value)
    return o ? `Año malo ${Math.round(o.bad * 100)} %, año bueno +${Math.round(o.good * 100)} %` : String(value)
  }
  return q.options.find((o) => o.value === value)?.label ?? String(value)
}

export interface Flag {
  id: string
  message: string
}

/**
 * Atypical combinations to review while collecting the answers (CNMV Guía Técnica 2/2022, annex examples).
 * The player confirms or corrects them. Next step: the contract has no field to record the confirmation;
 * today it only lives in the frontend and in the printed report.
 */
export function consistencyFlags(d: Draft): Flag[] {
  const flags: Flag[] = []
  const invested = (d.invested_products as string[] | undefined) ?? []
  if (invested.includes('derivatives_crypto') && !invested.some((p) => ['index_funds_etf', 'stocks', 'money_market_bond_funds', 'robo_advisor'].includes(p)))
    flags.push({ id: 'complex_without_basics', message: 'Indicas que has invertido en derivados o criptoactivos, pero no en fondos, acciones ni carteras. ¿Es correcto?' })
  if (d.occupation === 'finance_professional' && d.education === 'compulsory')
    flags.push({ id: 'profession_vs_studies', message: 'Indicas una profesión relacionada con las finanzas con estudios obligatorios. ¿Es correcto?' })
  if (invested.length > 0 && d.trading_frequency === 'never')
    flags.push({ id: 'invested_but_never', message: 'Indicas que has invertido en los últimos 3 años, pero que nunca inviertes. ¿Es correcto?' })
  return flags
}
