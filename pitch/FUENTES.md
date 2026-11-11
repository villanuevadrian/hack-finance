# Datos y fuentes del pitch

Dueño: Producto (Álvaro). Consultado el 11-nov-2026. Cada cifra del pitch, del PDF y del README sale de aquí; si no está aquí, no se dice.
Rúbrica del jurado: innovación y viabilidad 30 %, IA frontera 15 %, UX y accesibilidad 15 %, implementación 30 %, presentación 10 %.

## 1. El problema: lo que el cliente dice no predice lo que hace
| Dato | Cifra | Fuente |
|---|---|---|
| Los cuestionarios de tolerancia al riesgo explican poco del riesgo que de verdad asume el inversor | < 15 % de la variación en activos de riesgo; 13,1 % en 180.000 cuentas canadienses (Foerster et al., 2014) | Klement, *Investor Risk Profiling: An Overview*, CFA Institute Research Foundation, 2015 |
| Plantear el escenario en dinero en lugar de en % provoca más ventas | experimento con 489 personas | Klement (2015), mismo documento |
| Brecha de rentabilidad por comprar y vender a destiempo | 8,7 % anual del inversor frente a 9,9 % de los fondos (2016-2025); ≈ 12 % del retorno perdido; ≈ 3,8 billones $ | Morningstar, *Mind the Gap* 2026, vía WealthManagement.com (6-ago-2026) |
| Venta en pánico | 9 % de hogares vendió en pánico al menos una vez (2003-2015, 298.556 hogares); el 30,9 % no volvió a invertir en activos de riesgo | Elkind, Kaminski, Lo et al., *When Do Investors Freak Out?* (SSRN 3898940, 2021) |

## 2. El problema: el onboarding financiero ya pierde clientes
| Dato | Cifra | Fuente |
|---|---|---|
| Abandono de solicitudes financieras en Europa | 68 % abandonó alguna en el último año; 21 % por el tiempo que lleva y 21 % por la cantidad de información pedida (7.600 consumidores, 14 países incl. España) | Signicat, *The Battle to Onboard* (5ª ed.), vía The Fintech Times, abr-2022 |
| Conocimiento financiero básico en España | solo el 52 % de los adultos responde bien a la pregunta de diversificación del riesgo | Banco de España, Portal del Cliente Bancario, Encuesta de Competencias Financieras (entrada 30-ene-2024) |

## 3. El regulador pide justo lo que hacemos
Directrices ESMA sobre idoneidad MiFID II (ESMA35-43-3172, 2022):
- §48: la autoevaluación de la tolerancia al riesgo "should be avoided"; recomienda gráficos o cifras concretas sobre cómo reaccionaría el cliente si su cartera baja.
- §46: presentar "practical examples of situations that may occur in practice, for example by means of graphs"; preguntar qué pérdida aceptaría en un periodo.
- §44: "without unduly relying on clients' self-assessment".
- §22: el diseño "should avoid orienting investors' choices"; evitar baterías de preguntas.
- §32: aclaraciones con "tool-tips or pop-ups" → **Vega cumple este papel**.
- §12, §46, §80: capacidad de asumir pérdidas, distinta de la tolerancia → nuestro nivel final = mínimo de (revelado, capacidad, horizonte).
ESMA, revisión supervisora de 2020 (ESMA35-43-2748, 21-jul-2021): algunas entidades "unduly rely on the client's ... self-assessment" (§13) y otras no evalúan la capacidad de pérdida y usan solo la tolerancia (§14).
**Riesgo a explicar:** ESMA vigila la gamificación que empuja a operar más (Investment Executive, 29-abr-2022). Nuestra respuesta: no hay puntos, ranking ni recompensa por arriesgar; el juego solo mide y el resultado nunca sube el riesgo (D6).

## 4. Mercado y viabilidad (cliente de la demo: MyInvestor)
| Dato | Cifra | Fuente |
|---|---|---|
| Clientes de MyInvestor | más de 1 millón; 19.210 M€ de volumen; > 200.000 cuentas nuevas en 2026 (hasta agosto); saldo medio ≈ 19.000 € | Finect, 25-ago-2026 (comunicado de MyInvestor) |
| Gestión discrecional en España (incluye roboadvisors) | ≈ 167.000 M€ y ≈ 1,33 millones de contratos minoristas (mar-2026) | Inverco, vía Rankia |
| Coste actual de captar un cliente (referencia) | Plan Amigo: 25 € al invitado + 25 € a quien invita | myinvestor.es/inversion/plan-amigo (11-nov-2026) |
| Comisiones de las carteras indexadas | gestión 0,15 % + custodia 0,15 % | `data/catalog/myinvestor_carteras_2026-11-08.json` |

**Cálculos ilustrativos (hipótesis nuestras, decirlo así):**
- Ingreso: ~300.000 evaluaciones/año (ritmo de aperturas de 2026) × 2 € = ~600.000 €/año con un solo banco. 2 € es el 4 % de lo que ya paga por cliente referido (50 €).
- Valor de retener: 1 M clientes × 9 % que vende en pánico × 30,9 % que no vuelve ≈ 27.800 clientes ≈ 528 M€ de patrimonio en riesgo ≈ 1,6 M€/año en comisiones (0,30 %). Mezcla datos de EE. UU. con cifras de MyInvestor: es un orden de magnitud, no una previsión.

## 5. Competencia
| Empresa | Qué hace | En qué nos diferenciamos |
|---|---|---|
| Neuroprofiler (Francia) | Test de idoneidad gamificado: elecciones entre loterías con un modelo bayesiano adaptativo; pilotos con bancos (BPCE) | Nosotros medimos **conducta en el tiempo** ante caídas calibradas con el **catálogo real del banco** y la subida de sueldo; integramos el cuestionario MiFID completo + informe; asistente con voz; foco España |
| Oxford Risk, Capital Preferences | Perfilado conductual por cuestionario o elecciones | Lo mismo: no simulan la vida de la cartera del cliente |
Fuente Neuroprofiler: Crowdfund Insider, nov-2016; perfil en The Wealth Mosaic.

## 6. IA frontera y accesibilidad (criterio del 15 %)
| Dato | Cifra | Fuente |
|---|---|---|
| Adultos con competencias digitales al menos básicas en España | 66,5 % (2025): uno de cada tres no las tiene | ONTSI, vía Digital Skills and Jobs Platform (UE) |
| Personas con discapacidad visual en España | 1,05 millones | INE, EDAD 2020 (publicada 19-abr-2022) |
Mensaje: Vega (Claude) aclara cada pregunta en lenguaje llano y la voz (ElevenLabs) permite hacer el test hablando o escuchando. Ninguna cifra la calcula la IA. **Impacto medible a enseñar:** el tiempo de respuesta de Vega y cuántas preguntas se pueden resolver por voz (pedir el dato a Pedribel).

## Lo que NO decimos
- Que la prueba con usuarios está hecha (está diseñada: `data/study/PROTOCOLO.md`).
- Cifras de abandono propias ni de MyInvestor.
- Que sustituimos el test de idoneidad: es su formato.
