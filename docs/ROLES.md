# Roles y dueños

Cada carpeta tiene un dueño: revisa sus PRs y decide en caso de duda. Rellenad nombre y GitHub.

| Rol | Persona | GitHub | Dueño de | Responsable de |
|---|---|---|---|---|
| Producto, negocio y pitch (ing. industrial) | Álvaro | aal2k | `pitch/`, contenido de `docs/SPEC.md` secciones 1-2 (lo edita Núcleo, ver SPEC §8), `data/study/` (protocolo) | Caso de negocio, diseño y calibración de escenarios, mini-prueba y consentimiento, normativa con fuentes oficiales, PDF y pitch |
| Modelo y validación (datos) | Amanda | amandehision16 | `backend/behaviorlab/inference/`, `validation/`, `reports/` | Modelo de elección, posterior, preguntas adaptativas, V1-V4, métricas del panel |
| Núcleo y API (informática 1) | Adrian | villanuevadrian | `contracts/`, `scenarios/`, `game/`, `portfolio/` (criterio y simulación con Datos), `backend/api/`, `.github/`, `Makefile`, `pyproject.toml` | Arquitectura, contratos, integración, CI, etiqueta y ZIP de entrega |
| Frontend y experiencia (informática 2) | Pedribel | pedribelp | `frontend/`, `text/` | Juego, panel y visualizaciones, accesibilidad, textos con Claude, voz (Tier 2) |

## Reglas
- Tocar fuera de tu carpeta → avisar al dueño antes.
- `contracts/` se congela el domingo por la noche; después, cambios solo con PR y acuerdo de los cuatro.
- Cada persona trabaja con su cuenta de Claude Code sobre su rama; `CLAUDE.md` es igual para todos.
- Bloqueo de más de 30 min → decirlo en el chat.
- Sincronización: 15 min al empezar y al acabar cada día.
