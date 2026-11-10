# Estado (append-only)

Al cerrar un bloque, añade una línea: `- AAAA-MM-DD HH:MM · persona · qué quedó hecho · siguiente paso · bloqueos`.

## Producto y pitch
- 2026-11-08 14:59 · Álvaro · Snapshot del catálogo (6 carteras indexadas) y diseño de escenarios para el onboarding (partida única centrada en caídas) y cuestionario de idoneidad gamificado (docs/CUESTIONARIO.md) en rama feat/producto-calibracion · revisar con Adrian en la reunión y cerrar D4 · sin bloqueos
## Modelo y validación
## Núcleo y API
- 2026-11-08 · Adrian · infraestructura del scaffold (pyproject, Makefile, CI, /health, tests de entorno; `make setup/test/lint` en verde en macOS) · contratos v0 tras cerrar D1, D2, D6 y C1-C5 · ninguno
- 2026-11-10 · Adrian · núcleo implementado en feat/core-implementacion: contratos, scenarios (calibración de Álvaro), game (15 rondas, D2-B, niveles del cuestionario), portfolio (D5/D6), API completa e inference PROVISIONAL en la carpeta de Datos; 116 tests + 1 xfail (Rock 2008) · Amanda sustituye la inference; Álvaro revisa TODOs de forma de episodios, umbral de pánico y Ahorro · D5 propone carteras conservadoras incluso a quien aguanta: decidir umbral y episode_prob
## Frontend y experiencia
