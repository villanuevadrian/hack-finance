import { lazy, Suspense, useState } from 'react'
import type { Counterfactuals, GameMeta } from '../api/client'
import { ListenBar } from '../components/ListenBar'
import { confidenceOf, type Confidence } from '../confidence'
import { Revelation } from '../components/Revelation'
import type { CandidateMetrics, Catalog, PortfolioProposal, Posterior, Profile } from '../api/types'
import type { InvestorSheet } from '../character'
import { IntervalBar } from '../components/IntervalBar'
import { ENTITY_NAME, QUESTIONNAIRE_VERSION, REVIEW_MONTHS } from '../config'
import { formatEur, formatPctPlain } from '../format'
import { usePrefersReducedMotion } from '../hooks'
import { LEVEL_LABEL, LIMIT_TEXT, PARAM_UI, STATED_REACTION, domainOf } from '../params'
import { answerText, BLOCKS, consistencyFlags, questionOf, type Draft } from '../questionnaire'
import type { World } from '../worlds'
import { Mentor } from '../components/Mentor'
import { N } from '../voice/lines'

const AvatarPreview = lazy(() => import('../components/Avatar3D').then((m) => ({ default: m.AvatarPreview })))

export interface Results {
  /** null when the backend has no counterfactuals endpoint yet: the section is hidden. */
  counterfactuals: Counterfactuals | null
  /** Per-game settings (accessible mode, human review); null on servers without them. */
  meta: GameMeta | null
  profile: Profile
  proposal: PortfolioProposal
  posterior: Posterior | null
  catalog: Catalog | null
}

interface Props {
  sheet: InvestorSheet
  world: World
  results: Results
  gameId: string
  meta: GameMeta | null
  busy: boolean
  onPanel: () => void
  onRestart: () => void
  onReplay: () => void
  onReview: () => void
}

/** Final money of each scenario = amount x final multiple (both from the backend simulation). */
const outcome = (c: CandidateMetrics, amount: number) => ({ p10: amount * c.final_multiple_p10, p50: amount * c.final_multiple_p50, p90: amount * c.final_multiple_p90 })
const limitingText = (limiting: string[]) => limiting.map((l) => LIMIT_TEXT[l] ?? l).join(' y ')

