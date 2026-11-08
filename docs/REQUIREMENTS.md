# Requisitos

Prioridad: **T0** = MVP obligatorio · **T1** = debería · **T2** = extra. Estado: propuesto / aceptado / en curso / hecho / descartado.
Para añadir uno: nueva fila con el siguiente ID y una issue en GitHub con el mismo ID.
"Depende de" lista requisitos (RF/RNF), decisiones (D, en `DECISIONS.md`) y dudas abiertas (C, T, en `DUDAS.md`) que tienen que estar listas antes.

## Funcionales
| ID | Requisito | Criterio de aceptación | Tier | Depende de | Dueño | Estado |
|---|---|---|---|---|---|---|
| RF-01 | Generar escenarios de mercado sintéticos con semilla | Misma semilla → misma serie; volatilidad y caída máxima dentro del rango calibrado | T0 | D4, snapshot del catálogo (C3) | | propuesto |
| RF-02 | Jugar una partida de 3 fases (caída, sueldo, recuperación) | Una partida de 12-16 rondas termina sin errores en < 6 min | T0 | RF-01, D2, D3, C1 | | propuesto |
| RF-03 | Registrar cada decisión con patrimonio, sueldo, acción y tiempo de respuesta | Todas las rondas quedan registradas según el contrato `Decision` | T0 | RF-02, D2 | | propuesto |
| RF-04 | Estimar el perfil (λ, θ, η) con intervalo creíble al 90% | Cada parámetro tiene media e intervalo; los pesos del posterior suman 1 | T0 | RF-03, D1, C5 | | propuesto |
| RF-05 | Elegir la siguiente situación de forma adaptativa | El intervalo medio es más estrecho que con secuencia fija, mismo nº de rondas | T1 | RF-04, C1 | | propuesto |
| RF-06 | Proponer 1 cartera entre ≤ 6 candidatas del catálogo | La propuesta incluye métricas simuladas y justificación numérica reproducible | T0 | RF-04, D5, D6, C3 | | propuesto |
| RF-07 | Panel del banco: trayectoria, perfil con incertidumbre, comparación de carteras | Los tres gráficos se ven con datos de una partida real | T0 | RF-03, RF-04, RF-06, D8, C4 | | propuesto |
| RF-08 | Recoger cómo se siente el jugador en texto libre | Se guarda por ronda y se muestra junto a la decisión | T1 | RF-03, C2 | | propuesto |
| RF-09 | Explicación del perfil en lenguaje claro | Generada con Claude o plantilla; no contiene cifras distintas de las calculadas | T1 | RF-04, RF-06, RNF-04, RNF-06, T6 | | propuesto |
| RF-10 | Comparar en el panel el perfil del juego con un cuestionario simulado | El panel muestra en qué difieren. (El cuestionario simulado como baseline de V2 es T0: ver RNF-02) | T1 | RF-04, RF-07, RNF-02 | | propuesto |
| RF-11 | Voz (ElevenLabs) para narrar y para responder | Funciona tras `ENABLE_VOICE=true`; la demo funciona sin ella | T2 | RF-02, RF-09 | | propuesto |
| RF-12 | Lectura auxiliar con Claude del texto libre | Resume el texto libre sin producir ni corregir cifras; con fallback si falla la API | T1 | RF-08, RNF-04, RNF-06 | | propuesto |
| RF-13 | Titulares de noticias generados con Claude por escenario | Cacheados en `data/cache/`; la demo funciona con titulares de plantilla | T2 | RF-01, RNF-04, RNF-06 | | propuesto |
| RF-14 | Fase "mi sueldo real" personalizable | El jugador introduce su sueldo y la fase de sueldo lo usa; no se guarda en el repo | T2 | RF-02, RNF-03 | | propuesto |

## No funcionales
| ID | Requisito | Criterio | Tier | Depende de | Dueño | Estado |
|---|---|---|---|---|---|---|
| RNF-01 | Reproducibilidad | Toda aleatoriedad con semilla; `make validate` da el mismo informe | T0 | — (transversal) | | propuesto |
| RNF-02 | Validación matemática (V1 recuperación, V2 predicción frente a un cuestionario simulado de 5 preguntas) | V1 y V2 superan los umbrales de D7 | T0 | RF-04, D7 | | propuesto |
| RNF-03 | Sin datos personales ni secretos en el repo | Revisión antes de la etiqueta de entrega | T0 | — | | propuesto |
| RNF-04 | Demo sin dependencia de red | Textos cacheados; funciona con la API de Claude caída | T0 | T6 | | propuesto |
| RNF-05 | Accesibilidad | Paleta apta para daltonismo, contraste suficiente, navegable con teclado | T1 | RF-07 | | propuesto |
| RNF-06 | Coste de IA controlado | Tope `LLM_BUDGET_EUR`; gasto registrado | T0 | T5, P1 | | propuesto |
| RNF-07 | Instalación desde el ZIP | `make setup && make test` en máquina limpia | T0 | T1, T2, T3 | | propuesto |
| RNF-08 | Invariantes numéricos (V4) | Pesos suman 1, la simulación conserva capital sin rentabilidad, coincide con una implementación de referencia en casos pequeños | T0 | RF-04, RF-06 | | propuesto |
| RNF-09 | Fiabilidad test-retest (V3) con la mini-prueba real | Protocolo y consentimiento aprobados; solo resultados agregados y anónimos en `data/study/` | T1 | RF-02, RF-04, RNF-03 | | propuesto |
| RNF-10 | Entregables | README en español con instalación, configuración, ejecución y tests; PDF de una página; etiqueta `v1.0-submission` | T0 | RNF-07 | | propuesto |
