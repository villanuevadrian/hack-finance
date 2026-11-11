# Cuestionario de idoneidad gamificado

Dueño: Producto (Álvaro). Estado: **aceptado e implementado** (`frontend/src/questionnaire.ts`, `backend/behaviorlab/game/onboarding.py`).
Base: documento de brainstorming del equipo (preguntas de conveniencia e idoneidad de la CNMV) y `backend/behaviorlab/scenarios/CALIBRACION.md`.
Fuentes legales de referencia (detalle en `pitch/FUENTES.md`): MiFID II art. 25.2 y 25.3; Reglamento Delegado (UE) 2017/565 arts. 54-56; Directrices de ESMA sobre idoneidad (2022); CNMV Guía Técnica 2/2022 sobre evaluación de la conveniencia.

## 1. Enfoque
- El onboarding es **un solo recorrido**: preguntas cerradas integradas en la narrativa + la partida de caídas.
- **El juego es el formato del test, no un sustituto.** Se preguntan todos los datos que exige la norma. Lo que añadimos es una medida de tolerancia al riesgo basada en lo que el cliente **hace**, no en lo que dice.
- Dos tipos de dato:
  - **Hechos** (situación, experiencia, objetivos): pregunta cerrada explícita. Nunca se deducen del juego.
  - **Comportamiento** (tolerancia al riesgo): lo mide la partida (λ, θ, η).
- Todas las respuestas son cerradas. En conocimientos se ofrece "No lo sé". En situación financiera, "Prefiero no responder" está disponible, pero si falta un dato obligatorio **no se puede emitir el perfil** (la norma prohíbe prestar el servicio sin información suficiente).
- Contexto de producto: las carteras de MyInvestor son gestión automatizada (robo-advisor), así que aplica la evaluación de **idoneidad** completa.

## 2. Recorrido (≈ 9 minutos)
| Paso | Pantalla | Duración |
|---|---|---|
| 0 | Bienvenida, avisos y consentimiento | 30 s |
| 1 | "Quién eres": avatar, inventario y retos (conocimientos y experiencia) | 2 min |
| 2 | "Tu base": energía, hucha, cofre y escudo (situación financiera) | 1,5 min |
| 3 | "Tu misión": misión, mapa y montaña rusa (objetivos) + pantalla "Tu ficha" | 1 min |
| 4 | Partida de 15 rondas (ver CALIBRACION.md) | 4 min |
| 5 | Resultado: perfil, cartera propuesta e informe de idoneidad | — |

## 2 bis. Gamificación de las preguntas ("crea tu yo inversor")
Diseño: Producto. Implementación visual: Frontend (Pedribel). Las preguntas, opciones y reglas de puntuación son las de las secciones 4-6; aquí solo cambia **cómo se presentan**.

**Idea:** el cliente construye un avatar que **es él hoy**, no un personaje inventado. Cada respuesta cambia algo visible del avatar o de su "base", así dar datos es rápido y tiene sentido, y la partida posterior se juega con ese mismo avatar y con su dinero real.

| Bloque | Metáfora | Pregunta que esconde | Interacción (siempre cerrada) |
|---|---|---|---|
| Quién eres | **Tu avatar**: aspecto libre (sin efecto) + ocupación | K1 estudios, K2 profesión | Tarjetas con icono (mochila, maletín, portátil…) |
| Experiencia | **Tu inventario**: objetos que ya has usado | K3 conoce, K4 ha invertido, K5 frecuencia, K6 volumen | Arrastrar cartas de producto a "conozco" / "he usado"; ruleta de 4 posiciones para frecuencia y volumen |
| Conocimientos | **Retos rápidos** de 10 s | Q1-Q3 | Tres botones + "No lo sé"; tras responder, explicación de una línea (aprende sin sentirse examinado) |
| Ingresos | **Barra de energía mensual** | S1 ingresos, S2 fuente | Deslizador que encaja en 5 tramos; la fuente es el tipo de "batería" (fija, variable, prestada) |
| Gastos fijos | **Bloques que ocupan la barra** | S5 compromisos | Deslizador de 4 tramos; los bloques de alquiler o hipoteca rellenan la barra |
| Ahorro | **Hucha que se llena cada mes** | S3 ahorro | 5 tamaños de hucha |
| Patrimonio | **Cofre** | S4 patrimonio | 5 tamaños de cofre |
| Colchón | **Escudo de meses** | S6 colchón | 4 escudos (< 1, 1-3, 3-6, > 6 meses) |
| Cuánto invertir | **Mover monedas del cofre a la cartera** | S7 peso, S8 importe | Arrastrar hasta un tramo; muestra el importe en euros |
| Objetivo | **Elige tu misión** | O1 finalidad | 4 cartas de misión |
| Plazo | **Mapa del camino** | O2 horizonte | Elegir la parada (2, 3, 4, 6, 7, más años) |
| Rentabilidad | **Elige tu montaña rusa** | O3 | 5 vagonetas con su año malo y su año bueno en euros sobre el importe de S8 |
| Tolerancia declarada | **"Antes de empezar…"** | O4 | 4 botones; se guarda para comparar con la partida |

