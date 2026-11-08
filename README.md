# BehaviorLab (nombre provisional)

Hack Finance 2026 · Madrid Engineering Week · BEST UC3M

**Qué es:** un juego corto que mide cómo reaccionan los jóvenes inversores ante caídas de mercado y subidas de sueldo. Con esa conducta estimamos un perfil con su incertidumbre y proponemos la cartera del catálogo que la persona sea capaz de mantener. Producto B2B; cliente de la demo: MyInvestor. Complementa el test de idoneidad, no lo sustituye. **No es asesoramiento financiero.**

## Estado
Esqueleto. Aún no hay código. Empieza por aquí:
1. `docs/SPEC.md` — producto, MVP por tiers, plan hasta el miércoles.
2. `docs/ROLES.md` — elegid rol y dueños.
3. `docs/REQUIREMENTS.md` — requisitos con ID, prioridad y dueño.
4. `docs/DECISIONS.md` — decisiones D1-D9 a cerrar hoy (fuente de verdad de las decisiones).
5. `docs/DUDAS.md` — hoja de dudas con recomendaciones para la reunión del domingo.
6. `CLAUDE.md` — reglas que Claude Code carga automáticamente.

## Estructura
```
contracts/              modelos compartidos entre módulos
backend/behaviorlab/    núcleo: scenarios, game, inference, portfolio, validation, text
backend/api/            FastAPI (solo orquesta)
frontend/               juego + panel del banco
data/                   catalog (snapshots), study (agregados), cache (textos)
tests/                  unit, property, integration
reports/                salida de validación
pitch/                  PDF, presentación, guion
docs/                   spec, roles, requisitos, decisiones, estado
```

## Instalación, configuración, ejecución y tests
Requisitos: **Python 3.12**, `make` y `git`. Todo se instala en `.venv/` dentro del repo (nada global).

```bash
git clone https://github.com/villanuevadrian/hack-finance.git
cd hack-finance
cp .env.example .env        # rellenad vuestra clave; .env nunca se sube
make setup                  # crea .venv e instala dependencias
make test                   # tests
make lint                   # estilo (ruff)
make run-api                # API en http://127.0.0.1:8000 (docs en /docs)
```

Si `python3.12` no está en el PATH: `make setup PYTHON=/ruta/a/python3.12`. En Windows, usad WSL.
Pendientes: `make run-web` (tras D8) y `make validate` (lo implementa Datos).

## Equipo
Ver `docs/ROLES.md`.
