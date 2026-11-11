# Estado (append-only)

Al cerrar un bloque, añade una línea: `- AAAA-MM-DD HH:MM · persona · qué quedó hecho · siguiente paso · bloqueos`.

## Producto y pitch
- 2026-11-08 14:59 · Álvaro · Snapshot del catálogo (6 carteras indexadas) y diseño de escenarios para el onboarding (partida única centrada en caídas) y cuestionario de idoneidad gamificado (docs/CUESTIONARIO.md) en rama feat/producto-calibracion · revisar con Adrian en la reunión y cerrar D4 · sin bloqueos
- 2026-11-11 10:55 · Álvaro · TODO(Álvaro) cerrados: umbral P(pánico) D5 = 0,30; control 2008 a ±2 pp (Rock deja de ser xfail); ingresos abiertos 800 / 5.000 €; forma de episodios, subida de ronda 1 y Ahorro como RF aceptados · pitch y README de producto · episode_prob sigue pendiente de Amanda
## Modelo y validación
## Núcleo y API
- 2026-11-08 · Adrian · infraestructura del scaffold (pyproject, Makefile, CI, /health, tests de entorno; `make setup/test/lint` en verde en macOS) · contratos v0 tras cerrar D1, D2, D6 y C1-C5 · ninguno
- 2026-11-10 · Adrian · núcleo implementado en feat/core-implementacion: contratos, scenarios (calibración de Álvaro), game (15 rondas, D2-B, niveles del cuestionario), portfolio (D5/D6), API completa e inference PROVISIONAL en la carpeta de Datos; 116 tests + 1 xfail (Rock 2008) · Amanda sustituye la inference; Álvaro revisa TODOs de forma de episodios, umbral de pánico y Ahorro · D5 propone carteras conservadoras incluso a quien aguanta: decidir umbral y episode_prob
- 2026-11-11 · Adrian · fusionadas en main las ramas de Álvaro (TODOs, mini-prueba) y de Pedribel (portal, revelación, Vega); make run-api carga .env; make setup-web/run-web/test-web, frontend en la CI y README final; prueba desde ZIP limpio en verde (125 tests backend, 13 frontend, build) · etiqueta v1.0-submission y envío · falta V1-V2 de Datos (T0)
- 2026-11-11 · Adrian · auditoría de lógica con 288 partidas simuladas; D5 cambiada a "la cartera de más riesgo que eres capaz de mantener" (antes proponía Clásica/Pop a quien aguantaba todo); Ahorro como monetario con su rentabilidad publicada; nivel 0 juega con Clásica; tiempo por decisión 30 s · avisar al equipo del cambio de D5 · falta V1-V2 de Datos
## Frontend y experiencia
