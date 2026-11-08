# Requisitos

Prioridad: **T0** = MVP obligatorio · **T1** = debería · **T2** = extra. Estado: propuesto / aceptado / en curso / hecho / descartado.
Para añadir uno: nueva fila con el siguiente ID y una issue en GitHub con el mismo ID.

## Funcionales
| ID | Requisito | Criterio de aceptación | Tier | Dueño | Estado |
|---|---|---|---|---|---|
| RF-01 | Generar escenarios de mercado sintéticos con semilla | Misma semilla → misma serie; volatilidad y caída máxima dentro del rango calibrado | T0 | | propuesto |
| RF-02 | Jugar una partida de 3 fases (caída, sueldo, recuperación) | Una partida de 12-16 rondas termina sin errores en < 6 min | T0 | | propuesto |
| RF-03 | Registrar cada decisión con patrimonio, sueldo, acción y tiempo de respuesta | Todas las rondas quedan registradas según el contrato `Decision` | T0 | | propuesto |
| RF-04 | Estimar el perfil (λ, θ, η) con intervalo creíble al 90% | Cada parámetro tiene media e intervalo; los pesos del posterior suman 1 | T0 | | propuesto |
| RF-05 | Elegir la siguiente situación de forma adaptativa | El intervalo medio es más estrecho que con secuencia fija, mismo nº de rondas | T1 | | propuesto |
| RF-06 | Proponer 1 cartera entre ≤ 6 candidatas del catálogo | La propuesta incluye métricas simuladas y justificación numérica reproducible | T0 | | propuesto |
| RF-07 | Panel del banco: trayectoria, perfil con incertidumbre, comparación de carteras | Los tres gráficos se ven con datos de una partida real | T0 | | propuesto |
| RF-08 | Recoger cómo se siente el jugador en texto libre | Se guarda por ronda y se muestra junto a la decisión | T1 | | propuesto |
| RF-09 | Explicación del perfil en lenguaje claro | Generada con Claude o plantilla; no contiene cifras distintas de las calculadas | T1 | | propuesto |
| RF-10 | Comparar el perfil del juego con un cuestionario simulado | El panel muestra en qué difieren | T1 | | propuesto |
| RF-11 | Voz (ElevenLabs) para narrar y para responder | Funciona tras `ENABLE_VOICE=true`; la demo funciona sin ella | T2 | | propuesto |

## No funcionales
| ID | Requisito | Criterio | Tier | Dueño | Estado |
|---|---|---|---|---|---|
| RNF-01 | Reproducibilidad | Toda aleatoriedad con semilla; `make validate` da el mismo informe | T0 | | propuesto |
| RNF-02 | Validación matemática | V1 y V2 superan los umbrales de D7 | T0 | | propuesto |
| RNF-03 | Sin datos personales ni secretos en el repo | Revisión antes de la etiqueta de entrega | T0 | | propuesto |
| RNF-04 | Demo sin dependencia de red | Textos cacheados; funciona con la API de Claude caída | T0 | | propuesto |
| RNF-05 | Accesibilidad | Paleta apta para daltonismo, contraste suficiente, navegable con teclado | T1 | | propuesto |
| RNF-06 | Coste de IA controlado | Tope `LLM_BUDGET_EUR`; gasto registrado | T0 | | propuesto |
| RNF-07 | Instalación desde el ZIP | `make setup && make test` en máquina limpia | T0 | | propuesto |
