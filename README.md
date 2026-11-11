# BehaviorLab

Hack Finance 2026 · Madrid Engineering Week · BEST UC3M

**Qué es:** la evaluación de idoneidad de un banco en formato de juego (D13). El cliente crea su "yo inversor" respondiendo las preguntas que exige la norma y después vive quince meses de mercado simulado: caídas, subidas de sueldo y recuperación. Con lo que **hace** (no con lo que dice) estimamos su perfil de conducta con su incertidumbre y proponemos la cartera del catálogo que sea capaz de mantener. Producto B2B para el onboarding; cliente de la demo: MyInvestor. **No es asesoramiento financiero.**

## Demo en 3 comandos
Requisitos: **Python 3.12**, **Node.js ≥ 20.19**, `make` y `git`. Todo se instala dentro del repo (`.venv/` y `frontend/node_modules/`), nada global.

```bash
make setup && make setup-web     # instala backend y frontend con versiones fijadas
make run-api                     # terminal 1: API en http://127.0.0.1:8000 (docs en /docs)
make run-web                     # terminal 2: juego y panel del banco en http://localhost:5280
```

Abrid http://localhost:5280, cread vuestro "yo inversor", jugad las 15 rondas y al final veréis el perfil, la cartera propuesta, el informe de idoneidad, la "revelación" (el mismo mercado jugado con otras decisiones) y el panel del banco.

## Tests
```bash
make test        # backend: tests unitarios, de propiedades (Hypothesis) e integración de la API
make lint        # backend: ruff
make test-web    # frontend: tests (vitest), lint (oxlint) y build
```
La CI de GitHub ejecuta las dos baterías en cada PR y en cada push a `main`.

## Configuración
Todo funciona sin configurar nada. Opcional, en un `.env` en la raíz (copiad `.env.example`; **nunca se sube**). `make run-api` lo carga solo:

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Vega, la ayudante, responde con Claude. Sin clave (o si falla la red) responde con preguntas frecuentes fijas. `GET /config` indica `"assistant_uses_claude"` |
| `BEHAVIORLAB_DECISION_TIMEOUT_MS` | Tiempo por decisión (por defecto 30 000) |
| `BEHAVIORLAB_DATA_DIR` | Carpeta donde guardar las partidas para que sobrevivan a un reinicio (por defecto, solo en memoria). Debe quedar fuera de git |
| `VITE_ENABLE_VOICE` | Voz de Vega con los audios pregrabados de `frontend/public/audio/` (T2). Activada por defecto en `frontend/.env.development` y `.env.production`; con `false`, solo subtítulos. El navegador no reproduce sonido hasta el primer clic en la página |
| `VITE_API_URL` | Dirección de la API para el frontend (por defecto `http://localhost:8000`; `make run-web` la ajusta a `API_PORT`) |

Claude **nunca** calcula cifras: todos los números salen de código determinista con tests.

Puertos por defecto: API 8000 y web 5280. Si alguno está ocupado: `make run-api API_PORT=8010` y `make run-web WEB_PORT=5290 API_PORT=8010`.

Si `python3.12` no está en el PATH: `make setup PYTHON=/ruta/a/python3.12`. En Windows, usad WSL. Las versiones exactas del backend están en `requirements-lock.txt` (`make lock` para regenerarlo) y las del frontend en `frontend/package-lock.json`.

## Cómo funciona
```
cuestionario ─► game (15 rondas con semilla) ─► inference (posterior λ, θ, η) ─► portfolio (D5) ─► Profile + PortfolioProposal ─► panel
                 ▲ scenarios (mercado sintético calibrado con el catálogo)
```
- **Escenarios** (`backend/behaviorlab/scenarios/`): dos índices sintéticos (bolsa y bonos) con semilla, calibrados con el snapshot del catálogo de MyInvestor (`data/catalog/`) y cinco episodios de caída (`CALIBRACION.md`).
- **Partida** (`game/`): vender todo / mantener / aportar; en las subidas de sueldo, qué parte se invierte.
- **Perfil** (`inference/`): λ aversión a la pérdida, θ caída a la que vende, η parte del aumento que invierte, siempre con su intervalo creíble al 90 %.
- **Cartera** (`portfolio/`): se simula la conducta estimada sobre cada cartera del catálogo; nivel final = mínimo de (lo revelado en la partida, la capacidad de asumir pérdidas, el horizonte). Lo declarado nunca sube el riesgo.
- **API** (`backend/api/`, solo orquesta): ver [`backend/api/README.md`](backend/api/README.md).
- **Frontend** (`frontend/`, React + Vite + TypeScript): ver [`frontend/README.md`](frontend/README.md).

## Limitaciones conocidas
- El modelo de inferencia es **provisional** (los perfiles llevan `provisional_model: true`).
- Escenarios sintéticos: pueden infraestimar colas extremas. La Cartera Ahorro se simula como renta fija y su riesgo queda sobrestimado.
- Rentabilidades del catálogo sin comisiones de gestión ni custodia. Rentabilidades pasadas no garantizan rentabilidades futuras.

## Documentación
`docs/SPEC.md` (producto y plan) · `docs/DECISIONS.md` (decisiones) · `docs/REQUIREMENTS.md` (requisitos) · `docs/CUESTIONARIO.md` (cuestionario de idoneidad) · `docs/ROLES.md` (equipo) · `docs/STATUS.md` (estado) · `CLAUDE.md` (reglas para Claude Code).

## Estructura
```
contracts/              modelos compartidos (pydantic)
backend/behaviorlab/    núcleo: scenarios, game, inference, portfolio, validation, text
backend/api/            FastAPI (solo orquesta)
frontend/               juego + panel del banco
data/                   catalog (snapshots con fecha y fuente), study (protocolo, solo agregados)
tests/                  unit, property, integration
reports/                salida de validación
pitch/                  PDF, presentación, guion
docs/                   spec, roles, requisitos, decisiones, estado
```

## Equipo
Ver `docs/ROLES.md`.
