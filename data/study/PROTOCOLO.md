# Protocolo de la mini-prueba (martes 10-nov, tarde)

Dueño: Producto (Álvaro). Apoyo: Datos (Amanda) para el análisis, Frontend (Pedribel) para la versión que se prueba.
Estado: **propuesta**. Relacionado: `docs/CUESTIONARIO.md`, `docs/DECISIONS.md` (D10, D11, D13), RNF-03.

## 1. Qué queremos saber
| # | Pregunta | Cómo se mide | Éxito (orientativo) |
|---|---|---|---|
| H1 | ¿El onboarding gamificado se hace menos pesado que un test clásico? | Escala 1-5 de "pesadez" y preferencia directa tras probar ambos | ≥ 60 % prefiere el gamificado |
| H2 | ¿Hay diferencia entre lo que la gente **dice** y lo que **hace**? | Tolerancia declarada (O4, O3) frente a nivel revelado en la partida | ≥ 30 % con nivel revelado más bajo que el declarado |
| H3 | ¿Se completa en un tiempo razonable? | Tiempo total por persona | Mediana ≤ 10 min |
| H4 | ¿Se entiende el resultado? | 2 preguntas de comprensión sobre su informe | ≥ 75 % acierta ambas |

Con 20-30 personas los resultados son **descriptivos**: proporciones y medianas con intervalo (bootstrap, Amanda). No se presentan como estudio científico.

## 2. Participantes
- 20-30 compañeros de la UC3M, **mayores de 18 años**, voluntarios.
- Sin recompensa ligada al resultado (coherente con D10). Como mucho, una invitación igual para todos.
- Encaja con el público objetivo (inversor joven), aunque no representa a todos los clientes de un banco. Se dice en el pitch.

## 3. Diseño
Cada persona hace **las dos versiones** en orden alternado para que el orden no sesgue la preferencia:
- Grupo A (IDs impares): test clásico → onboarding gamificado.
- Grupo B (IDs pares): onboarding gamificado → test clásico.

El **test clásico** son las mismas preguntas de `CUESTIONARIO.md` (pasos 1-3) en un formulario plano, sin partida.

## 4. Material
1. Hoja de consentimiento (`data/study/CONSENTIMIENTO.md`), en papel o formulario.
2. Versión del juego que esté lista el martes a mediodía. **Plan B** si la app no está: preguntas en formulario y partida jugada con tarjetas de situación que lee el facilitador, con un cronómetro.
3. Test clásico en formulario plano.
4. Cuestionario final (sección 7).
5. Hoja de registro con: ID, grupo, hora de inicio y fin de cada parte. **Sin nombres.**

## 5. Desarrollo (≈ 20 min por persona; 2-3 puestos en paralelo)
| Paso | Qué hace el facilitador | Tiempo |
|---|---|---|
| 1 | Lee el guion (sección 6), entrega el consentimiento y asigna el siguiente ID libre (P01, P02…) | 2 min |
| 2 | Primera versión según el grupo; anota hora de inicio y fin | 5-10 min |
| 3 | Segunda versión; anota horas | 5-10 min |
| 4 | Cuestionario final | 2 min |
| 5 | Agradece y explica qué medíamos (sección 8) | 1 min |

Reglas para el facilitador: no ayudar ni comentar las decisiones, no mirar la pantalla durante la partida salvo que lo pidan, no decir qué es "lo correcto".

## 6. Guion inicial (leer tal cual)
"Gracias por participar. Estamos probando dos formas de hacer el test que piden los bancos antes de invertir. Vas a hacer las dos. No hay respuestas buenas ni malas y nadie va a ver lo que respondes con tu nombre: solo usamos un número. Responde como lo harías si fuera tu dinero de verdad. Puedes dejarlo en cualquier momento o elegir 'prefiero no responder'."

## 7. Cuestionario final (todas cerradas salvo la última)
1. ¿Qué versión se te ha hecho más pesada? (1 = nada, 5 = mucho) — clásica / gamificada.
2. Si abrieras una cuenta para invertir, ¿cuál preferirías? Clásica / Gamificada / Me da igual.
3. En la partida, ¿sentiste que el dinero era "de verdad"? 1-5.
4. ¿Hubo alguna pregunta que no entendieras? Sí (cuál, de una lista) / No.
5. Comprensión del resultado: "¿Qué nivel de riesgo te propone?" y "¿Qué dato ha limitado tu nivel?" (opciones cerradas).
6. Comentario libre opcional (no escribas datos personales).

## 8. Explicación final (leer tal cual)
"Lo que medíamos es si lo que decimos sobre el riesgo coincide con lo que hacemos cuando vemos caer nuestro dinero. No es un examen ni una recomendación de inversión."

## 9. Datos y privacidad (RNF-03, RGPD)
- **Minimización:** solo rangos (nunca cifras exactas), "prefiero no responder" siempre disponible, ningún nombre, email, DNI ni teléfono.
- **Seudonimización:** ID P01-P30. La relación ID-persona **no existe**: no se apunta en ningún sitio.
- Aunque no haya nombres, estudios + profesión + rangos de ingresos en una clase pequeña podrían identificar a alguien. Por eso los tratamos como datos personales: consentimiento, acceso solo del equipo y borrado.
- **Dónde:** los datos en bruto se guardan en `data/study/raw/` en el ordenador del responsable (está en `.gitignore`, nunca se sube) y no se comparten por Drive público ni WhatsApp. En el repo solo entra `data/study/resultados_agregados.csv` con totales por grupo y nunca filas de una persona.
- **Borrado:** datos en bruto eliminados como tarde el 30-nov-2026. Responsable: Álvaro.
- Si alguien pide retirar sus datos, se borra su fila usando el ID que tiene en su copia del consentimiento.

## 10. Análisis (Amanda)
- H1: proporción que prefiere cada versión y mediana de pesadez por versión, separando grupo A y B.
- H2: tabla declarado frente a revelado (niveles 0-5); proporción con revelado < declarado.
- H3: mediana y rango de tiempos.
- H4: proporción de aciertos.
- Salida: `reports/miniprueba.md` y el CSV agregado. Lo que no salga, se cuenta igual.

## 11. Pendiente
- Confirmar el martes a las 13:00 si se usa la app o el plan B.
- Imprimir o preparar en formulario: consentimiento, test clásico, cuestionario final y hoja de registro.
- Reservar sitio (aula o zona del hackathon) y 2-3 facilitadores.
