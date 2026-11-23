# Ampliación de alcance (2026-11)

**Estado:** **aprobada por el equipo el 2026-11-16** y registrada en Jira (§9). No autoriza implementación por sí sola: cada Story necesita el slice del ERD aprobado (`TS-87`) y su spec de capa antes de los tests (`metodologia-sdd-tdd.md`, Ready).
**Origen:** revisión de avance de noviembre de 2026 (registrada en el roadmap, decisión del 2026-11-16).

## 1. Por qué

Con artistas, producciones y canciones, el sistema guarda archivos pero no sostiene el **proceso** de producción musical, con sus caminos alternos, ni procesa datos ni muestra resultados. La ampliación cubre seis necesidades:

1. Mostrar el proceso de producción, sus caminos alternos y qué parte implementa el sistema, al inicio de la presentación.
2. Que cada versión explique qué cambió y por qué.
3. Un dashboard con indicadores del proceso: lo planificado frente a lo hecho, atrasos, versiones por producción.
4. Uso de servicios externos o de análisis para validar el audio: el sistema «es una isla».
5. Comunicación con el artista: avisos de «ya terminé, revisa».
6. Varios productores en el mismo estudio.

El objetivo de esta ampliación es que Track Studio sea un flujo de **revisión y aprobación** de versiones con datos procesados, y no un almacén de archivos.

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**

- El productor y el artista comparan dos versiones de una canción, escuchan y ven qué cambió, y el artista decide.
- Cada versión pasa por un ciclo de revisión explícito, con un camino alterno (cambios pedidos) que genera la siguiente versión.
- Cada versión trae un chequeo técnico automático (volumen, picos, saturación, silencios) y curvas por tramo de tiempo.
- El productor ve en el dashboard el estado del proceso: entregas, atrasos, rondas de revisión y tiempos de respuesta.
- El artista y el productor reciben un correo en cada paso del flujo que les toca.
- El estudio admite varias cuentas de productor que comparten el trabajo.

**No objetivos**

- Resumen de cambios redactado por IA: descartado por costo (decisión del equipo del 2026-11-16).
- Aislar a cada productor como un cliente aparte (multi-inquilino, suscripciones).
- Notificaciones dentro de la aplicación (`TS-82` sigue post-S6) y tiempo real.
- Forma de onda completa, edición o procesamiento del audio, y formatos distintos de WAV/MP3.
- `TS-81` (listado de producciones con filtros) sigue post-S6.

**Antiobjetivos** (fallaría aunque funcione):

- Que el alcance principal (HU-01..HU-28) o las Tasks de Figma no estén terminados el 2026-12-11 por culpa de la ampliación.
- Que el chequeo técnico afirme métricas que no se pueden defender: un LUFS que no coincide con una herramienta de referencia es peor que no mostrarlo.
- Que la ampliación se registre de forma invisible: cada bloque suma SP y deja rastro en Jira y en el roadmap.

## 3. Restricciones

- **Fechas:** el alcance principal y todas las Tasks de Figma (`TS-73`..`TS-76`) quedan listos para el 2026-12-11. La fecha no es rígida para la ampliación, pero el plan la busca para la misma fecha (decisión del equipo del 2026-11-16).
- **Capacidad:** la ampliación se reparte de forma equitativa entre S5 y S6, con unos 5 SP más por semana que hasta ahora: 27–29 SP por sprint, frente a 16 SP del S4 (decisión del equipo del 2026-11-16, que corrige una primera lectura de 20–22 SP por semana).
- **Costo:** presupuesto de AWS de USD 1 al mes. Nada de la ampliación puede generar cargos.
- **Arquitectura vigente:** el audio no pasa por Railway (D7.1); la duración ya la reporta el frontend (ERD §3.5); no hay jobs ni worker de colas desplegados; Resend está configurado (`TS-43`).
- **Proceso:** ciclo SDD/TDD híbrido, ERD antes de las migraciones, ADR para las decisiones técnicas nuevas y veto en `CLAUDE.md` §5 hasta que se levante por historia.

## 4. Enfoques considerados

### 4.1 Dónde se calcula el análisis del audio

