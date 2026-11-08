# Dudas para cerrar el domingo 8-nov por la noche

Hoja de trabajo para la reunión de esta noche (30-45 min, los cuatro). Cada duda trae la **recomendación de Claude** (marcada así) para que discutamos algo concreto, no en blanco. **Nada de esto está decidido.** Lo que se acuerde se copia a `docs/DECISIONS.md` (fuente de verdad de las decisiones) y esta hoja se archiva.

Orden: primero lo que bloquea los contratos (se congelan esta noche), después la tecnología y al final lo que puede esperar.

## Cómo trabajamos (propuesta)
1. **Esta noche:** repasamos esta hoja de arriba abajo y apuntamos cada decisión en `DECISIONS.md` (decisión, fecha, quién).
2. **Contratos v0:** con D1, D2, D6, D10 y D11 y las dudas C1-C5 cerradas, Núcleo deja los contratos en `contracts/` y se congelan.
3. **Scaffold:** Núcleo ejecuta `docs/BOOTSTRAP_PROMPT.md`. Criterio: `make test` en verde en las 4 máquinas antes de dormir.
4. **Desde el lunes:** cada uno coge tareas de `docs/BACKLOG.md` en su área, con ramas cortas y PRs pequeños. Sincronización de 15 min al empezar y al acabar el día.
5. **Fuente de verdad única:** el repo. El chat sirve para avisar, no para decidir: lo que se decide en el chat se apunta aquí o en `DECISIONS.md`.

## 0. Quién es quién
| # | Duda | Recomendación de Claude | Decisión |
|---|---|---|---|
| R1 | Nombre y GitHub de cada rol (`ROLES.md`, `CODEOWNERS`) | Rellenarlo hoy: sin eso CODEOWNERS no asigna revisores | |
| R2 | ¿Quién hace el scaffold y los contratos? | Núcleo (Informática 1), que es quien posee `contracts/`, `Makefile` y `.github/` | |

## 1. Bloquean los contratos (cerrar sí o sí esta noche)
| # | Duda | Opciones | Recomendación de Claude | Decisión |
|---|---|---|---|---|
| D1 | Parámetros a medir | Propuesta: λ, θ, η | Mantener λ, θ, η. El ruido τ del softmax **fijo** en T0 (no se estima), con análisis de sensibilidad en la validación; así la rejilla sigue siendo 3D | |
| D2 | Acciones por ronda | A) Propuesta: vender todo / mantener / aportar 10% del sueldo. B) Igual en las rondas de mercado, pero en las de subida de sueldo elegir **qué parte del aumento se invierte** (0 / 50 / 100%) | **B**. Con A, η (una fracción continua) solo se observa a través de una única opción fija y queda mal identificado: riesgo de que V1 falle. B mantiene 3 botones por ronda | |
| D6 | Qué recibe el banco y regla si juego y test discrepan | — | `Profile` + `PortfolioProposal`. El nivel del test de idoneidad entra como dato **opcional** y actúa como **techo**: el juego puede bajar el riesgo propuesto, nunca subirlo. Coherente con "complementa, no sustituye" | |
| D10 | Bono de bienvenida (20-30 €) dentro del juego, para que haya algo real en juego | A) **Marco narrativo**: "tienes tu bono de X €"; al terminar, el bono se invierte en la cartera propuesta. No cambia los contratos. B) **Patrimonio inicial** de la partida: `GameState` necesita un campo de dotación inicial y las aportaciones de D2 van en proporción al bono. C) **Pago según el resultado** del juego | **A**. Da realismo y un buen argumento B2B (el banco ya paga ese bono: lo convertimos en medición y en primera inversión) sin sus riesgos. B choca de escala con el sueldo simulado y con importes tan pequeños puede subestimar λ. C incentiva jugar a ganar en vez de revelar preferencias y puede entrar en normativa de juego o de promociones (**sin verificar**: P4). En la demo y en la mini-prueba no se mueve dinero real. El importe y las condiciones del bono de MyInvestor hay que confirmarlos antes de citarlos | |
| D11 | "Crea tu personaje" al inicio | A) Sí, como **cuestionario declarativo camuflado** (4-5 preguntas: edad, objetivo de ahorro, sueldo en rangos, "si tu inversión cae un 20%, ¿qué hace tu personaje?"). B) Solo estético (nombre y avatar). C) No | **A**. Es el baseline de V2 (lo que declara frente a lo que hace) y da RF-10 casi gratis, que es el momento estrella del pitch. Necesita un contrato nuevo `Character` (o `StatedProfile`) con las respuestas declaradas. Privacidad: preguntas en rangos, es un personaje y no la persona, nada identificable se guarda (RNF-03). Las preguntas concretas las proponen Industrial y Datos | |
| C1 | ¿Quién elige la siguiente situación (RF-05, adaptativo)? | `game` (Núcleo) o `inference` (Datos) | `Scenario` trae un **conjunto de situaciones** por fase (profundidad de la caída, subida de sueldo). `game` pide la siguiente a `inference.next_situation(posterior, pool)`. En T0 la secuencia es fija y en T1 adaptativa, sin cambiar el contrato. Nuevo modelo `Situation` en `contracts/` | |
| C2 | Texto libre por ronda (RF-08, T1) | — | Añadir ya `Decision.feeling_text: str \| None` (opcional) para no tener que tocar el contrato congelado después | |
| C3 | Contrato del catálogo | — | Nuevo modelo `CatalogPortfolio`: id, nombre, fecha del snapshot, fuente, y las métricas que vengan en el snapshot. Sin cifras inventadas: lo que falte, `TODO(owner)` | |
| C4 | Endpoints que faltan | — | Añadir `GET /games/{id}` (estado + historial, que el panel necesita para la trayectoria). `POST /games/{id}/decision` devuelve el `GameState` siguiente | |
| C5 | ¿Quién construye `Profile` desde `Posterior`? | `inference` o `portfolio` | `inference` (Datos): es un resumen del posterior | |

