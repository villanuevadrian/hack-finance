import { lazy, Suspense, useState } from 'react'
import type { Goal } from '../api/types'
import { ACCESSORIES, DEFAULT_AVATAR, GEAR_BY_BLOCK, SUITS, VISORS, type Avatar, type InvestorSheet } from '../character'
import { formatEur } from '../format'
import { hasWebGL, usePrefersReducedMotion } from '../hooks'
import {
  amountOf, answerText, BLOCKS, blockComplete, consistencyFlags, missingRequired, questionOf, toAnswers,
  type AmountQ, type BlockKey, type Draft, type FieldId, type MultiQ, type Question, type QuizQ, type ReturnQ, type SingleQ,
} from '../questionnaire'
import { worldFor } from '../worlds'
import { Mentor } from '../components/Mentor'
import { N } from '../voice/lines'

const AvatarPreview = lazy(() => import('../components/Avatar3D').then((m) => ({ default: m.AvatarPreview })))

const STEPS = ['Tu aspecto', ...BLOCKS.map((b) => b.title), 'Tu ficha']
const SUMMARY = STEPS.length - 1

/** "Crea tu yo inversor" (D11, docs/CUESTIONARIO.md). The avatar is cosmetic; every other answer is real. */
export function Onboarding({ onDone }: { onDone: (s: InvestorSheet) => void }) {
  const reducedMotion = usePrefersReducedMotion()
  const [webgl] = useState(hasWebGL)
  const [step, setStep] = useState(0)
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR)
  const [draft, setDraft] = useState<Draft>({})
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [final, setFinal] = useState(false)

  const block = step >= 1 && step <= BLOCKS.length ? BLOCKS[step - 1] : null
  // Equipment of the blocks already completed: the same for everyone, whatever they answered.
  const gear = BLOCKS.filter((b) => blockComplete(draft, b.key)).map((b) => GEAR_BY_BLOCK[b.key].gear)
  const shownAvatar = { ...avatar, gear }
  const flags = consistencyFlags(draft)
  const allComplete = BLOCKS.every((b) => blockComplete(draft, b.key))
  const missing = missingRequired(draft)
  const canFinish = allComplete && missing.length === 0 && flags.every((f) => confirmed.includes(f.id)) && final
  const world = typeof draft.goal === 'string' ? worldFor(draft.goal as Goal) : null

  const [toast, setToast] = useState<string | null>(null)
  const set = (id: FieldId, v: Draft[FieldId]) => {
    const next = { ...draft, [id]: v }
    const owner = BLOCKS.find((b) => b.fields.includes(id))
    if (owner && !blockComplete(draft, owner.key) && blockComplete(next, owner.key)) {
      setToast(GEAR_BY_BLOCK[owner.key].name)
      window.setTimeout(() => setToast(null), 2800)
    }
    setDraft(next)
  }
  const go = (s: number) => {
    setStep(s)
    window.scrollTo({ top: 0 })
  }

  const mentorKey = step === 0 ? 'onboarding' : step === SUMMARY ? 'onboarding_summary' : `onboarding_${BLOCKS[step - 1].key}`
  return (
    <main className="creation">
      <Mentor key={mentorKey} screen="ficha" text={N.mentor[mentorKey as keyof typeof N.mentor]} voiceKey={`mentor_${mentorKey}`} />
      <div className="title-block">
        <p className="kicker">Crea tu yo inversor</p>
        <h1>{STEPS[step]}</h1>
      </div>

      {toast && <p className="gear-toast" role="status">🎁 ¡Desbloqueado: {toast}!</p>}
      <ol className="stepper" aria-label="Pasos">
        {STEPS.map((s, i) => {
          const done = i === 0 || (i <= BLOCKS.length && blockComplete(draft, BLOCKS[i - 1].key))
          const reachable = i <= step || (i < SUMMARY ? BLOCKS.slice(0, i - 1).every((b) => blockComplete(draft, b.key)) : allComplete)
          return (
            <li key={s}>
              <button className="step-chip" data-state={i === step ? 'current' : done && i < step ? 'done' : 'next'}
                aria-current={i === step ? 'step' : undefined} onClick={() => go(i)} disabled={!reachable}>
                <span className="step-num">{i + 1}</span> {s}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="creation-layout">
        <aside className="panel portrait">
          {webgl ? (
            <Suspense fallback={<AvatarFlat avatar={shownAvatar} />}>
              <AvatarPreview avatar={shownAvatar} reducedMotion={reducedMotion} />
            </Suspense>
          ) : <AvatarFlat avatar={avatar} />}
          <p className="portrait-alias">{avatar.alias.trim() || 'Sin alias'}</p>
          <dl className="portrait-stats">
            {BLOCKS.map((b) => (
              <div key={b.key} data-done={blockComplete(draft, b.key)}>
                <dt>{b.title}</dt>
                <dd>{blockComplete(draft, b.key) ? `🎁 ${GEAR_BY_BLOCK[b.key].name}` : 'Pendiente'}</dd>
              </div>
            ))}
            <div data-done={world !== null}><dt>Mundo</dt><dd>{world ? world.name : 'Por descubrir'}</dd></div>
          </dl>
        </aside>

        <section className="creation-body">
          {step === 0 && <Appearance avatar={avatar} onChange={setAvatar} />}

          {block && (
            <>
              <p className="lead">{block.intro}</p>
              {block.fields.map((f) => (
                <QuestionView key={f} q={questionOf(f)} draft={draft} onSet={set} />
              ))}
              {block.key === 'mission' && world && (
                <div className="panel world-reveal" aria-live="polite">
                  <p className="kicker">Tu mundo</p>
                  <p className="world-name">{world.name}</p>
                  <p className="lead">{world.tagline}</p>
                </div>
              )}
            </>
          )}

          {step === SUMMARY && (
            <Summary draft={draft} flags={flags} confirmed={confirmed} missing={missing}
              onConfirmFlag={(id, ok) => setConfirmed((c) => (ok ? [...c, id] : c.filter((x) => x !== id)))}
              onEdit={(b) => go(BLOCKS.findIndex((x) => x.key === b) + 1)} final={final} onFinal={setFinal} />
          )}

          <div className="creation-nav">
            {step > 0 && <button className="ghost" onClick={() => go(step - 1)}>Atrás</button>}
            {step < SUMMARY && (
              <button className="start" onClick={() => go(step + 1)} disabled={block !== null && !blockComplete(draft, block.key)}>
                {step === SUMMARY - 1 ? 'Ver mi ficha' : 'Siguiente'}
              </button>
            )}
            {step === SUMMARY && (
              <button className="start" disabled={!canFinish}
                onClick={() => onDone({ avatar: shownAvatar, answers: toAnswers(draft), confirmedFlags: confirmed, confirmedAt: new Date().toISOString() })}>
                Empezar la aventura
              </button>
            )}
          </div>
          {block && !blockComplete(draft, block.key) && (
            <p className="muted small">Responde a todo para seguir. Siempre puedes elegir "No lo sé" o "Prefiero no responder".</p>
          )}
        </section>
      </div>
    </main>
  )
}

function QuestionView({ q, draft, onSet }: { q: Question; draft: Draft; onSet: (id: FieldId, v: Draft[FieldId]) => void }) {
  switch (q.kind) {
    case 'single': return <Single q={q} value={draft[q.id] as string | null | undefined} onSet={(v) => onSet(q.id, v)} />
    case 'multi': return <Multi q={q} value={draft[q.id] as string[] | undefined} onSet={(v) => onSet(q.id, v)} />
    case 'quiz': return <Quiz q={q} value={draft[q.id] as string | undefined} onSet={(v) => onSet(q.id, v)} />
    case 'amount': return <Amount q={q} value={draft[q.id] as number | null | undefined} onSet={(v) => onSet(q.id, v)} />
    case 'return': return <Coaster q={q} value={draft[q.id] as string | undefined} amount={amountOf(draft)} onSet={(v) => onSet(q.id, v)} />
  }
}

function Field({ q, children }: { q: Question; children: React.ReactNode }) {
  return (
    <fieldset className="choice">
      <legend>{q.label}</legend>
      {q.help && <p className="help">{q.help}</p>}
      {children}
    </fieldset>
  )
}

function Option({ name, checked, onChange, children, type = 'radio', disabled }: {
  name: string; checked: boolean; onChange: () => void; children: React.ReactNode; type?: 'radio' | 'checkbox'; disabled?: boolean
}) {
  return (
    <label className="option" data-checked={checked} data-disabled={disabled}>
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span>{children}</span>
    </label>
  )
}

function Single({ q, value, onSet }: { q: SingleQ; value: string | null | undefined; onSet: (v: string | null) => void }) {
  return (
    <Field q={q}>
      <div className="options">
        {q.options.map((o) => <Option key={o.value} name={q.id} checked={value === o.value} onChange={() => onSet(o.value)}>{o.label}</Option>)}
        {q.skipLabel && <Option name={q.id} checked={value === null} onChange={() => onSet(null)}>{q.skipLabel}</Option>}
      </div>
    </Field>
  )
}

function Multi({ q, value, onSet }: { q: MultiQ; value: string[] | undefined; onSet: (v: string[]) => void }) {
  const toggle = (v: string) => {
    const cur = value ?? []
    onSet(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
  }
  return (
    <Field q={q}>
      <div className="options">
        {q.options.map((o) => (
          <Option key={o.value} type="checkbox" name={q.id} checked={value?.includes(o.value) ?? false} onChange={() => toggle(o.value)}>{o.label}</Option>
        ))}
        <Option type="checkbox" name={q.id} checked={value !== undefined && value.length === 0} onChange={() => onSet([])}>{q.noneLabel}</Option>
      </div>
    </Field>
  )
}

/** Quick challenge: once answered it is locked and a one-line explanation appears (CUESTIONARIO.md §2 bis). */
function Quiz({ q, value, onSet }: { q: QuizQ; value: string | undefined; onSet: (v: string) => void }) {
  const locked = value !== undefined
  return (
    <Field q={q}>
      <div className="options">
        {q.options.map((o) => (
          <Option key={o.value} name={q.id} checked={value === o.value} onChange={() => !locked && onSet(o.value)} disabled={locked && value !== o.value}>{o.label}</Option>
        ))}
      </div>
      {locked && (
        <p className="quiz-explain" aria-live="polite">
          <strong>{value === q.correct ? 'Correcto.' : value === 'dont_know' ? 'Bien por no adivinar.' : 'No exactamente.'}</strong> {q.explanation}
        </p>
      )}
    </Field>
  )
}

function Amount({ q, value, onSet }: { q: AmountQ; value: number | null | undefined; onSet: (v: number | null) => void }) {
  return (
    <Field q={q}>
      <div className="options compact">
        {q.amounts.map((a) => <Option key={a} name={q.id} checked={value === a} onChange={() => onSet(a)}>{formatEur(a)}</Option>)}
        <Option name={q.id} checked={value === null} onChange={() => onSet(null)}>{q.skipLabel}</Option>
      </div>
    </Field>
  )
}

/** "Elige tu montaña rusa": the bad and the good year in euros over the amount to invest. */
function Coaster({ q, value, amount, onSet }: { q: ReturnQ; value: string | undefined; amount: number; onSet: (v: string) => void }) {
  return (
    <Field q={q}>
      <div className="options coasters">
        {q.options.map((o, i) => (
          <Option key={o.value} name={q.id} checked={value === o.value} onChange={() => onSet(o.value)}>
            <span className="coaster">
              <span className="coaster-n">Vagoneta {i + 1}</span>
              <span>Año malo: <strong className="neg">{formatEur(amount * o.bad)}</strong></span>
              <span>Año bueno: <strong className="pos">+{formatEur(amount * o.good)}</strong></span>
            </span>
          </Option>
        ))}
      </div>
    </Field>
  )
}

function Appearance({ avatar, onChange }: { avatar: Avatar; onChange: (a: Avatar) => void }) {
  return (
    <>
      <p className="lead">Tu aspecto es solo tuyo y no influye en nada. Lo que cuenta viene después.</p>
      <label className="field">
        <span className="field-label">Alias (opcional)</span>
        <input type="text" maxLength={18} value={avatar.alias} onChange={(e) => onChange({ ...avatar, alias: e.target.value })}
          placeholder="Un apodo, no tu nombre real" autoComplete="off" />
      </label>
      <Swatches label="Traje" items={SUITS} value={avatar.suit} onPick={(c) => onChange({ ...avatar, suit: c })} />
      <Swatches label="Visor" items={VISORS} value={avatar.visor} onPick={(c) => onChange({ ...avatar, visor: c })} />
      <fieldset className="choice">
        <legend>Accesorio</legend>
        <div className="options compact">
          {ACCESSORIES.map((a) => (
            <Option key={a.key} name="accessory" checked={avatar.accessory === a.key} onChange={() => onChange({ ...avatar, accessory: a.key })}>{a.label}</Option>
          ))}
        </div>
      </fieldset>
    </>
  )
}

function Swatches({ label, items, value, onPick }: { label: string; items: { color: string; label: string }[]; value: string; onPick: (c: string) => void }) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="swatches">
        {items.map((it) => (
          <label key={it.color} className="swatch" data-checked={value === it.color} title={it.label}>
            <input type="radio" name={label} checked={value === it.color} onChange={() => onPick(it.color)} aria-label={it.label} />
            <span style={{ background: it.color }} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface SummaryProps {
  draft: Draft
  flags: { id: string; message: string }[]
  confirmed: string[]
  missing: FieldId[]
  onConfirmFlag: (id: string, ok: boolean) => void
  onEdit: (b: BlockKey) => void
  final: boolean
  onFinal: (v: boolean) => void
}

function Summary({ draft, flags, confirmed, missing, onConfirmFlag, onEdit, final, onFinal }: SummaryProps) {
  return (
    <>
      <p className="lead">Revisa tu ficha en palabras normales. Son tus datos para la evaluación de idoneidad.</p>
      {missing.length > 0 && (
        <div className="panel flags" role="alert">
          <p className="flags-title">Misión en pausa</p>
          <p>Sin estos datos no se puede elaborar tu perfil, porque la normativa no permite prestar el servicio sin información suficiente:</p>
          <ul>{missing.map((f) => <li key={f}>{questionOf(f).label}</li>)}</ul>
          <button className="ghost small" onClick={() => onEdit('base')}>Completar tu base</button>
        </div>
      )}
      {flags.length > 0 && (
        <div className="panel flags" role="region" aria-label="Respuestas que conviene revisar">
          <p className="flags-title">Antes de seguir, revisa esto</p>
          {flags.map((f) => (
            <label key={f.id} className="consent">
              <input type="checkbox" checked={confirmed.includes(f.id)} onChange={(e) => onConfirmFlag(f.id, e.target.checked)} />
              <span className="toggle" aria-hidden="true" />
              <span>{f.message} <strong>Es correcto.</strong></span>
            </label>
          ))}
        </div>
      )}
      <div className="sheet">
        {BLOCKS.map((b) => (
          <section key={b.key} className="panel sheet-block">
            <header>
              <h2>{b.title}</h2>
              {b.key !== 'quiz' && <button className="ghost small" onClick={() => onEdit(b.key)}>Editar</button>}
            </header>
            <dl>
              {b.fields.map((f) => (
                <div key={f}><dt>{questionOf(f).label}</dt><dd>{answerText(f, draft[f])}</dd></div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <label className="consent">
        <input type="checkbox" checked={final} onChange={(e) => onFinal(e.target.checked)} />
        <span className="toggle" aria-hidden="true" />
        <span>Confirmo que estos datos son míos y son correctos.</span>
      </label>
    </>
  )
}

function AvatarFlat({ avatar }: { avatar: Avatar }) {
  return (
    <svg className="avatar-preview" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="34" ry="6" fill="#262056" />
      <rect x="44" y="58" width="32" height="44" rx="10" fill={avatar.suit} />
      <circle cx="60" cy="40" r="17" fill={avatar.suit} />
      <rect x="49" y="37" width="22" height="7" rx="3" fill={avatar.visor} />
    </svg>
  )
}