| Enfoque | Ventajas | Costos | Resultado |
| --- | --- | --- | --- |
| **A. En el navegador, al subir** | Cero costo y cero infraestructura; el archivo ya está en el cliente; encaja en la confirmación de HU-14 | El cliente calcula las métricas (mismo trato que `duration_ms`); hay que implementar BS.1770 bien; las versiones ya subidas no tienen análisis | **Elegido** (equipo, 2026-11-16) |
| B. En el servidor, con `ffmpeg` tras verificar | Métricas de referencia en las que confía el servidor | Worker de colas y `ffmpeg` en Railway (infraestructura nueva del equipo); descarga desde S3 | Descartado por tiempo |
| C. Al reproducir, en el navegador | Sin cambios en la subida | Descarga dos archivos completos en cada comparación; egreso de S3 repetido | Descartado |

### 4.2 Cómo se guarda la revisión

| Enfoque | Resultado |
| --- | --- |
| Una columna de estado en `versions` | Descartado: pierde quién decidió y cuándo, que son los datos del dashboard. |
| **Una tabla de decisiones de revisión** (una fila por decisión) | **Elegido** (propuesta del agente): da las rondas y los tiempos de respuesta sin reconstruir la historia. |

### 4.3 Cómo se escucha el A/B

| Enfoque | Resultado |
| --- | --- |
| **Dos elementos `<audio>` sincronizados** con las URLs firmadas de HU-16 | **Elegido** (propuesta del agente): reutiliza HU-15/HU-16 y no decodifica nada en memoria. |
| Decodificar ambos archivos con Web Audio | Descartado: memoria (un WAV de 500 MB pasa de 1 GB) y descarga completa. |

## 5. Diseño

### 5.1 Flujo de revisión (confirmado por el equipo)

```
productor sube vN ─► en revisión ─┬─► artista aprueba ─► aprobada
     ▲                            └─► artista pide cambios (motivo + comentarios)
     └───────────── productor sube vN+1 con motivo ◄──┘
```

- Al quedar `verificada` (HU-14), la versión entra en revisión y se avisa al artista por correo.
- El artista aprueba o pide cambios. Pedir cambios exige un texto; puede apoyarse en los comentarios con marca de tiempo (HU-17..HU-19).
- Una versión nueva sobre una canción ya aprobada abre otra ronda; la aprobación anterior queda como historia. *(Decisión del agente.)*
- Solo el artista con acceso vigente decide (HU-20/HU-21). Antes de ese acceso el flujo no se puede cerrar de punta a punta, así que esta parte va detrás de HU-21.

### 5.2 Motivo de la versión

- Desde la v2, la subida exige una **categoría** (voz, instrumentos, mezcla, master, arreglo, otro) y un **texto** de motivo. La v1 no lo pide. *(Lista de categorías y una sola por versión: confirmadas por el productor el 2026-11-17, `consulta-productor-ts87.md`.)*
- Se muestra en el historial y en la comparación.

### 5.3 Análisis y chequeo técnico

- Al subir, el frontend lee el archivo por partes (WAV directo; MP3 decodificado por el navegador) y calcula:
  - **Globales:** volumen integrado (LUFS, ITU-R BS.1770), pico real (dBTP), número de muestras saturadas y tramos de silencio.
  - **Por tramo de 1 s:** volumen y energía en graves, medios y agudos.
- El resumen viaja en la confirmación de HU-14 y se guarda con la versión. El servidor valida su forma y sus rangos; no lo recalcula.
- El chequeo compara contra umbrales de referencia (p. ej. −14 LUFS y −1 dBTP para streaming) y **advierte, no bloquea**: el productor decide. *(Decisión del agente.)*
- **Prueba de referencia:** el cálculo se valida contra `ffmpeg` (filtro `ebur128`) en local con archivos de prueba, con una tolerancia definida en la spec.
- Las versiones subidas antes de este cambio se muestran «sin análisis».
- **Recursos** (estimación, a medir en la spec): con WAV, 10–20 MB de memoria fijos por lectura por partes; con MP3, el navegador decodifica el archivo entero (unos 115 MB para 5 min). Unos 2–6 s de CPU para una canción de 5 min, en un Web Worker y en paralelo a la subida. Funciona en Chrome, Firefox, Safari y Edge actuales (Web Audio, Workers, `File.slice`). Un MP3 que supera el tope de duración que fije la spec se sube «sin análisis». El análisis corre solo en el equipo del productor; el artista descarga el resumen.

### 5.4 Comparación A/B

