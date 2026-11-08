# Diseño y calibración de escenarios (RF-01, D4)

Diseño: Producto (Álvaro). Implementación y dueño de la carpeta: Núcleo (Adrian).
Datos: `data/catalog/myinvestor_carteras_2026-11-08.json`.
Estado: **propuesta para la reunión del domingo**. Alineada con `docs/DUDAS.md` (D2-B, D3, C1, C3) y con `docs/CUESTIONARIO.md` (D6). Ningún número lo calcula un LLM.

## 0. Para qué es la partida
BehaviorLab se vende al banco (cliente de la demo: MyInvestor) como parte de su **onboarding**: el test de idoneidad y la partida forman un solo recorrido gamificado (ver `docs/CUESTIONARIO.md`). La partida dura unos 4 minutos y se juega una vez. El objetivo es quitar barrera de entrada y que la cartera propuesta sea una que el cliente aguante de verdad.

Por eso hay **un solo tipo de partida** y está centrada en **caídas**: es donde más se aprende del perfil (aversión a pérdidas λ y caída a la que vende θ). La subida de sueldo mide η. Como se juega una sola vez, el riesgo de que el jugador "aprenda el truco" es bajo.

## 1. Modelo en una frase
Dos índices sintéticos con semilla, renta variable `RV` y renta fija `RF`. La cartera del jugador es la mezcla con los pesos de su cartera del catálogo:

`valor_t = w_RV · RV_t + (1 − w_RV) · RF_t` (pesos constantes, como la simulación del catálogo).

## 2. Parámetros (ruido mensual)
| Parámetro | Valor | Nota |
|---|---|---|
| Volatilidad anual RV | 12,5 % | ajustada al catálogo |
| Volatilidad anual RF | 7,5 % | alta porque 2022 domina la ventana |
| Correlación RV–RF | 0,1 (0,45 en el episodio `inflacion`) | en crisis clásicas los bonos suben |
| Rentabilidad esperada anual RV / RF | 6 % / 2,5 % | prudente |
| Paso | 1 ronda = 1 mes | |

Ajuste (volatilidad modelo / catálogo): Clásica 7,4/7,1 · Pop 8,0/7,8 · Indie 9,2/8,9 · Rock 10,6/10,1 · Metal 12,5/11,4.

**Control con datos reales:** con RV −37 % y RF +1 % (año 2008) el modelo da Clásica −3,9 · Pop −13,8 · Indie −21,8 · Rock −28,6; MyInvestor publica −3,7 · −13,6 · −21,4 · −26,9.

## 3. Por qué las caídas no salen de la ventana de 5 años
La ventana 2021-2026 no tiene crash de bolsa: su peor caída es 2022 y es casi igual en todas las carteras (−14 % a −19 %). Calibrar con eso haría parecer igual de segura una cartera 100 % bolsa que una 13 %. Por eso la **forma y profundidad de las caídas se imponen por episodio** (sección 4) y la volatilidad solo pone el ruido.

## 4. Episodios de caída (sin nombre ni fecha en la interfaz)
| id | Inspirado en | Caída RV | RF en el tramo | Ritmo | Recuperación |
|---|---|---|---|---|---|
| `susto` | 2018 | −20 % | +1 % | 3 meses | rápida |
| `goteo` | caída lenta | −15 % | 0 % | lenta y constante | lenta |
| `rebote` | 2020 | −34 % | −2 % | muy rápida | fuerte |
| `crisis_larga` | 2008 | −50 % | +2 % | larga, con falsos rebotes | muy lenta |
| `inflacion` | 2022 | −16 % | −17 % | media | parcial |

Caída resultante en cada cartera (antes de ruido):

| Episodio | Clásica | Pop | Indie | Rock | Metal |
|---|---|---|---|---|---|
| susto | −1,7 % | −7,2 % | −11,6 % | −15,4 % | −20 % |
| goteo | −2,0 % | −5,9 % | −9,0 % | −11,7 % | −15 % |
| rebote | −6,2 % | −14,5 % | −21,2 % | −27,0 % | −34 % |
| crisis_larga | −4,8 % | −18,3 % | −29,2 % | −38,6 % | −50 % |
| inflacion | −16,9 % | −16,6 % | −16,4 % | −16,2 % | −16 % |

Las carteras conservadoras casi no caen en crisis de bolsa. Para medir θ en ellas se usa `inflacion` (bolsa y bonos caen a la vez), que es además el riesgo que de verdad han vivido sus clientes.

