# CLAUDE.md — BehaviorLab (Hack Finance)

> Léelo entero antes de tocar código. El detalle de producto, plan y reparto está en `docs/SPEC.md`.

## Qué es
Producto B2B (cliente ficticio de la demo: MyInvestor). Un juego corto mide cómo reaccionan jóvenes inversores ante caídas de mercado y subidas de sueldo. Se estima un **perfil conductual con incertidumbre** y se propone la cartera del catálogo que esa persona sea capaz de mantener. Complementa al test de idoneidad; no lo sustituye.

Fechas: entrega **miércoles 11-nov-2026 por la noche** (objetivo: enviar a las 20:00). Pitch jueves 12-nov. El jueves NO se cambia código.

## Principios no negociables
1. **Ningún LLM calcula cifras.** Todo número sale de código determinista con tests. Claude solo redacta texto (titulares de noticias, explicación del perfil) y nunca decide ni corrige cifras.
2. **Contratos primero.** `contracts/` es la fuente de verdad (modelos pydantic). Cambiarlos requiere PR y aviso en el chat del equipo.
3. **Núcleo puro.** `backend/behaviorlab/` no hace red ni lee disco salvo fixtures. Así se testea.
4. **Reproducible.** Toda aleatoriedad lleva semilla explícita.
5. **Incertidumbre siempre visible.** Ningún parámetro del perfil se muestra sin su intervalo.
6. **Validación matemática obligatoria.** Cada módulo numérico trae tests unitarios y, donde sea barato, una implementación de referencia independiente o tests de propiedades (Hypothesis).
7. **Datos y legal.**
   - Prohibido en el repo: datos personales, secretos (`.env`), material con copyright (no subir el informe Morningstar X-Ray).
   - El catálogo se guarda como snapshots en `data/catalog/` con fecha y fuente, generados a mano desde consultas conversacionales. **Nunca** con scripts ni bucles contra el MCP de MyInvestor: mientras la organización no confirme otra cosa (pregunta abierta en `docs/SPEC.md` §11), asumimos que sus condiciones de uso no lo permiten.
   - Esto no es asesoramiento regulado: la UI y el README lo dicen.

## Arquitectura (resumen)
```
contracts/            modelos pydantic compartidos (Scenario, GameState, Decision, Posterior, Profile, PortfolioProposal)
backend/behaviorlab/
  scenarios/          generador de trayectorias sintéticas con semilla
  game/               estado del juego, acciones, ritmo de rondas
  inference/          posterior en rejilla, ganancia de información, preguntas adaptativas
  portfolio/          simulación de la conducta del cliente sobre carteras candidatas
  validation/         recuperación de parámetros, calibración, baseline de cuestionario
  text/               interfaz TextGenerator (Claude) con fallback determinista
backend/api/          FastAPI, solo orquesta
frontend/             juego + panel del banco (visualizaciones)
data/catalog/         snapshots JSON del catálogo (fecha + fuente)
data/study/           solo resultados agregados y anónimos
data/cache/           textos generados cacheados
reports/              salida de `make validate`
pitch/                PDF de una página y fuentes
tests/  docs/
```
Flujo: `scenarios → game → inference (posterior) → portfolio → Profile + PortfolioProposal → panel`.

## Stack
Python 3.12, numpy/scipy, pydantic, FastAPI, pytest + hypothesis, ruff. Frontend: Vite + React + TypeScript + Three.js (React Three Fiber). Persistencia: PostgreSQL (`DATABASE_URL`), carpeta o memoria.

## Comandos (Makefile)
`make setup` · `make test` · `make lint` · `make run-api` · `make run-web` · `make validate` (corre la batería de validación y escribe `reports/validation.md`).

## Convenciones
- Código, identificadores y comentarios en inglés. Textos de UI, README y docs en español.
- Type hints en todo. Cada función numérica documenta su fórmula en el docstring.
- Ramas: `feat/<area>-<descripcion>`, `fix/...`. PRs pequeños. `main` siempre pasa `make test`.
- Commits cortos y en imperativo.

## Uso de IA en ejecución
- Interfaz `TextGenerator` con dos implementaciones: Claude y plantillas deterministas (fallback). La demo no puede depender de una llamada en vivo: los textos se cachean en `data/cache/`.
- Tiers de modelo para cuidar los 400 €: modelo pequeño para titulares y reformulaciones, mediano para la explicación del perfil, grande solo para revisiones puntuales. Variable `LLM_BUDGET_EUR` con tope duro. Comprobad precios vigentes en la documentación.
- ElevenLabs es extra (Tier 2) detrás de `ENABLE_VOICE=false` por defecto.

## Cómo debe trabajar Claude Code aquí
- Para cambios de más de un archivo, propón un plan breve antes de editar.
- Trabaja solo en el área asignada a quien te usa (ver `docs/SPEC.md`, reparto). Si necesitas tocar otra, dilo y para.
- Ejecuta `make test` antes de dar algo por hecho. No digas "funciona" sin haberlo corrido.
- No inventes datos de fondos ni cifras. Si falta un dato, deja un `TODO(owner)` y avisa.
- No toques `contracts/` sin que te lo pidan explícitamente.
- Nunca hagas commit de `.env`, claves ni datos de personas.

## Definición de hecho (DoD)
Código tipado + tests pasando + docstring con fórmula (si es numérico) + línea en `docs/STATUS.md` + PR revisado por otra persona (o aprobado en voz alta si hay prisa).