- Desde el historial se eligen dos versiones verificadas de la misma canción; por defecto, la seleccionada y la anterior.
- Dos reproductores sincronizados: un control pasa de A a B en el mismo segundo.
- Curvas superpuestas de volumen y bandas, con las zonas donde la diferencia supera un umbral marcadas en la línea de tiempo.
- Al lado: el motivo de la versión nueva y la diferencia de las métricas globales.
- El artista decide desde ahí (aprobar o pedir cambios), según 5.1.

### 5.5 Correos

- Con Resend, sobre el mismo envío que monta HU-20 para la invitación (D6.4).
- **Eventos:** versión en revisión (al artista con acceso vigente); aprobación y cambios pedidos (a los productores).
- Un fallo de envío no deshace la acción: se registra y la acción sigue. *(Decisión del agente.)*

### 5.6 Dashboard del proceso

Extiende `TS-85` (`GET /api/v1/dashboard`):

- **Fecha de entrega** opcional por producción; atrasada si la fecha pasó y no todas sus canciones tienen una versión aprobada.
- Rondas de revisión por canción (cambios pedidos hasta la aprobación).
- Tiempo de respuesta del artista (de «en revisión» a la decisión).
- Versiones por producción y chequeos técnicos con advertencias.

### 5.7 Varios productores — DESCARTADO (2026-11-23)

> **Decisión del equipo del 2026-11-23**, acordada con el productor de Millenium Sound: el estudio no necesita varios productores. `TS-96` y `TS-89` se descartan. No hay nada que revertir en el modelo; `created_by` y `uploaded_by` se quedan. El texto siguiente se conserva como referencia.

- Los permisos ya son por rol (`perform-producer-action`), y `artists.created_by` y `versions.uploaded_by` ya guardan el autor. Varios productores comparten todo el estudio sin cambios de modelo.
- **Trabajo:** el equipo crea otra cuenta con rol de productor en Auth0; la interfaz muestra «creado por» y «subido por».

### 5.8 Proceso para la presentación

- Diagrama BPMN del proceso de producción: sesión, grabación, subida, revisión, cambios y aprobación, con lo que implementa el sistema marcado.
- Diagrama de contexto actualizado: Auth0, S3, Resend y el análisis en el cliente.
- Entran en HU-28 y en la tesis.

## 6. Cambios de modelo (slice del ERD a aprobar antes de las migraciones)

- `productions.due_date` (`date`, nulo).
- `versions.change_category` y `versions.change_reason` (nulos en la v1; obligatorios desde la v2, validado en el Service). *Enmienda de `TS-87` (2026-11-17): el texto del motivo reutiliza `versions.description` en vez de crear `change_reason`, y es obligatorio cuando la canción ya tiene una versión verificada, no por número. Diseño en [`modelo-completo.md`](../erd/modelo-completo.md) §3.5 y §3.9.*
- `versions.analysis` (`jsonb`, nulo en las versiones anteriores al cambio), con métricas globales y series por segundo.
- Tabla de decisiones de revisión: versión, artista que decide, decisión (`aprobada` o `cambios_pedidos`), texto y fecha. El estado «en revisión» se deriva de la ausencia de decisión. *(Nombre de tabla y columnas: a fijar en el ERD.)*

## 7. Decisiones técnicas nuevas (ADR)

- Análisis calculado en el cliente, con la misma justificación que `duration_ms` (ERD §3.5).
- Umbrales del chequeo técnico y su carácter de advertencia.
- Ampliación de D6.4: Resend envía también los avisos del flujo de revisión.

## 8. Plan por sprint

Reparto equitativo entre los dos sprints restantes (decisión del equipo del 2026-11-16):

| Sprint | Principal | Ampliación | Figma | SP |
| --- | --- | --- | --- | --: |
| S5 · 16–29 nov | HU-17..HU-21 (18) | Motivo (2), análisis y chequeo (5), flujo de revisión (3), ~~autoría (1)~~ | TS-88 (diseño), TS-73, TS-74 | 28 |
| S6 · 30 nov–11 dic | HU-22, HU-23, HU-27, HU-28 (11) y cierre de HU-24..HU-26 | A/B con curvas y decisión (8), correos (3), dashboard del proceso (5) | TS-75, TS-76 | 27 + 8 de cierre |

Los 8 SP de HU-24..HU-26 se cierran en S6, pero su trabajo ya se hace en cada sprint con la reserva de 2 SP equivalentes; no son esfuerzo nuevo del S6. La semana del 7 al 11 de diciembre incluye HU-28, los diagramas de §5.8 y el ensayo de la defensa.