## 5. Estructura de la partida (15 rondas, 5 por fase, D3)
| Fase | Rondas | Mercado | Decisión (D2, opción B) | Mide |
|---|---|---|---|---|
| A. Caída | 1–5 | Ronda 1: la cartera viene de subir (fija un punto de referencia). Rondas 2–5: primer tramo de la caída | vender todo / mantener / aportar 10 % del sueldo | λ, θ |
| B. Sueldo | 6–10 | El mercado sigue en el valle o hace un segundo tramo de caída | rondas 6, 8, 10: qué parte de la subida se invierte (0 / 50 / 100 %); rondas 7, 9: igual que la fase A | η, θ más profundo |
| C. Recuperación | 11–15 | Rebote parcial o completo según el episodio; puede haber un falso rebote | igual que la fase A | confirma θ; recompra tardía |

Al terminar, el jugador ve qué habría pasado si hubiera mantenido, para que el onboarding acabe en aprendizaje y no en miedo.

## 6. Situaciones y elección adaptativa (C1)
`Scenario` trae un **conjunto de situaciones por fase** en lugar de una trayectoria cerrada. Cada situación se define por la **caída de la cartera del jugador** (en euros y %), no de la bolsa:

| Fase | Situaciones disponibles |
|---|---|
| A | caída de la cartera −5 %, −10 %, −15 %, −20 %, −30 % |
| B | segundo tramo −0 %, −5 %, −10 %; subida de sueldo +100 €, +200 €, +300 €/mes |
| C | recupera 50 %, 100 %, o falso rebote (+5 % y vuelve a caer) |

Para conseguir la caída objetivo `c` en una cartera con peso `w_RV`: `caida_RV = (c − (1 − w_RV) · mov_RF) / w_RV`. Si sale por debajo de −55 % (imposible de forma realista, pasa en Clásica y Pop), se usa el episodio `inflacion`.

- **T0:** secuencia fija con semilla (episodio al azar entre los de la sección 4).
- **T1:** `game` pide la siguiente a `inference.next_situation(posterior, pool)` (Datos), que elige la que más reduce la incertidumbre.

## 7. Valores de partida
Salen de las respuestas del cuestionario (`docs/CUESTIONARIO.md`):
- Capital: el importe que el cliente indica (S8); por defecto 10.000 €.
- Sueldo: el punto medio del rango de ingresos (S1); por defecto 1.800 €/mes.
- Cartera simulada: la del nivel `min(capacidad, horizonte)`.
- **Nivel final (D6) = mínimo de (nivel revelado en la partida, nivel de capacidad, nivel por horizonte).** Lo declarado nunca sube el riesgo.

## 8. Reglas de realismo (para que el ego no distorsione las respuestas)
1. Euros, no porcentajes; la pérdida también en **meses de sueldo**.
2. Sin puntuación ni ranking durante la partida.
3. Botones neutros y en orden aleatorio cada ronda.
4. 15 s por decisión; si no decide, cuenta como "mantener" y se registra el tiempo.
5. Episodios sin nombre ni fecha: no se puede reconocer "2008" y saber que acaba bien.
6. Una situación de control repetida con distinto envoltorio; la discrepancia alimenta la métrica de coherencia.

## 9. Lo que Núcleo necesita (sin tocar `contracts/` hasta acordarlo)
- `CatalogPortfolio` (C3): se rellena desde el JSON del catálogo; `equity_pct` da `w_RV`.
- `Scenario`: `seed`, `episode_id`, `rv_path[]`, `rf_path[]`, `salary_path[]`, `phase_by_round[]`, `situations_by_phase`.
- Función pura `portfolio_path(scenario, equity_pct) -> list[float]`.
- Tests propuestos: misma semilla → misma trayectoria; caída de pico a valle dentro de ±2 pp del objetivo; el control 2008 reproduce la sección 2 con ±1,5 pp.

## 10. Límites que se dicen en el pitch
- Escenarios sintéticos: pueden infraestimar colas extremas.
- Indie y Metal calibrados con fondos sustitutos del mismo índice.
- Rentabilidades del catálogo sin comisión de gestión ni custodia (0,30 % anual entre ambas).
- Rentabilidad pasada no garantiza rentabilidad futura. El juego es el formato del test de idoneidad: se preguntan todos los datos que exige la norma. No es asesoramiento.
