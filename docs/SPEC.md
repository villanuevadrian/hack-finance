# SPEC — BehaviorLab

Estado: borrador del domingo 8-nov-2026. Todo lo marcado **(decidir)** se cierra antes del domingo por la noche. Fuente de verdad: este archivo en el repo.

## 1. Premisa
Los bancos obtienen el perfil de riesgo del cliente joven con un cuestionario declarativo. Lo que la gente dice que hará y lo que hace cuando el mercado cae no coinciden. BehaviorLab mide la conducta en un juego corto, estima parámetros con su incertidumbre y elige, entre las carteras del catálogo, la que esa persona sea capaz de mantener. El cliente de la demo es MyInvestor.

Hipótesis a defender, no hechos: (a) el juego aporta información que el test no tiene; (b) con pocas rondas adaptativas se estima con intervalos útiles; (c) elegir cartera según la conducta reduce la probabilidad de venta en pánico. Hay que demostrarlas con las pruebas de la sección 5.

## 2. Alcance por tiers
**Tier 0 — MVP (sin esto no se entrega)**
- Generador de escenarios sintéticos con semilla.
- Juego de 3 fases (caída, subida de sueldo, recuperación) con 3 acciones por ronda.
- Posterior en rejilla sobre 3 parámetros + ficha de perfil con intervalos.
- Selección de 1 cartera entre ≤ 6 candidatas del catálogo (snapshot).
- Panel con: trayectoria y decisiones, perfil con barras de incertidumbre, distribución de resultados por cartera.
- Validación V1 y V2 (sección 5) con informe reproducible.
- README, PDF de una página, repo limpio.

**Tier 1 — debería**
- Preguntas adaptativas por ganancia de información.
- Texto libre de "cómo me siento" y lectura auxiliar con Claude.
- Fiabilidad test-retest con la mini-prueba real.
- Comparación explícita con un baseline de cuestionario.

**Tier 2 — extras (solo con Tier 0 y 1 cerrados el miércoles al mediodía)**
- Voz con ElevenLabs (STT/TTS), tras feature flag.
- Titulares generados con Claude por escenario.
- Fase de "mi sueldo real" personalizable.

**Fuera de alcance:** fiscalidad, acciones sueltas, derivados, asesoramiento regulado, detección de emociones por voz.

## 3. Decisiones por cerrar hoy
Resumen. La fuente de verdad de las decisiones es `docs/DECISIONS.md`; las dudas abiertas, con recomendaciones, están en `docs/DUDAS.md`.

| ID | Decisión | Propuesta | Estado |
|---|---|---|---|
| D1 | Variables a medir | λ (aversión a la pérdida), θ (caída a la que se vende), η (fracción del aumento de sueldo que se invierte) | decidir |
| D2 | Acciones por ronda | vender todo / mantener / aportar el 10% del sueldo | decidir |
| D3 | Rondas por partida | 12 a 16 (≈ 5 min) | decidir |
| D4 | Escenarios | Sintéticos calibrados con volatilidad y caídas del catálogo; sin nombre | decidir |
| D5 | Criterio de cartera | Maximizar el percentil 10 de riqueza final sujeto a P(venta en pánico) ≤ umbral | decidir |
| D6 | Formato de salida al banco | `Profile` + `PortfolioProposal` (contratos) + regla cuando juego y test discrepan | decidir |
| D7 | Umbrales de éxito de validación (criterios en la sección 5) | por definir con datos | decidir |
| D8 | Stack frontend | React/Vite o Streamlit | decidir |
| D9 | Nombre del producto | BehaviorLab (provisional) | decidir |
| D10 | Bono de bienvenida en el juego | Marco narrativo + inversión del bono en la cartera propuesta | decidir |
| D11 | Inicio "Crea tu personaje" | Cuestionario declarativo camuflado (baseline de V2 y RF-10) | decidir |
| D12 | Nivel de videojuego | Estética de juego sin motor, junto a D8 | decidir |

## 4. Arquitectura y contratos
Módulos y flujo como en `CLAUDE.md`. Contratos mínimos (pydantic) que se congelan el domingo por la noche:
- `Scenario`: semilla, serie de rentabilidades por ronda, metadatos de calibración.
- `GameState` y `Decision`: ronda, patrimonio, sueldo, acción, tiempo de respuesta.
- `Posterior`: rejilla de (λ, θ, η), pesos, resumen (media, intervalo creíble al 90%).
- `Profile`: parámetros con intervalos, nº de rondas, indicador de fiabilidad.
- `PortfolioProposal`: cartera elegida, métricas simuladas, justificación numérica, aviso legal.

API (FastAPI, solo orquesta): `POST /games`, `POST /games/{id}/decision`, `GET /games/{id}/profile`, `GET /games/{id}/proposal`.

## 5. Modelo y validación (resumen para el equipo de datos)
**Elección:** probabilidad softmax sobre la utilidad de cada acción, con utilidad tipo teoría prospectiva simplificada y ruido τ. **Inferencia:** posterior discretizado en rejilla (numpy), sin MCMC: simple, explicable y rápido. **Pregunta adaptativa:** elegir la siguiente situación que maximiza la información mutua esperada entre la acción y los parámetros. **Cartera:** muestrear parámetros del posterior, simular N trayectorias por candidata aplicando esa política y comparar riqueza final y probabilidad de venta en pánico. Las trayectorias sintéticas pueden subestimar colas: valorar remuestreo de rentabilidades históricas del catálogo (decidir).

