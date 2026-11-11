# validation/
Recuperación de parámetros (V1), predicción frente a baseline de cuestionario (V2), test-retest (V3), invariantes numéricos (V4). Genera reports/validation.md. Dueño: Datos.

**Contenido:** `battery.py` + `scripts/validate.py` (`make validate` → `reports/validation.md`): V1 recuperación de parámetros, V1b robustez con jugadores de regla fija, V2 predicción frente a un cuestionario simulado y V4 invariantes. `simulate.py` + `v1_recovery.py` (Datos): V1 con varios tipos de jugador (`reports/v1_*.txt`). V3 (test-retest con usuarios reales) es el siguiente paso.