**Reglas para que la gamificación no meta sesgos** (el objetivo es que nadie conteste "lo que queda bien"):
1. **El avatar refleja la situación de hoy.** Texto fijo: "Tu yo inversor eres tú ahora mismo, no el que te gustaría ser."
2. **Ninguna respuesta da puntos, medallas ni mejor aspecto.** Un cofre grande no es más bonito que uno pequeño; un escudo de 1 mes no se ve "roto". Todas las opciones tienen el mismo peso visual.
3. **Sin textos que sugieran la respuesta buena** ("¡los buenos inversores ahorran más!" está prohibido).
4. **Siempre visible:** "Prefiero no responder" en situación financiera y "No lo sé" en conocimientos.
5. **Barra de progreso** por bloques; se puede volver atrás y cambiar.
6. **Pantalla final "Tu ficha" en lenguaje llano:** antes de la partida, el cliente ve todos sus datos como texto normal ("Ingresos: 1.800-2.500 €/mes, nómina indefinida…") y confirma que son correctos. Así la gamificación no oculta qué está declarando y el banco tiene una confirmación explícita.
7. **Accesibilidad:** cada interacción tiene alternativa con botones normales (teclado y lector de pantalla).

## 3. Paso 0: avisos y consentimiento (texto a revisar en P4)
- "Esto es la evaluación de idoneidad que exige la normativa para darte acceso a una cartera. Tiene forma de juego, pero tus respuestas cuentan de verdad."
- "En la partida no hay respuestas buenas ni malas, ni puntuación. Decide como lo harías con tu dinero."
- "Los escenarios son simulados. Rentabilidades pasadas no garantizan rentabilidades futuras."
- "Usaremos tus respuestas para elaborar tu perfil de inversor (RGPD, art. 22: elaboración de perfiles). Puedes pedir revisión humana de tu resultado." → casilla de consentimiento obligatoria.

## 4. Paso 1: conocimientos y experiencia (conveniencia)
| ID | Pregunta | Opciones |
|---|---|---|
| K1 | Nivel de estudios terminado | Obligatoria / Bachillerato o FP / Universitario / Universitario o posgrado en economía, finanzas o similar |
| K2 | Actividad profesional | Estudiante / Por cuenta ajena / Autónomo / Profesión relacionada con finanzas / Sin actividad / Jubilado |
| K3 | Productos que conoces bien (varias) | Depósitos / Fondos monetarios o de renta fija / Fondos indexados o ETF / Acciones / Carteras automatizadas / Derivados o criptoactivos / Ninguno |
| K4 | Productos en los que has invertido en los últimos 3 años (varias) | mismas opciones |
| K5 | Con qué frecuencia operas | Nunca / 1-2 veces al año / Varias al año / Mensualmente o más |
| K6 | Volumen aproximado invertido en esos 3 años | Nada / < 3.000 € / 3.000-15.000 € / > 15.000 € |

**Comprobación de conocimientos** (preguntas, no autoevaluación, como recomienda ESMA):
| ID | Pregunta | Opciones (✔ correcta) |
|---|---|---|
| Q1 | ¿Qué es más arriesgado? | Un fondo con 1.000 empresas de todo el mundo / ✔ La acción de una sola empresa / Igual / No lo sé |
| Q2 | Si tu inversión cae un 50 %, ¿cuánto tiene que subir para volver al punto de partida? | 25 % / 50 % / ✔ 100 % / No lo sé |
| Q3 | Un fondo indexado de bolsa garantiza no perder dinero en un año. | Verdadero / ✔ Falso / No lo sé |

Nivel de conocimiento: `bajo` (0-1 aciertos y sin experiencia), `medio`, `alto` (3 aciertos y experiencia en fondos/ETF). Un nivel bajo **no excluye**: activa explicaciones antes de la partida y queda reflejado en el informe.

