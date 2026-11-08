# BehaviorLab (nombre provisional)

Hack Finance 2026 · Madrid Engineering Week · BEST UC3M

**Qué es:** un juego corto que mide cómo reaccionan los jóvenes inversores ante caídas de mercado y subidas de sueldo. Con esa conducta estimamos un perfil con su incertidumbre y proponemos la cartera del catálogo que la persona sea capaz de mantener. Producto B2B; cliente de la demo: MyInvestor. Complementa el test de idoneidad, no lo sustituye. **No es asesoramiento financiero.**

## Estado
Esqueleto. Aún no hay código. Empieza por aquí:
1. `docs/SPEC.md` — producto, MVP por tiers, plan hasta el miércoles.
2. `docs/ROLES.md` — elegid rol y dueños.
3. `docs/REQUIREMENTS.md` — requisitos con ID, prioridad y dueño.
4. `docs/DECISIONS.md` — decisiones D1-D8 a cerrar hoy.
5. `CLAUDE.md` — reglas que Claude Code carga automáticamente.

## Estructura
```
contracts/              modelos compartidos entre módulos
backend/behaviorlab/    núcleo: scenarios, game, inference, portfolio, validation, text
backend/api/            FastAPI (solo orquesta)
frontend/               juego + panel del banco
data/                   catalog (snapshots), study (agregados), cache (textos)
tests/                  unit, property, integration
reports/                salida de validación
pitch/                  PDF, presentación, guion
docs/                   spec, roles, requisitos, decisiones, estado
```

## Instalación, configuración, ejecución y tests
Se completa cuando exista el scaffold (`docs/BOOTSTRAP_PROMPT.md`). Comandos previstos: `make setup`, `make test`, `make run-api`, `make run-web`, `make validate`.

## Equipo
Ver `docs/ROLES.md`.
