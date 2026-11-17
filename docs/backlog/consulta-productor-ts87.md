# Consulta al productor: motivo de la versión y chequeo técnico (`TS-87`)

**Para:** Efraín Abad (Product Owner, Milenium Sound) · **Prepara:** el equipo · **Fecha:** 2026-11-17
**Para qué:** confirmar los valores que el sistema usará en el motivo de cada versión (`TS-90`) y en el chequeo técnico automático (`TS-91`). Cierra D7.10 del ADR, que hoy está en PARCIAL.
**No bloquea:** mientras no haya respuesta, se construye con la propuesta de cada pregunta. Cambiar un valor después es un cambio menor.

## Cómo funciona

Al subir una versión, el navegador analiza el audio y calcula cuatro cosas: el volumen integrado (LUFS), el pico real (dBTP), las saturaciones y los silencios. El sistema compara esos valores con unos umbrales y **muestra advertencias, sin bloquear nunca la subida**: el productor decide. Desde la segunda versión de una canción, la subida pide además una categoría y un texto que expliquen qué cambió.

## Preguntas

Responder en cada una con **Sí** (se acepta la propuesta) o con el valor que corresponda.

### 1. Categorías del cambio

Al subir una versión nueva, el productor elige una categoría:

> **Propuesta:** voz · instrumentos · mezcla · master · arreglo · otro

- ¿Sirven estas seis? ¿Falta alguna que use el estudio (por ejemplo, edición o afinación, letra o estructura) o sobra alguna?
- Respuesta:

### 2. Volumen objetivo

> **Propuesta:** advertir si el volumen integrado queda fuera de **−14 LUFS ± 1 LU**, es decir, por debajo de −15 o por encima de −13. Es la referencia de Spotify y YouTube.

- ¿Es el objetivo con el que trabaja el estudio? ¿Prefiere otro valor (por ejemplo, −16 LUFS para Apple Music, o −9 a −11 para géneros más fuertes) o un margen distinto?
- ¿Advertimos solo cuando está demasiado fuerte, solo cuando está demasiado bajo, o en los dos casos?
- Respuesta:

### 3. Pico real máximo

> **Propuesta:** advertir si el pico real supera **−1,0 dBTP**, el margen que piden las plataformas para que el archivo no sature al convertirlo a MP3 o AAC.

- ¿Le parece bien o usa otro margen (por ejemplo, −0,3 o −2,0 dBTP)?
- Respuesta:

### 4. Saturación (clipping)

> **Propuesta:** advertir cuando hay al menos **un tramo de 3 o más muestras seguidas al máximo** (0 dBFS).

- ¿Le parece una buena regla para detectar saturación, o la quiere más estricta (1 muestra) o más permisiva (por ejemplo, desde 5 tramos)?
- Respuesta:

### 5. Silencios

> **Propuesta:** advertir si hay un silencio **por debajo de −60 dBFS durante 2 segundos o más**, sin contar el silencio del inicio ni el del final del tema.

- ¿El umbral y la duración tienen sentido? ¿Le interesa que también se avise del silencio largo al inicio o al final, por ejemplo más de 1 s antes de que empiece el audio?
- Respuesta:

### 6. A qué versiones se aplica cada advertencia

> **Propuesta:** el volumen (pregunta 2) y el pico (pregunta 3) **solo se revisan en las versiones de categoría «master»**, porque una mezcla no se entrega normalizada y avisar en cada mezcla sería ruido. La saturación y los silencios se revisan en **todas** las versiones. La primera versión de una canción no lleva categoría, así que solo se le revisan la saturación y los silencios.

- ¿Está de acuerdo, o prefiere que todas las advertencias se apliquen siempre?
- Respuesta:

### 7. Qué ve el artista

> **Propuesta:** el artista con acceso ve el motivo de la versión y las curvas de la comparación A/B, pero **no ve las advertencias técnicas**, que son una herramienta del productor. Así se evita que una mezcla en proceso le parezca «defectuosa».

- ¿El artista debe ver las advertencias, solo las métricas (LUFS y pico, sin advertencias) o nada técnico?
- Respuesta:

## Después de responder

El equipo registra las respuestas en D7.10 del ADR, que pasa de PARCIAL a DECIDIDO, y en la spec de `TS-91`. La pregunta 1 se refleja en el `CHECK` de `versions.change_category` (ERD §3.5) antes de la migración de `TS-90`. Si la respuesta llega después de esa migración, cambiar la lista requiere una migración nueva.
