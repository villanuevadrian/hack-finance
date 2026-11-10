# Decisiones

Fuente de verdad de las decisiones (`docs/SPEC.md` §3 es solo un resumen). Una fila por decisión. Cerrad D1-D14 el domingo por la noche; las dudas y recomendaciones están en `docs/DUDAS.md`.
Si una decisión necesita explicación, añadid debajo de la tabla una sección `### Dn` con: contexto → opciones → decisión → consecuencia.

| ID | Pregunta | Propuesta inicial | Decisión final | Fecha | Quién |
|---|---|---|---|---|---|
| D1 | ¿Qué variables medimos? | λ aversión a la pérdida, θ caída a la que vende, η fracción del aumento de sueldo que invierte | λ, θ, η. Ruido τ fijo en T0 (DUDAS.md). Lo confirma Datos | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D2 | ¿Qué acciones hay por ronda? | Vender todo / mantener / aportar 10% del sueldo | Opción B: rondas de mercado = vender todo / mantener / aportar 10 % del sueldo; rondas de subida de sueldo = invertir 0 / 50 / 100 % del aumento | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D3 | ¿Cuántas rondas? | 12-16 (≈ 5 min) | 15 rondas, 5 por fase (constante de configuración) | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D4 | ¿Escenarios reales o sintéticos? | Sintéticos calibrados, sin nombre | Partida única centrada en caídas, sintética con semilla, calibrada con el snapshot del catálogo (`scenarios/CALIBRACION.md`, PR #4) | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D5 | ¿Cómo elegimos cartera? | Máx. percentil 10 de riqueza final con P(venta en pánico) ≤ umbral | Máx. P10 de riqueza final con P(venta en pánico) ≤ umbral; umbral lo fijan Producto y Datos | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D6 | ¿Qué recibe el banco? | `Profile` + `PortfolioProposal` + regla si juego y test discrepan | `Profile` + `PortfolioProposal` + informe de idoneidad. Nivel final = mínimo de (nivel revelado en la partida, capacidad de asumir pérdidas, horizonte). Lo declarado nunca sube el riesgo | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D7 | ¿Umbrales de éxito de V1/V2? | Por definir con datos | Lo decide Datos (Amanda) con datos | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D8 | ¿Stack de frontend? | React + Vite, plan B Streamlit | Lo decide Frontend (Pedribel) | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D9 | ¿Nombre del producto? | BehaviorLab (provisional) | BehaviorLab | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D10 | ¿Cómo entra el bono de bienvenida (20-30 €) en el juego? | Marco narrativo; al terminar, el bono se invierte en la cartera propuesta; sin pago según el resultado (ver `DUDAS.md`) | Opción A: marco narrativo; al terminar, el bono se invierte en la cartera propuesta; sin pago según resultado. Importe real por confirmar (P6) | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D11 | ¿"Crea tu personaje" al inicio? | Sí, como cuestionario declarativo camuflado (4-5 preguntas en rangos); contrato nuevo `Character` (ver `DUDAS.md`) | Opción B: "Crea tu yo inversor". El avatar es el cliente hoy, no un personaje inventado, y recoge el test de idoneidad completo con respuestas cerradas (`docs/CUESTIONARIO.md`, PR #4) | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D12 | ¿Cuánto "videojuego"? | Estética de juego (avatar, línea de vida, titulares, animaciones) sin motor de juego; se decide junto a D8 (ver `DUDAS.md`) | Estética de juego sin motor de juego | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D13 | ¿Complemento del test o test gamificado? | Complemento del test de idoneidad | El juego **es el formato** del test de idoneidad: se preguntan todos los datos que exige la norma y la partida añade la tolerancia revelada. No lo sustituye ni es asesoramiento | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |
| D14 | ¿Modelo de negocio? | B2B a bancos | B2B para el **onboarding** de clientes nuevos; cliente de la demo y primer objetivo: MyInvestor | 2026-11-09 | Álvaro (propuesta Producto, pendiente de OK) |

### D6
Contexto: si el test va dentro del juego, ya no tiene sentido "test como techo". Decisión: tres niveles de 0 a 5 (revelado en la partida, capacidad por situación financiera, horizonte con los plazos mínimos del catálogo) y se toma el mínimo. Consecuencia: `Profile` debe llevar los tres niveles y cuál limita, para el informe de idoneidad.

### D11
Contexto: la propuesta inicial era un personaje inventado de 4-5 preguntas. Opciones: A) personaje inventado; B) avatar = el cliente, cuestionario completo; C) corto en la demo y completo en el pitch. Decisión: **B**. Consecuencias: el contrato pasa a ser `OnboardingAnswers` (o `Character` con todas las respuestas de `CUESTIONARIO.md`); la comparación declarado frente a revelado sale de O4 y O3; en la mini-prueba los datos financieros son reales, así que el protocolo exige rangos, IDs anónimos, nada identificable guardado y solo resultados agregados (RNF-03).

### D13
Consecuencia: los textos de la UI y el README dicen "evaluación de idoneidad en formato de juego", no "complemento". Fuentes legales pendientes en P4.