## 2. Tecnología
| # | Duda | Recomendación de Claude | Decisión |
|---|---|---|---|
| T1 | Backend | Lo de `CLAUDE.md`: Python 3.12, numpy/scipy, pydantic v2, FastAPI + uvicorn, pytest + hypothesis, ruff | |
| T2 | Entorno Python | `python3.12 -m venv .venv` + `pip install -e ".[dev]"` desde `make setup`. Sin herramientas globales; `uv` es opcional y no obligatorio (no todos lo tienen) | |
| T3 | Importación de paquetes | Un solo `pyproject.toml` que expone `contracts`, `behaviorlab` y `api` (de `backend/`) sin mover carpetas | |
| D8 | Frontend | **Depende de Informática 2.** Si ha usado React: React + Vite + TypeScript + **una sola** librería de gráficos (Plotly, no también ECharts). Si no: Streamlit desde el principio, no como plan B el lunes | |
| D12 | Nivel de "videojuego" (se decide junto a D8) | **Estética de juego sin motor de juego.** Avatar del personaje, línea de vida (edad, años que pasan), titulares, barra de patrimonio y transiciones, todo en React (o Streamlit, más limitado). Lo básico es T0; sonido, más animación y voz, T2. Un motor (Phaser, Godot, Unity) lo desaconsejo: tecnología nueva, integración con la API y exportación a web con una sola persona de frontend antes del miércoles. Además, cuanto más parece un juego, más arriesga la gente "porque es un juego" (ensucia la medición), y las animaciones antes de decidir distorsionan el tiempo de respuesta (RF-03): las consecuencias siempre en euros y visibles | |
| T4 | Node | Versión LTS actual + npm (sin pnpm/yarn, para no añadir instalaciones) | |
| T5 | Modelos de Claude | Modelo pequeño (Haiku) para titulares, mediano (Sonnet) para la explicación del perfil y grande (Opus) solo en revisiones puntuales. Comprobad los precios vigentes en la documentación antes de fijar el tope | |
| T6 | `text/` y el "núcleo puro" | La interfaz `TextGenerator` y las plantillas viven en el núcleo. La implementación con Claude y la caché son la **única excepción documentada** a la regla de no hacer red ni leer disco, y se testean con mocks | |

## 3. Pueden esperar (lunes o martes)
| # | Duda | Recomendación de Claude | Cuándo | Decisión |
|---|---|---|---|---|
| D3 | Rondas | 15 (5 por fase) como constante de configuración, no en el contrato | Lunes | |
| D4 | Escenarios | Sintéticos con semilla, calibrados con los parámetros del snapshot del catálogo. El remuestreo histórico, en T1 | Lunes | |
| D5 | Criterio de cartera | El propuesto. El umbral de P(pánico) lo fijan Industrial y Datos; el panel muestra qué cartera sale con varios umbrales (sensibilidad) | Martes | |
| D7 | Umbrales de V1/V2 | Datos propone números el lunes por la noche, tras la primera V1 con jugadores simulados | Lunes noche | |
| D9 | Nombre | El nombre comercial puede cambiar; el paquete sigue llamándose `behaviorlab` | Cuando sea | |

## 4. Preguntas que no puede resolver el equipo técnico
| # | Duda | A quién | Decisión |
|---|---|---|---|
| P1 | Presupuesto de IA: ¿400 € en total y 50 € de tope en `.env.example` por persona o por fase? | Equipo | **Resuelto (8-nov):** 100 € de API de Claude por persona. `LLM_BUDGET_EUR` es el tope de cada uno |
| P2 | Acceso oficial a datos de MyInvestor y condiciones de uso del MCP | Organización | |
| P3 | ¿Los 400 € se comparten con ElevenLabs? | Organización | **Resuelto (8-nov):** no, ElevenLabs va aparte |
| P5 | Canales del equipo | Equipo | **Resuelto (8-nov):** WhatsApp para avisos; doc y Drive compartidos aparte (fuera del repo: lo que se decida allí se copia a `DECISIONS.md`) |
| P4 | Obligaciones normativas que citar (idoneidad, datos, gamificación, y si un bono ligado al juego entra en normativa de juego o de promociones: D10), con fuente oficial | Industrial | |
| P6 | Importe y condiciones reales del bono de bienvenida de MyInvestor (D10) | Industrial | |