## 5. Paso 2: situación financiera (capacidad de asumir pérdidas)
| ID | Pregunta | Opciones |
|---|---|---|
| S1 | Ingresos netos mensuales | < 1.000 € / 1.000-1.800 € / 1.800-2.500 € / 2.500-4.000 € / > 4.000 € |
| S2 | Fuente principal de ingresos | Nómina indefinida / Nómina temporal / Autónomo / Beca o ayuda familiar / Pensión / Sin ingresos regulares |
| S3 | Ahorro mensual aproximado | 0 € / < 100 € / 100-300 € / 300-600 € / > 600 € |
| S4 | Patrimonio financiero (cuentas, fondos, acciones) | < 5.000 € / 5.000-20.000 € / 20.000-50.000 € / 50.000-150.000 € / > 150.000 € |
| S5 | Compromisos fijos mensuales (alquiler, hipoteca, préstamos) sobre tus ingresos | < 20 % / 20-35 % / 35-50 % / > 50 % |
| S6 | Si dejaras de ingresar, ¿cuántos meses podrías cubrir tus gastos sin tocar esta inversión? | < 1 / 1-3 / 3-6 / > 6 |
| S7 | Qué parte de tu patrimonio financiero vas a invertir aquí | < 25 % / 25-50 % / 50-75 % / > 75 % |
| S8 | Importe que quieres invertir | campo numérico en rangos → capital de la partida |

**Nivel de capacidad (regla propuesta, determinista):** cuatro factores de 0 a 2 puntos.
| Factor | 0 puntos | 1 punto | 2 puntos |
|---|---|---|---|
| Colchón (S6) | < 1 mes | 1-6 meses | > 6 meses |
| Compromisos (S5) | > 50 % | 20-50 % | < 20 % |
| Peso de la inversión (S7) | > 75 % | 25-75 % | < 25 % |
| Estabilidad de ingresos (S2) | Sin ingresos / beca | Temporal / autónomo | Indefinida / pensión |

Suma 0-1 → nivel 1 · 2-3 → 2 · 4-5 → 3 · 6-7 → 4 · 8 → 5. Si el colchón es < 1 mes, nivel máximo 1 y aviso: "antes de invertir, conviene tener un colchón de emergencia".

## 6. Paso 3: objetivos de inversión
| ID | Pregunta | Opciones |
|---|---|---|
| O1 | Finalidad principal | Colchón / Comprar algo en unos años (casa, coche, estudios) / Hacer crecer el ahorro a largo plazo / Jubilación |
| O2 | ¿Cuándo crees que necesitarás este dinero? | < 2 años / 2-3 / 3-4 / 4-6 / 6-7 / > 7 años |
| O3 | ¿Qué año malo y año bueno aceptarías? (rentabilidad esperada) | −2 % / +2 % · −8 % / +4 % · −15 % / +6 % · −25 % / +8 % · −35 % / +10 % |
| O4 | Si tu inversión cayera un 20 %, ¿qué crees que harías? (tolerancia **declarada**) | Vender todo / Vender una parte / Esperar / Invertir más |

**Nivel por horizonte (O2)**, con los plazos mínimos del catálogo de MyInvestor: < 2 años → 0 (Ahorro) · 2-3 → 1 (Clásica) · 3-4 → 2 (Pop) · 4-6 → 3 (Indie) · 6-7 → 4 (Rock) · > 7 → 5 (Metal). Si O1 es "colchón", nivel máximo 0.

O3 y O4 **no suben el nivel**: sirven para comparar lo **declarado** con lo **revelado** en la partida. Esa diferencia ("crees que aguantas más de lo que aguantas") es una de las métricas estrella del panel del banco.

## 7. Paso 4: partida
Ver `backend/behaviorlab/scenarios/CALIBRACION.md`. La cartera simulada es la que corresponde a `min(nivel de capacidad, nivel por horizonte)`, con el importe de S8 y el sueldo según S1. Resultado: posterior sobre λ, θ, η → **nivel revelado** (0-5).

## 8. Paso 5: nivel final e informe de idoneidad
**Nivel final = mínimo de (nivel revelado, nivel de capacidad, nivel por horizonte).** Nunca se usa lo declarado para subir riesgo.

El informe de idoneidad (lo que recibe el banco y el cliente) incluye:
- Fecha y versión del cuestionario.
- Respuestas de los pasos 1-3 y nivel de conocimiento.
- Los tres niveles y **cuál limita** el resultado, explicado en una frase.
- Tolerancia revelada con su incertidumbre, comparada con la declarada.
- Cartera propuesta y por qué es idónea (riesgo, horizonte, capacidad).
- Avisos legales y fecha recomendada de revisión del perfil (la información debe mantenerse actualizada).

## 9. Siguientes pasos
- Validar textos y fuentes en la revisión normativa (P4).
- Acordar con Datos cómo se traduce el posterior en el nivel revelado (umbrales).
- Acordar con Núcleo si las respuestas van en un nuevo contrato (`OnboardingAnswers`) sin tocar `contracts/` hasta la reunión.