**Estimaciones de la ampliación** (gruesas, a validar por el equipo): motivo 2, análisis y chequeo técnico 5, flujo de revisión 3, A/B con curvas y decisión 8, correos 3, dashboard del proceso 5 y autoría 1 (descartada el 2026-11-23). Total: 26 SP (27 antes del descarte) sobre los 92 de la baseline (más los 3 de `TS-85`).

**Diseño previo en Figma:** las pantallas nuevas y las que se reforman se prototipan en Figma antes de su spec frontend (ver §11), todas durante S5: primero las que se construyen en S5 (historial y reproductor, motivo, chequeo, revisión) y después el A/B y el dashboard, que se construyen en S6.

**Control:** corte a mitad y al cierre de cada sprint. La meta es no recortar nada (decisión del equipo del 2026-11-16). Si la velocidad no llega, la ampliación se recorta desde el final de este orden: flujo de revisión, A/B, análisis y curvas, dashboard, correos. El alcance principal y Figma no se recortan.

## 9. Registro en Jira (2026-11-16)

| Jira | Tipo | Bloque | SP | Sprint |
| --- | --- | --- | --: | --- |
| `TS-87` | Task de `TS-1` | ERD y ADR de la ampliación (gate de datos) | — | S5, primeros días |
| `TS-88` | Task de `TS-67` | Diseño en Figma de las pantallas nuevas y rediseñadas | — | S5 |
| `TS-89` | Task de `TS-1` | ~~Segunda cuenta de productor en Auth0 (equipo)~~ Descartada el 2026-11-23 | — | — |
| `TS-90` | Story de `TS-6` | Motivo de la versión | 2 | S5 |
| `TS-91` | Story de `TS-6` | Análisis técnico al subir | 5 | S5 |
| `TS-92` | Story de `TS-6` | Flujo de revisión y aprobación | 3 | S5 |
| `TS-93` | Story de `TS-6` | Comparación A/B con curvas y decisión | 8 | S6 |
| `TS-94` | Story de `TS-6` | Correos del flujo de revisión | 3 | S6 |
| `TS-95` | Story de `TS-4` | Dashboard del proceso | 5 | S6 |
| `TS-96` | Story de `TS-2` | ~~Varios productores: autoría visible~~ Descartada el 2026-11-23 | ~~1~~ | — |

Total de la ampliación: **26 SP** (27 antes de descartar `TS-96` el 2026-11-23). HU-20 y HU-21 (`TS-31`, `TS-32`) pasan de S6 a S5, porque el flujo de revisión necesita que el artista pueda entrar. `TS-74` (UI de comentarios) entra en S5. `TS Sprint 6` se creó en Jira (id 74) con HU-22, HU-23, HU-27, HU-28, TS-93, TS-94, TS-95, TS-75 y TS-76. Los diagramas de §5.8 quedan comentados en `TS-39` (HU-28).

Decisión registrada en `roadmap.md` («Reglas de alcance»); vetos actualizados en `CLAUDE.md` §5; plan del sprint en `sprints/sprint-05.md`.

## 10. Lo que queda para quien construye

Se resuelve en cada spec: formatos exactos de la API, tolerancia del LUFS frente a `ffmpeg`, umbral de «zona distinta» en las curvas, plantillas y textos de los correos, y diseño de las pantallas nuevas (ver §11).

## 11. Decisiones del equipo sobre el diseño y el recorte (2026-11-16)

1. **Las pantallas nuevas se prototipan en Figma antes de construirlas**, diseñadas por el equipo y el agente con el MCP de Figma: comparación A/B, revisión y decisión, chequeo técnico, motivo en la subida y extensión del dashboard. También se rediseñan las pantallas existentes que cambian, en especial el historial y el reproductor de versiones. Se trabaja en el archivo del prototipo («Track Studio (Copy)», `uDajU3zIBNlPk6a2ZKUgIc`), en una página propia para no tocar los marcos existentes. Cada marco aprobado alimenta la spec frontend de su historia, igual que los inventarios de `TS-68`..`TS-73`. *(Propuesta del agente:)* `TS-73` toma como referencia el historial y el reproductor rediseñados, no los marcos anteriores, para no igualar una pantalla que luego se rehace.
2. **Orden de recorte:** las curvas suben de prioridad porque son lo que muestra qué cambió; si hace falta recortar, caen primero los correos y después el dashboard del proceso. La meta es no recortar nada.
