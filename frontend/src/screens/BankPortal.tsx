import { useEffect, useState } from 'react'
import { api, ApiError, type GameSummary } from '../api/client'
import type { Goal } from '../api/types'
import { ENTITY_NAME } from '../config'
import { localGames } from '../localIndex'
import { LEVEL_LABEL } from '../params'
import { worldFor } from '../worlds'

type Source = 'api' | 'local'

/**
 * Bank side: list of games with their result, aggregated indicators and access to each client's panel.
 * Uses GET /games when the backend has it; otherwise the games started in this browser (one-laptop demo).
 * DEMO ACCESS: there is no authentication yet. TODO(Núcleo): a real entity login before any real use.
 */
export function BankPortal({ onOpen, onExit }: { onOpen: (gameId: string) => void; onExit: () => void }) {
  const [entered, setEntered] = useState(false)
  const [rows, setRows] = useState<GameSummary[] | null>(null)
  const [source, setSource] = useState<Source>('api')
  const [missing, setMissing] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [storage, setStorage] = useState<string | null>(null)
  useEffect(() => {
    api.config().then((c) => setStorage(c.storage ?? null)).catch(() => setStorage(null))
  }, [])

  useEffect(() => {
    if (!entered) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listGames()
        if (!cancelled) { setRows(list); setSource('api') }
      } catch (e) {
        if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar las partidas.')
          return
        }
        const out: GameSummary[] = []
        let lost = 0
        for (const g of localGames()) {
          try {
            const s = await api.game(g.game_id)
            const row: GameSummary = { game_id: g.game_id, created_at: g.created_at, finished: s.finished, round_index: s.round_index, n_rounds: s.n_rounds, goal: '', horizon: '' }
            if (s.finished) {
              const [p, pr] = await Promise.all([api.profile(g.game_id), api.proposal(g.game_id)])
              Object.assign(row, { final_level: p.levels.final, limiting: p.levels.limiting, portfolio_name: pr.portfolio_name, stated_level: p.stated_level, revealed_level: p.levels.revealed, reliability: p.reliability, provisional_model: p.provisional_model })
            }
            out.push(row)
          } catch {
            lost += 1
          }
        }
        if (!cancelled) { setRows(out); setSource('local'); setMissing(lost) }
      }
    })()
    return () => { cancelled = true }
  }, [entered])

  if (!entered)
    return (
      <main className="portal">
        <div className="title-block">
          <p className="kicker">{ENTITY_NAME}</p>
          <h1>Acceso para entidades</h1>
          <p className="lead">Consulta los perfiles y las propuestas de los clientes que han completado la evaluación.</p>
        </div>
        <div className="panel start-panel">
          <p className="notice">Acceso de demostración sin autenticación. En un uso real, solo personal autorizado de la entidad, con su propio inicio de sesión.</p>
          <button className="start" onClick={() => setEntered(true)}>Entrar como entidad (demo)</button>
          <button className="ghost" onClick={onExit}>Volver al juego</button>
        </div>
      </main>
    )

  const finished = rows?.filter((r) => r.finished) ?? []
  const over = finished.filter((r) => (r.stated_level ?? 0) > (r.revealed_level ?? 0)).length
  const avg = finished.length ? finished.reduce((a, r) => a + (r.final_level ?? 0), 0) / finished.length : 0
  const byPortfolio = finished.reduce<Record<string, number>>((acc, r) => {
    const k = r.portfolio_name ?? 'Sin propuesta'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="portal">
      <div className="title-block">
        <p className="kicker">{ENTITY_NAME}: portal de la entidad</p>
        <h1>Clientes evaluados</h1>
        <p className="muted small">
          {source === 'api'
            ? storage === 'postgres' ? 'Partidas guardadas en la base de datos (PostgreSQL).'
              : storage === 'disk' ? 'Partidas guardadas en el disco del servidor.'
                : 'Atención: el servidor guarda las partidas solo en memoria y se pierden al reiniciarse (falta DATABASE_URL).'
            : 'El servidor aún no tiene la lista de partidas: se muestran las jugadas en este navegador.'}
          {missing > 0 && ` ${missing} partidas ya no están en el servidor (se reinició).`} Sin datos identificativos.
        </p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {rows === null && !error && <p className="muted">Cargando…</p>}
      {rows && (
        <>
          <div className="kpis">
            <div className="panel kpi"><span>Evaluaciones</span><strong>{rows.length}</strong></div>
            <div className="panel kpi"><span>Completadas</span><strong>{finished.length}</strong></div>
            <div className="panel kpi"><span>Nivel final medio</span><strong>{finished.length ? avg.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '—'}</strong></div>
            <div className="panel kpi"><span>Creen aguantar más de lo que muestran</span><strong>{finished.length ? `${over} de ${finished.length}` : '—'}</strong></div>
            <div className="panel kpi"><span>Piden revisión humana</span><strong>{rows.filter((r) => r.review_requested_at).length}</strong></div>
            <div className="panel kpi"><span>Perfiles poco concluyentes</span><strong>{finished.filter((r) => r.reliability === 'baja').length}</strong></div>
          </div>
          {Object.keys(byPortfolio).length > 0 && (
            <div className="panel bp-block">
              <h2>Carteras propuestas</h2>
              <div className="bars">
                {Object.entries(byPortfolio).map(([name, n]) => (
                  <div key={name} className="bar-row"><span>{name}</span><span className="bar" style={{ width: `${(n / finished.length) * 100}%` }} /><b>{n}</b></div>
                ))}
              </div>
            </div>
          )}
          <div className="panel bp-block bp-table-wrap">
            <table className="bp-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Mundo</th><th>Estado</th><th>Nivel final</th><th>Limita</th><th>Cartera</th><th>Declarado / revelado</th><th>Confianza</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.game_id}>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                    <td><code>{r.game_id.slice(0, 8)}</code></td>
                    <td>{r.goal ? worldFor(r.goal as Goal).name : '—'}</td>
                    <td>{r.finished ? 'Completada' : `En curso (mes ${Math.min(r.round_index, r.n_rounds)})`}</td>
                    <td>{r.final_level ?? '—'}</td>
                    <td>{r.limiting?.length ? r.limiting.map((l) => LEVEL_LABEL[l] ?? l).join(', ') : '—'}</td>
                    <td>{r.portfolio_name ?? '—'}</td>
                    <td>{r.finished ? `${r.stated_level} / ${r.revealed_level}` : '—'}</td>
                    <td>{r.reliability ?? '—'}</td>
                    <td>
                      {[r.review_requested_at && '⚑ Pide revisión', r.accessible && 'Modo accesible', r.previous_game_id && `Repite (${r.previous_game_id.slice(0, 6)})`]
                        .filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td>{r.finished && <button className="ghost small" onClick={() => onOpen(r.game_id)}>Ver panel</button>}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={11} className="muted">Todavía no hay partidas.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      <button className="ghost" onClick={onExit}>Volver al juego</button>
    </main>
  )
}