Validaciones (informe en `reports/validation.md`):
- **V1 Recuperación de parámetros:** jugadores simulados con parámetros conocidos. Criterio: error medio por debajo de un umbral y cobertura del intervalo al 90% cercana al 90% (umbrales en D7).
- **V2 Predicción:** con las primeras k rondas se predicen las siguientes; se compara la log-verosimilitud frente a un baseline que usa solo un cuestionario simulado de 5 preguntas.
- **V3 Test-retest** con la mini-prueba real (Tier 1).
- **V4 Numéricos:** pesos suman 1, simulación conserva capital en ausencia de rentabilidad, comparación con implementación de referencia en casos pequeños.

Mini-prueba real: 20-30 compañeros el martes por la tarde, con consentimiento informado, ID anónimo, sin datos personales. Solo se versionan resultados agregados.

## 6. Plan hasta la entrega
| Día | Objetivo | Salida verificable |
|---|---|---|
| **Dom 8 (tarde/noche)** | Cerrar D1-D8. Crear repo, `CLAUDE.md`, scaffold, contratos v0. Que las 4 personas puedan correr `make test`. Preguntar a la organización por acceso oficial a datos y condiciones del MCP. | `make test` en verde en 4 máquinas; contratos congelados |
| **Lun 9** | Corte vertical: escenarios + juego mínimo + posterior + ficha de perfil. Snapshots del catálogo. Protocolo y consentimiento de la mini-prueba. Esqueleto del panel. | Una partida completa termina en un perfil con intervalos |
| **Mar 10** | Cartera, panel completo, V1-V2, preguntas adaptativas si hay tiempo, README borrador. **Tarde: mini-prueba real.** | Demo de punta a punta + `reports/validation.md` |
| **Mié 11** | **Congelación de funcionalidades a las 14:00.** Solo bugs, README final, PDF, presentación, prueba desde cero con el ZIP, vídeo de respaldo. Etiqueta `v1.0-submission`. **Enviar a las 20:00.** | Entrega enviada con margen |
| **Jue 12** | Solo ensayo del pitch. Prohibido cambiar código: la demo debe coincidir con lo entregado. | — |

## 7. Reparto propuesto (reasignad como queráis)
- **Ingeniería industrial:** caso de negocio, diseño de escenarios y calibración, protocolo y consentimiento de la mini-prueba, revisión normativa y de datos con fuentes oficiales, PDF de una página, liderazgo del pitch.
- **Datos:** modelo de elección, inferencia, preguntas adaptativas, validación V1-V4, métricas.
- **Informática 1 (núcleo y API):** contratos, estructura del repo, escenarios, selección de cartera, API, CI y entrega.
- **Informática 2 (frontend):** juego, panel y visualizaciones, ficha de perfil, accesibilidad, extras de voz (Tier 2).

## 8. Cómo trabajamos 4 personas con 4 cuentas de Claude
- **El repo es la fuente de verdad.** Cada uno clona y ejecuta Claude Code con su cuenta. `CLAUDE.md` se carga solo para todos, así que las reglas son las mismas.
- **Una carpeta, un dueño.** Tocar solo tu área; los cambios en `contracts/` se hablan antes.
- **Ramas cortas y PRs pequeños** que se integran varias veces al día. Si una persona lanza varias sesiones de Claude en paralelo, usad un `git worktree` por sesión para que no se pisen.
- **Este documento y `docs/STATUS.md`:** el spec lo edita una persona (la de núcleo) para evitar conflictos; el resto propone cambios por PR o por el chat. `STATUS.md` es append-only: cada uno añade su línea al terminar un bloque.
- **Claude.ai Project (opcional):** sirve de copia de lectura del spec para consultar desde el chat. Los documentos del Project se reescriben enteros, no se fusionan, así que no es un sitio para editar a la vez. Comprobad si vuestras cuentas comparten el Project.
- **Presupuesto:** la clave de API vive en `.env` (no se sube) y se comparte por un canal privado. Comprobad si Claude Code en cada cuenta consume suscripción o clave de API para no gastar los 400 € sin querer, y poned tope de gasto.
- **Sincronización:** 15 minutos al empezar y al acabar el día. Un bloqueo de más de 30 minutos se dice en voz alta.

## 9. Checklist de entrega
- [ ] Repo en GitHub público o compartido, con la etiqueta `v1.0-submission`.
- [ ] Probado "Download ZIP" en una máquina limpia.
- [ ] `README.md` en español con instalación, configuración, ejecución y tests.
- [ ] PDF de una página: problema, solución, valor diferencial.
- [ ] Presentación (si se usa).
- [ ] Sin secretos, sin datos personales, sin material con copyright.
- [ ] La demo corre exactamente desde la versión entregada.
- [ ] Enviado por el formulario de BEST UC3M antes del cierre del miércoles por la noche.

## 10. Riesgos y recortes
| Riesgo | Si pasa |
|---|---|
| Frontend no listo el lunes noche | Cambiar a Streamlit |
| Preguntas adaptativas no convergen | Secuencia fija y se cuenta como trabajo futuro |
| Mini-prueba con pocos participantes | Presentar V1-V2 con simulados y la prueba real como piloto, con su tamaño muestral dicho claramente |
| Llamadas a Claude fallan o se gastan | Fallback de plantillas y textos cacheados |
| Dudas legales sin resolver | Posicionar como complemento del test y citar fuentes oficiales; no afirmar nada que no esté verificado |
| Duplicar a otros equipos | Diferenciar por la medición: adaptativa, con incertidumbre y validada |

## 11. Preguntas abiertas
- ¿Hay acceso oficial a datos de MyInvestor o al MCP para uso en aplicaciones, o solo consulta conversacional?
- ¿El presupuesto de 400 € es solo de Claude o se comparte con ElevenLabs?
- ¿Qué obligaciones normativas concretas (idoneidad, tratamiento de datos, gamificación) hay que citar? Verificar en fuentes oficiales antes del pitch.
