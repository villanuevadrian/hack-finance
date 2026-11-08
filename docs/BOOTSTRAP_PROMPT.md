# Prompt de arranque (lo pega UNA persona en Claude Code, en una carpeta vacía)

Antes: crea el repo en GitHub, clónalo, copia dentro `CLAUDE.md` y `docs/SPEC.md`, y abre Claude Code en esa carpeta. Usa modo plan.

> Nota (8-nov): el repo ya existe con la estructura de carpetas, los README por módulo, `.gitignore`, `.env.example`, `docs/STATUS.md` (una cabecera por rol) y `.github/`. Respétalos y complétalos; no los recrees. Lanzar solo cuando D1, D2, D6, D8, D10, D11, D12 y las dudas C1-C5 y T1-T3 de `docs/DUDAS.md` estén cerradas.

---

Lee `CLAUDE.md` y `docs/SPEC.md`. Vamos a crear el esqueleto del proyecto BehaviorLab para un hackathon con entrega el miércoles por la noche.

Primero propón un plan breve (máximo 15 líneas) y espera mi OK. Después, cuando lo apruebe, crea SOLO el esqueleto, sin lógica de negocio:

1. Estructura de carpetas exactamente como en `CLAUDE.md`, con `__init__.py` y un README corto por módulo.
2. `contracts/` con los modelos pydantic `Scenario`, `GameState`, `Decision`, `Posterior`, `Profile`, `PortfolioProposal` (y los que añadan las decisiones de `docs/DUDAS.md`: `Situation`, `CatalogPortfolio`, `Character`) según la sección 4 del SPEC. Solo campos y validaciones básicas; añade un test que valide un ejemplo de cada uno.
3. `backend/behaviorlab/` con funciones vacías tipadas y docstrings que indiquen la fórmula prevista, que lancen `NotImplementedError`.
4. `backend/api/` con FastAPI y los 4 endpoints del SPEC devolviendo datos de ejemplo válidos según los contratos.
5. `Makefile` con `setup`, `test`, `lint`, `run-api`, `run-web`, `validate`.
6. `pyproject.toml` con Python 3.12, numpy, scipy, pydantic, fastapi, uvicorn, pytest, hypothesis y ruff. Sin dependencias que no uses.
7. `.gitignore` (incluye `.env`, `data/study/raw/`, `reports/*.tmp`), `.env.example` con `LLM_BUDGET_EUR`, `ANTHROPIC_API_KEY`, `ENABLE_VOICE=false`.
8. `docs/STATUS.md` vacío con una cabecera por rol (ya existe).
9. GitHub Actions que ejecute `make lint` y `make test`.

Reglas: no inventes datos de fondos; no crees nada en `data/catalog/` salvo un `README.md` que explique que los snapshots se generan a mano con fecha y fuente; no instales nada global; al final ejecuta `make setup && make test` y dime el resultado real, incluidos los fallos. No hagas commit hasta que yo lo pida.
