# Informe de validación

Generado por `make validate` (`scripts/validate.py`). Todo con semilla: el mismo código da el mismo informe.
Estimación con el **modelo robusto de Datos** (`inference/model.py`, el que usa la API). Jugadores **simulados** sobre el motor real (no hay usuarios reales todavía). La validación V1 completa de Datos, con varios tipos de jugador, está en `reports/v1_model_k15.txt`.

## V1 · Recuperación de parámetros (300 jugadores simulados)
Parámetros verdaderos al azar en el rango de la rejilla; cada acción se elige con el modelo de elección. Un intervalo creíble del 90 % bien calibrado debe contener el valor verdadero en torno al 90 % de las veces.

| Parámetro | Error medio absoluto | Cobertura del IC 90 % | Anchura media del IC |
|---|---|---|---|
| λ aversión a la pérdida | 0.553 | 95 % | 2.267 |
| θ caída a la que vende | 0.045 | 93 % | 0.189 |
| η parte de la subida que invierte | 0.089 | 91 % | 0.393 |

Lectura: θ y η se recuperan con precisión útil. **λ apenas se identifica** con 15 rondas: su intervalo cubre casi todo el rango, así que el panel lo muestra con su incertidumbre y la recomendación no lo usa.

## V1b · Robustez: jugadores con una regla fija (20 mercados por regla)
No los genera el modelo: venden todo cuando la caída llega a un umbral y, si no, mantienen.

| Umbral real de venta | Vendieron | θ estimado medio |
|---|---|---|
| 5 % | 20/20 | 0.05 |
| 10 % | 20/20 | 0.07 |
| 15 % | 19/20 | 0.12 |
| 20 % | 13/20 | 0.22 |
| 30 % | 11/20 | 0.29 |

Si el mercado no llega al umbral, el jugador no vende y solo sabemos que aguanta más de lo que vio: θ queda censurado y la fiabilidad del perfil baja.

## V2 · Predicción frente a un cuestionario (300 jugadores simulados)
Con las rondas 1-10 se predicen las decisiones de las rondas 11-15. El cuestionario responde O4 («si cayera un 20 %…») con un umbral declarado = verdadero + 0.08 + ruido N(0, 0.08²) (supuesto de exceso de confianza, **no medido**).

| Método | Log-probabilidad predictiva media (más alto, mejor) | Acierto |
|---|---|---|
| juego | -0.299 | 87 % |
| cuestionario | -0.514 | 83 % |
| azar | -0.921 | 40 % |

## V4 · Invariantes numéricos
- Máxima desviación de la suma de pesos del posterior respecto a 1: 1.1e-16.
- Error estándar máximo de P(pánico) con 2000 trayectorias: 1.1 pp.
- Conservación del capital con rentabilidad cero, reglas de idoneidad y reproducibilidad: tests automáticos (`make test`).

## Límites
- Jugadores simulados con el mismo modelo que estima (V1) o con reglas simples (V1b); faltan usuarios reales.
- El sesgo del cuestionario en V2 es un supuesto; con usuarios reales se mediría.
- Umbrales de éxito (D7) sin cerrar: se proponen cobertura entre 85 % y 95 % y que el juego supere al cuestionario en V2.
