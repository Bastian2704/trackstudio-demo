# Handoff v34 — Track Studio

**Fecha:** 2026-11-03 · **Sprint:** 4 · **Capa(s):** backend / global
**Foco de la sesión:** review C3 de `TS-25` (HU-14 backend, `ts-14.04`), ejecución del test de frontera real con S3 (#28) y reconstrucción de la imagen de Sail.

## 1. Resumen ejecutivo

El review C3 de HU-14 backend terminó sin hallazgos abiertos. De 59 mutaciones, 56 se pusieron en rojo; las 3 que siguieron en verde quedaron explicadas y corregidas en la spec. El #28 (C4) pasa contra el bucket real de `TS-42` y se pone en rojo con un ETag o un bucket erróneos. Con la imagen de Sail reconstruida (PHP 8.4.27), la suite completa está en verde: 461 tests y 2 skipped. Falta commitear, publicar y pasar el PR #57 a revisión (§6).

## 2. Qué se hizo

- **Review C3 de `TS-25`** ([`docs/specs/backend/HU-14.md`](../../specs/backend/HU-14.md) §6, entrada del review). Se probaron 59 mutaciones sobre `1ba446b`, al menos una por cada test #1–#27. El script restauraba cada archivo desde una copia, sin git.
- **#28 (C4):** en verde con un objeto que subió HU-13 al bucket de `TS-42` (3 aserciones). Probado en rojo con un ETag equivocado y con un bucket inexistente.
- **Correcciones de documentación** (sin commitear):
  - `HU-14.md`: columna C3 del #15, §2 (CORS aplicado), entrada de Green completada y nueva entrada del review en §6.
  - ADR D7.5: la cita «v31–v34» pasa a «v31–v33».
- **Código (equipo):** comentario completado en `app/Storage/S3HashVerifier.php:20`.
- **Entorno:** `sail build --no-cache` actualizó PHP de 8.4.26 a 8.4.27. `PhpRuntimeTest` vuelve a estar en verde.
- **Calidad:** Pint y Larastan limpios. La suite completa, en verde.
- **Jira:** no se tocó. Su estado no se verificó en esta sesión.

## 3. Decisiones tomadas en esta sesión

- **Se mantiene `string` en la regla del `etag`** (`ConfirmVersionRequest`), por decisión del equipo. Ningún test puede demostrarla, porque la regex ya rechaza lo que no es texto, pero forma parte del contrato de HU-14 §3.3. La justificación está en el registro de la spec.
- **El registro de Green no dice quién escribió el código:** el equipo quitó esa mención de la entrada de `ts-14.03` y no se repuso.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`sail pest` no pasa variables de entorno de la shell al contenedor.** `S3_TEST_OBJECT_KEY=… ./vendor/bin/sail pest …` deja el #28 en `skipped`. Hay que pasarlas así:
  `docker compose exec -T -e S3_TEST_OBJECT_KEY=… -e S3_TEST_OBJECT_ETAG=… laravel.test php vendor/bin/pest --filter='consulta el bucket real'` (desde `backend/`).
- **Una defensa en dos capas engaña a C3.** `withTrashed()` en el binding de `versions/{version}` sigue en verde, porque `confirmVersion` vuelve a leer la fila con `Version::query()->lockForUpdate()->firstOrFail()`, que excluye las borradas. Solo se pone en rojo si se rompen las dos capas. Antes de escribir «X → rojo» en una spec, hay que comprobar que X sea la única barrera.
- **Una regla tapada por otra no se puede poner en rojo.** El `regex` de Laravel devuelve `false` para cualquier valor que no sea texto ni número, y un entero como `123` no casa con 32 hexadecimales. Por eso un caso «no es texto» del dataset no demuestra `string` cuando hay una regex.
- **Mutaciones con texto repetido:** `->lockForUpdate()` y `->where('song_id', …)` aparecen más de una vez en `VersionService`. El script se negaba a aplicarlas y hubo que añadir más contexto a la búsqueda. Merece la pena mantener esa verificación de que el texto aparezca una sola vez.
- **Recordatorio (consolidado v21–v30):** la imagen de Sail no fija el parche de PHP. Volvió a pasar (8.4.26) y lo detectó `PhpRuntimeTest`.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| C3 del #15 en HU-14 afirmaba algo que no se pone en rojo | `HU-14.md` §4 | Corregido |
| HU-14 §2 seguía pidiendo al equipo el `ExposeHeaders: ETag`, ya aplicado | `HU-14.md` §2 | Corregido |
| D7.5 citaba un handoff v34 que no existía | ADR | Corregido |
| CORS del bucket con `PUT`/`GET`, pero HU-13 sube con POST (v31) | ADR D7.5 | Cerrado: el equipo aplicó la configuración nueva el 2026-11-03 |
| «humano» en 32 tickets de Jira | Jira | Sin cambios (v32) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes

- **Git de `TS-25`:** el commit del Green (`1ba446b`) sigue sin publicar. Además faltan:
  - el commit del comentario de `S3HashVerifier`;
  - el commit de documentación: `HU-14.md`, el ADR y este handoff;
  - `gh pr ready 57`.
- **`TS-25` en Jira:** marcar `ts-14.04` y revisar el estado de la Task. No se verificó.
- **Contraparte frontend `ts-14.05`** (`docs/specs/frontend/HU-14.md`): pendiente. Ya no la bloquea el CORS.
- **De v33, sin tocar:** comprobaciones de `TS-70` y su PR #52, el registro de `TS-81`/`TS-82` en su rama, y la evidencia de `TS-35`..`TS-37` y `TS-46`/`TS-53`.
- **ABIERTOS en el ADR:** 8.5 y 11.5, sin cambios.
- **Archivos sin seguimiento en `docs/global/`** (`.docx`, `.xlsx`, `Prompts-fase.md`, `docs/notas`): no son de esta tarea. Los commits nombran cada archivo para no arrastrarlos.

## 7. Próximos pasos

1. Commitear y publicar `TS-25` y pasar el PR #57 a revisión.
2. Actualizar `TS-25` en Jira (`ts-14.04`).
3. Spec de la contraparte frontend de HU-14 (`ts-14.05`).
4. Retomar los pendientes de v33 §6.

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9, salvo dos cosas:

- La imagen `sail-8.4/app` se reconstruyó el 2026-11-03 y trae PHP 8.4.27.
- Para el #28, ver el comando de §4.