export function ResultsScreen({ sheet, world, results, gameId, meta, busy, onPanel, onRestart, onReplay, onReview }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [showReport, setShowReport] = useState(false)
  const { profile, proposal, posterior } = results
  const chosen = proposal.candidates.find((c) => c.portfolio_id === proposal.portfolio_id)!
  const o = outcome(chosen, proposal.amount_eur)
  const alias = sheet.avatar.alias.trim()
  const conf = confidenceOf(profile, 15)
  const planText = [
    `${conf.inconclusive ? 'Propuesta prudente' : 'Propuesta'} de ${ENTITY_NAME}: empezar con la ${proposal.portfolio_name}, nivel de riesgo ${proposal.risk_level} de 5.`,
    `Tu nivel máximo es ${proposal.levels.final}, limitado por ${limitingText(proposal.levels.limiting)}.`,
    proposal.justification,
    `Con ${formatEur(proposal.amount_eur)} durante ${proposal.horizon_years} años, el escenario malo deja ${formatEur(o.p10)}, el central ${formatEur(o.p50)} y el bueno ${formatEur(o.p90)}.`,
    conf.inconclusive ? `Es una propuesta prudente porque tu perfil es poco concluyente. ${conf.reasons.join(' ')}` : '',
  ].join(' ')

  return (
    <main className="results">
      {conf.inconclusive ? (
        <Mentor screen="plan" gameId={gameId} text={N.mentor.results_low} voiceKey="mentor_results_low" />
      ) : (
        <Mentor screen="plan" gameId={gameId} text={N.mentor.results} voiceKey="mentor_results" />
      )}
      <div className="profile-head no-print">
        <div className="panel profile-portrait">
          <Suspense fallback={<div className="avatar-preview" />}>
            <AvatarPreview avatar={sheet.avatar} reducedMotion={reducedMotion} />
          </Suspense>
        </div>
        <div className="title-block">
          <p className="kicker">{world.name} completado</p>
          <h1>{alias ? `El plan de ${alias}` : 'Tu plan'}</h1>
        </div>
      </div>

      <div className="no-print results-body">
        <section className="panel plan">
          <p className="plan-tag">{conf.inconclusive ? `Propuesta prudente de ${ENTITY_NAME}: perfil poco concluyente` : `Propuesta de ${ENTITY_NAME}`}</p>
          <ListenBar text={planText} label="Escuchar tu plan" />
          <h2>Te proponemos empezar con la <span className="gold">{proposal.portfolio_name}</span></h2>
          <p className="plan-risk">Nivel de riesgo {proposal.risk_level} de 5. Tu nivel máximo es {proposal.levels.final}, limitado por {limitingText(proposal.levels.limiting)}.</p>
          <p>{proposal.justification}</p>
          <div className="simulator">
            <h3>Con {formatEur(proposal.amount_eur)} durante {proposal.horizon_years} {proposal.horizon_years === 1 ? 'año' : 'años'}</h3>
            <dl className="fan-stats">
              <div><dt>Escenario malo (1 de cada 10)</dt><dd className={o.p10 < proposal.amount_eur ? 'neg' : undefined}>{formatEur(o.p10)}</dd></div>
              <div><dt>Escenario central</dt><dd>{formatEur(o.p50)}</dd></div>
              <div><dt>Escenario bueno (1 de cada 10)</dt><dd>{formatEur(o.p90)}</dd></div>
              <div><dt>Probabilidad de vender en pánico</dt><dd>{formatPctPlain(chosen.p_panic)}</dd></div>
            </dl>
            <p className="muted small">Simulación de {proposal.n_paths.toLocaleString('es-ES')} escenarios con tu forma de reaccionar. No es una previsión ni una garantía: puedes perder dinero.</p>
          </div>
          <p className="notice">{proposal.disclaimer}</p>
        </section>

        <ConfidenceCard conf={conf} meta={meta} busy={busy} onReplay={onReplay} />
        {results.counterfactuals ? (
          <Revelation data={results.counterfactuals} />
        ) : (
          <section className="panel revelation revelation-off">
            <p className="plan-tag">La revelación</p>
            <h2>Tu mercado, otras decisiones</h2>
            <p className="muted">Aquí verás qué habría pasado con el mismo mercado si hubieras decidido de otra forma. Necesita la última actualización del servidor (<code>nucleo-backend.patch</code>); en cuanto esté aplicada, aparecerá sola.</p>
          </section>
        )}
        <Levels profile={profile} />
        <PortfolioMap proposal={proposal} />
        <Observed profile={profile} posterior={posterior} />

        <section className="panel review-card">
          <h2>¿Quieres que una persona revise tu resultado?</h2>
          <p className="muted">Tienes derecho a que una persona de la entidad revise un resultado elaborado de forma automática (RGPD, art. 22).</p>
          {meta?.review_requested_at ? (
            <p className="review-ok" role="status">✓ Solicitud registrada el {new Date(meta.review_requested_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}. La entidad la verá en su portal.</p>
          ) : (
            <button className="ghost" onClick={onReview} disabled={busy || !meta}>Pedir revisión humana</button>
          )}
          {!meta && <p className="muted small">Disponible cuando el servidor tenga la última actualización.</p>}
        </section>

        <div className="creation-nav">
          <button className="start" onClick={() => setShowReport((v) => !v)}>{showReport ? 'Ocultar el informe' : 'Ver el informe de idoneidad'}</button>
          <button className="ghost" onClick={onPanel}>Ver el panel del banco</button>
          <button className="ghost" onClick={onRestart}>Jugar otra partida</button>
        </div>
      </div>

      {showReport && <Report sheet={sheet} world={world} results={results} />}
    </main>
  )
}

function ConfidenceCard({ conf, meta, busy, onReplay }: { conf: Confidence; meta: GameMeta | null; busy: boolean; onReplay: () => void }) {
  const text = [`Confianza de tu perfil: ${conf.title}.`, ...conf.reasons, conf.missing.length ? `Para una propuesta más precisa: ${conf.missing.join(' ')}` : ''].join(' ')
  return (
    <section className="panel confidence" data-level={conf.level} aria-labelledby="conf-h">
      <div className="conf-head">
        <h2 id="conf-h">Confianza de tu perfil</h2>
        <ListenBar text={text} label="Escuchar la confianza" compact />
      </div>
      <p className="conf-level"><span className="conf-dot" aria-hidden="true" /> {conf.title}</p>
      {conf.reasons.length > 0 && (
        <>
          <h3>Por qué</h3>
          <ul>{conf.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </>
      )}
      {conf.inconclusive && (
        <p>Por eso la propuesta es <strong>prudente</strong>: con poca información, se elige la opción que menos probabilidades tiene de que la abandones en una caída. No es una conclusión definitiva sobre ti.</p>
      )}
      {conf.missing.length > 0 && (
        <>
          <h3>Qué haría falta para afinarla</h3>
          <ul>{conf.missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </>
      )}
      {conf.level !== 'alta' && (
        <div className="conf-cta">
          <button className="start" onClick={onReplay} disabled={busy}>Jugar otra partida para completar mi perfil</button>
          <p className="muted small">Mantienes tu ficha; juegas un mercado nuevo. Las dos partidas quedan registradas y la entidad las ve.{meta?.accessible ? ' Seguirás con el doble de tiempo.' : ''}</p>
        </div>
      )}
    </section>
  )
}

export function Levels({ profile }: { profile: Profile }) {
  const l = profile.levels
  const rows: [string, number][] = [['revealed', l.revealed], ['capacity', l.capacity], ['horizon', l.horizon]]
  return (
    <section className="panel levels-card">
      <h2>Tus tres niveles</h2>
      <p className="muted">Tu nivel final es el más bajo de los tres. Lo que declaras nunca sube el riesgo.</p>
      {rows.map(([k, v]) => (
        <div key={k} className="level-row" data-limiting={l.limiting.includes(k)}>
          <span className="level-row-name">{LEVEL_LABEL[k]}</span>
          <span className="pips" role="img" aria-label={`${LEVEL_LABEL[k]}: nivel ${v} de 5`}>
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="pip" data-on={i <= v} />)}
          </span>
          <span className="level-row-v">{v}{l.limiting.includes(k) && <em> limita</em>}</span>
        </div>
      ))}
      <p className="level-final">Nivel final: <strong>{l.final} de 5</strong></p>
    </section>
  )
}

function PortfolioMap({ proposal }: { proposal: PortfolioProposal }) {
  // Same scale for every card, so the ranges can be compared at a glance.
  const top = Math.max(...proposal.candidates.map((c) => outcome(c, proposal.amount_eur).p90))
  const pos = (v: number) => `${(v / top) * 100}%`
  return (
    <section className="map">
      <h2>Tu mapa de carteras</h2>
      <p className="muted small">
        Cada barra muestra qué podría pasar con {formatEur(proposal.amount_eur)} en {proposal.horizon_years} {proposal.horizon_years === 1 ? 'año' : 'años'},
        en {proposal.n_paths.toLocaleString('es-ES')} escenarios simulados con tu forma de reaccionar: del escenario malo al bueno, con el central marcado.
      </p>
      <div className="cards">
        {proposal.candidates.map((c) => {
          const chosen = c.portfolio_id === proposal.portfolio_id
          const panicTooHigh = c.eligible && c.p_panic > proposal.max_panic_prob
          const state = chosen ? 'recommended' : !c.eligible ? 'locked' : panicTooHigh ? 'warn' : 'open'
          const o = outcome(c, proposal.amount_eur)
          return (
            <article key={c.portfolio_id} className="pcard" data-state={state}>
              <p className="pcard-risk">Nivel {c.risk_level}</p>
              <h3>{c.name}</h3>
              <p className="muted small">Venta en pánico: {formatPctPlain(c.p_panic)}</p>
              <div className="scen" role="img" aria-label={`Escenario malo ${formatEur(o.p10)}, central ${formatEur(o.p50)}, bueno ${formatEur(o.p90)}`}>
                <span className="scen-put" style={{ left: pos(proposal.amount_eur) }} title="Lo que inviertes" />
                <span className="scen-band" style={{ left: pos(o.p10), width: `calc(${pos(o.p90)} - ${pos(o.p10)})` }} />
                <span className="scen-mid" style={{ left: pos(o.p50) }} />
              </div>
              <p className="scen-vals small">
                <span className={o.p10 < proposal.amount_eur ? 'neg' : undefined}>{formatEur(o.p10)}</span>
                <span>{formatEur(o.p50)}</span>
                <span>{formatEur(o.p90)}</span>
              </p>
              <p className="pcard-status">
                {chosen ? 'Propuesta para ti' : !c.eligible ? 'Por encima de tu horizonte o capacidad' : panicTooHigh ? 'Probablemente no la mantendrías' : 'Idónea para ti'}
              </p>
            </article>
          )
        })}
      </div>
      <p className="muted small">Línea dorada: lo que inviertes. Las cifras son de una simulación: no son una previsión ni una garantía.</p>
    </section>
  )
}

function Observed({ profile, posterior }: { profile: Profile; posterior: Posterior | null }) {
  return (
    <section className="observed">
      <h2>Lo que hemos aprendido de ti</h2>
      <div className="sheet">
        <section className="panel sheet-block">
          <h3>En la partida</h3>
          {profile.parameters.map((p) => {
            const ui = PARAM_UI[p.name] ?? { name: p.name, format: (x: number) => x.toFixed(2) }
            return (
              <div key={p.name} className="obs-param">
                <p><strong>{ui.name}:</strong> entre {ui.format(p.ci_low)} y {ui.format(p.ci_high)}</p>
                <IntervalBar mean={p.mean} low={p.ci_low} high={p.ci_high} domain={domainOf(posterior, p.name)} format={ui.format} label={ui.name} />
              </div>
            )
          })}
          <p className="small muted">Fiabilidad: {profile.reliability}. Decisiones sin responder a tiempo: {profile.timeouts}.</p>
        </section>
        <section className="panel sheet-block">
          <h3>Lo que dijiste y lo que hiciste</h3>
          <p>Antes de jugar dijiste: <strong>{STATED_REACTION[profile.stated_reaction] ?? profile.stated_reaction}</strong> si tu inversión cayera un 20 %.</p>
          <p>Tu montaña rusa elegida equivale al nivel <strong>{profile.stated_level}</strong>; en la partida mostraste el nivel <strong>{profile.levels.revealed}</strong>.</p>
          <p className="muted">
            {profile.stated_level > profile.levels.revealed
              ? 'Crees que aguantas más riesgo del que mostraste. Es muy habitual, y por eso usamos lo que haces, no lo que dices.'
              : profile.stated_level < profile.levels.revealed
                ? 'Aguantaste más de lo que pensabas. Aun así, tu nivel final no sube por encima de tu situación y tu horizonte.'
                : 'Lo que dijiste y lo que hiciste coinciden.'}
          </p>
          <p className="small">Nivel de conocimiento: <strong>{profile.knowledge_level}</strong>.</p>
        </section>
      </div>
    </section>
  )
}

/** Suitability report (CUESTIONARIO.md §8). Printable: only this section is printed. */
function Report({ sheet, world, results }: { sheet: InvestorSheet; world: World; results: Results }) {
  const { profile, proposal } = results
  const draft = sheet.answers as unknown as Draft
  const flags = consistencyFlags(draft)
  const date = new Date(sheet.confirmedAt)
  const review = new Date(date)
  review.setMonth(review.getMonth() + REVIEW_MONTHS)
  return (
    <section className="report" aria-label="Informe de idoneidad">
      <header>
        <p className="report-entity">{ENTITY_NAME}</p>
        <h2>Informe de idoneidad</h2>
        <p className="muted small">
          Fecha: {date.toLocaleDateString('es-ES')}. Versión del cuestionario: {QUESTIONNAIRE_VERSION}. Datos confirmados por el cliente.
          Revisión recomendada del perfil: {review.toLocaleDateString('es-ES')}.
        </p>
      </header>

      <h3>1. Información facilitada por el cliente</h3>
      {BLOCKS.map((b) => (
        <div key={b.key} className="report-block">
          <h4>{b.title}</h4>
          <table><tbody>
            {b.fields.map((f) => <tr key={f}><th scope="row">{questionOf(f).code}. {questionOf(f).label}</th><td>{answerText(f, draft[f])}</td></tr>)}
          </tbody></table>
        </div>
      ))}
      {flags.length > 0 && (
        <div className="report-block">
          <h4>Respuestas atípicas revisadas</h4>
          <ul>{flags.map((f) => <li key={f.id}>{f.message} Confirmado por el cliente: {sheet.confirmedFlags.includes(f.id) ? 'sí' : 'no'}.</li>)}</ul>
        </div>
      )}
      <p>Nivel de conocimiento: <strong>{profile.knowledge_level}</strong>.</p>

      <h3>2. Niveles de idoneidad</h3>
      <table><tbody>
        <tr><th scope="row">{LEVEL_LABEL.revealed}</th><td>{profile.levels.revealed} de 5</td></tr>
        <tr><th scope="row">{LEVEL_LABEL.capacity}</th><td>{profile.levels.capacity} de 5</td></tr>
        <tr><th scope="row">{LEVEL_LABEL.horizon}</th><td>{profile.levels.horizon} de 5</td></tr>
        <tr><th scope="row">Nivel final (el mínimo de los tres)</th><td><strong>{profile.levels.final} de 5</strong></td></tr>
      </tbody></table>
      <p>El resultado está limitado por {limitingText(profile.levels.limiting)}.</p>

      <h3>3. Tolerancia revelada frente a declarada</h3>
      <p className="small">Mundo de la partida: {world.name}. Fiabilidad: {profile.reliability}.</p>
      <table><tbody>
        {profile.parameters.map((p) => {
          const ui = PARAM_UI[p.name] ?? { name: p.name, format: (x: number) => x.toFixed(2) }
          return <tr key={p.name}><th scope="row">{ui.name}</th><td>Entre {ui.format(p.ci_low)} y {ui.format(p.ci_high)} (intervalo del 90 %), centro {ui.format(p.mean)}</td></tr>
        })}
        <tr><th scope="row">Reacción declarada ante una caída del 20 %</th><td>{STATED_REACTION[profile.stated_reaction] ?? profile.stated_reaction}</td></tr>
        <tr><th scope="row">Nivel declarado (O3) y nivel revelado</th><td>{profile.stated_level} y {profile.levels.revealed}</td></tr>
      </tbody></table>

      <h3>4. Cartera propuesta</h3>
      <p><strong>{proposal.portfolio_name}</strong>, nivel de riesgo {proposal.risk_level} de 5.</p>
      <p>{proposal.justification}</p>
      <p className="small">Criterio: mayor percentil 10 de riqueza final con una probabilidad de venta en pánico de como máximo {formatPctPlain(proposal.max_panic_prob)}. Simulación: {proposal.n_paths.toLocaleString('es-ES')} escenarios, {proposal.horizon_years} años, semilla {proposal.seed}.</p>
      <p className="small muted">{proposal.disclaimer}</p>
      <button className="ghost no-print" onClick={() => window.print()}>Descargar en PDF</button>
    </section>
  )
}
