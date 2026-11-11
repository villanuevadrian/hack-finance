# api/
FastAPI. Solo orquesta, no calcula. Dueño: Informática 1. Partidas en memoria (se pierden al reiniciar).

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Comprobación de vida |
| GET | `/catalog` | Snapshot del catálogo (`Catalog`) |
| POST | `/games` | `{answers: OnboardingAnswers, seed?: int}` → `GameState` de la ronda 1. 422 si falta un dato obligatorio |
| GET | `/games/{id}` | `GameState` actual |
| POST | `/games/{id}/decision` | `{action: Action \| null, response_time_ms, feeling_text?}` → `GameState` siguiente. `null` o > 15 s = no hacer nada |
| GET | `/games/{id}/scenario` | Trayectoria completa del mercado (solo al terminar, para el panel) |
| GET | `/games/{id}/profile` | `Profile` (409 hasta terminar) |
| GET | `/games/{id}/proposal` | `PortfolioProposal` (409 hasta terminar) |
| GET | `/games/{id}/posterior` | `Posterior` con marginales para gráficos (409 hasta terminar) |

Documentación interactiva con los esquemas: `make run-api` y abrir http://127.0.0.1:8000/docs. CORS abierto para cualquier puerto de `localhost` (el frontend usa el 5280 por defecto) y para los orígenes de `BEHAVIORLAB_CORS_ORIGINS`.
