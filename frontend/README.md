# frontend/

Juego, ficha "Crea tu yo inversor", plan con informe de idoneidad y panel del banco. React + Vite + TypeScript
(D8). Dueño: Frontend (Informática 2). **Todas las cifras vienen de la API** (`backend/api/main.py`); aquí no se
calcula ninguna propuesta ni ningún nivel.

## Arrancar

```bash
make setup && make run-api          # backend en http://localhost:8000
make setup-web && make run-web             # http://localhost:5280 (CORS de la API acepta cualquier puerto local)
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests (vitest), incluidos los que comprueban que el cuestionario coincide con los contratos |
| `npm run build` | Comprobación de tipos y build |
| `npm run lint` | Linter (oxlint) |
| `npm run gen:api` | Regenera `src/api/generated.ts` desde `http://localhost:8000/openapi.json` tras cualquier cambio en `contracts/` |

`VITE_API_URL` cambia la dirección de la API (por defecto `http://localhost:8000`).

## Recorrido

1. **Bienvenida**: avisos y consentimiento de `docs/CUESTIONARIO.md` §3.
2. **Crea tu yo inversor** (`src/screens/Onboarding.tsx`, preguntas en `src/questionnaire.ts`): aspecto del avatar
   (solo estético) y los bloques del cuestionario con sus IDs (K1-K6, Q1-Q3, S1-S8, O1-O4) y los valores exactos de
   `OnboardingAnswers`. "Prefiero no responder" en situación financiera (se envía `null`) y "No lo sé" en los retos.
   Los retos se bloquean al responder y muestran una explicación de una línea. Si falta un dato obligatorio
   (`REQUIRED_FINANCIAL_FIELDS` del backend) no se puede jugar ("Misión en pausa"). Pantalla final "Tu ficha" en
   lenguaje llano con confirmación. La misión (O1) decide el mundo.
3. **Partida**: 15 meses en 3 niveles, con una lección de producto antes de cada nivel (`src/learning.ts`, nunca dice
   cómo reaccionar). Los botones son los de `available_actions`, en el orden que manda el backend (que los baraja cada
   ronda). 15 s por decisión: si no decide, se envía `action: null`. Texto opcional de cómo se siente (RF-08).
   Movimientos en euros y en meses de sueldo (CALIBRACION.md §8). Sin puntos ni rangos.
4. **Tu plan**: `Profile` + `PortfolioProposal` + posterior: propuesta y justificación del backend, los tres niveles y
   cuál limita, mapa de carteras del catálogo, lo declarado frente a lo revelado e **informe de idoneidad** imprimible.
5. **Panel del banco** (RF-07): trayectoria y decisiones, marginales del posterior con su intervalo, comparación de
   carteras (probabilidad de venta en pánico frente al umbral y escenarios P10, P50 y P90 en euros) y RF-10.

## Mapa del mundo y Vega


- **Mapa del mundo** (`src/screens/MapScreen.tsx`) al entrar y entre niveles: solo muestra progreso.
- **Vega**, la mentora (`src/components/Mentor.tsx`): habla solo fuera de las decisiones medidas; nunca comenta cómo
  decidió el jugador.

## Voz (ElevenLabs, T2)

Todos los textos narrables están en `src/voice/narration.json`. Los audios se generan **una vez**, con tu clave,
y se guardan en `public/audio/` para que la demo no dependa de la red:

```bash
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... npm run gen:voice
```

La voz está activada por defecto con `VITE_ENABLE_VOICE=true` en `frontend/.env.development` y `frontend/.env.production` (versionados, no son secretos; el `.gitignore` de la raíz ignora cualquier `.env`, por eso no sirve un `frontend/.env` para esto). En Vercel, la variable también puede ponerse en la configuración del proyecto. **Voz híbrida:** si falta el audio de una frase, la lee la voz del navegador, que también lee las respuestas del chat de Vega. Cada frase suena sola solo la primera vez que aparece; al volver atrás no se repite, y el botón 🔊 la reproduce cuando se quiera. Vega habla sola; en la partida la voz es solo bajo
demanda (botón 🔊), porque una narración automática cambiaría el tiempo de decisión, que forma parte de la medición.
Sin audios o sin la variable, todo funciona con subtítulos. El script no se ha podido probar contra ElevenLabs desde
el entorno de desarrollo: pruébalo con una clave real antes de la demo.

## Ayuda de Vega y tiempo de decisión

- **Pregúntame:** Vega responde dudas sobre cómo funciona el juego (`POST /assistant`, en `nucleo-backend.patch`). Con
  `ANTHROPIC_API_KEY` en el servidor usa Claude con límites estrictos (nunca da consejos de inversión ni valora
  decisiones); sin clave, responde con preguntas frecuentes fijas. No está disponible durante las rondas.
- **Tiempo por decisión:** el frontend lo lee del servidor (`GET /config`), así el reloj y el motor coinciden. Se
  cambia con `BEHAVIORLAB_DECISION_TIMEOUT_MS` (por defecto 15 000, la regla de CALIBRACION.md; cambiarlo es
  decisión de Producto).
- **Equipo del avatar:** cada bloque completado de la ficha desbloquea una pieza (capa, hombreras, escudo, botas y
  estandarte), igual para todos: nunca depende de lo que se responde.

## La revelación

Tras la partida, en "Tu plan": tu camino frente al **mismo mercado** jugado con decisiones fijas (no tocar nada,
aportar todos los meses, vender en la primera caída), con dinero final, dinero puesto y ganancia o pérdida. Las cifras
salen de `GET /games/{id}/counterfactuals`, que repite la partida con el motor real (propuesta para Núcleo en
`nucleo-backend.patch`). Si el backend no lo tiene, la sección no aparece. Se muestra solo al final, para no influir
en las decisiones medidas, y se presenta como información sobre ese mercado, no como recomendación.

## Portal de la entidad (`#banco`)

`src/screens/BankPortal.tsx`: indicadores, carteras propuestas y lista de clientes evaluados, con acceso al panel de
cada uno. Usa `GET /games` si el backend lo tiene (propuesta para Núcleo: `nucleo-backend.patch`); si no,
muestra las partidas jugadas en este navegador. **Acceso de demostración sin autenticación**: el inicio de sesión real
está pendiente.

## Mundos 3D

Three.js con React Three Fiber, cargado bajo demanda. Un mundo por objetivo (O1): La Ciudad (comprar algo), El Bosque
(jubilación), La Fortaleza (colchón) y Las Cumbres (crecer a largo plazo). **Neutralidad:** el mundo solo cambia el
aspecto; las alturas dependen solo del dinero y la tormenta solo del movimiento del mercado. Botón "Vista 2D" siempre
disponible y vista 2D automática sin WebGL.

## Pendiente

- [ ] `TODO(Frontend)`: servir los titulares desde `backend/behaviorlab/text/` (Claude + plantillas + caché); ahora
      son las plantillas deterministas de `src/headlines.ts`, sin cifras.
- [ ] `TODO(Núcleo)`: el contrato no guarda la confirmación de las respuestas atípicas ni el avatar.
- [ ] Voz con ElevenLabs (T2).
