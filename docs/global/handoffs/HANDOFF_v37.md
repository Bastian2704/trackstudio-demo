# Handoff v37 — Track Studio

**Fecha:** 2026-11-04 · **Sprint:** 4 · **Capa(s):** backend
**Foco de la sesión:** review C3 de `TS-27` (HU-16 backend, `ts-16.04`) sobre el Green `490d865`.

## 1. Resumen ejecutivo

El review C3 de HU-16 backend terminó sin hallazgos que bloqueen. Las 31 mutaciones se pusieron en rojo y queda un hallazgo menor de orden en `VersionPolicy`, que decide el equipo. La cadena de calidad pasa: Pint, Larastan y 479 tests en verde con 3 skipped. La spec queda marcada como implementada. Falta que el equipo corra el #10 contra el bucket real (§7) y commitee la documentación (§6).

## 2. Qué se hizo

- **Review del diff** `develop...feature/TS-27-urls-firmadas` (spec, rojo y Green). No hay código muerto ni duplicados. La firma reutiliza el `S3Client` singleton y la constante `EXPIRATION_MINUTES`, y el 404 reutiliza el manejador de `bootstrap/app.php`. No hay drift entre la spec, el ADR (D7.5 rev. 3, D8.1) y el código.
- **C3:** 31 mutaciones sobre `app/` y `routes/`, al menos una por fila #1–#9 de [`HU-16.md`](../../specs/backend/HU-16.md) §4. Todas en rojo. El detalle está en la spec, §6. El script hacía una copia de cada archivo y lo restauraba desde ella, sin git. Al terminar, `git diff -- backend/app backend/routes` quedó vacío. El script está en el scratchpad de la sesión y no se versiona.
- **#10 (C4):** no se corrió. Lo corre el equipo con el comando de §7.
- **Documentación:** `HU-16.md` marcada como implementada, con las entradas del Green y del review en §6.
- **Jira:** no se tocó.

## 3. Decisiones tomadas en esta sesión

Ninguna. El hallazgo menor (§6) queda para el equipo.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`whereUuid` no es la única barrera contra un id que no es UUID.** El binding de `HasUuids` ya responde 404, así que sin `whereUuid` el caso «id que no es UUID» del #5 sigue en verde. Solo el inventario del #7 lo detecta. Es la misma lección de v35 §4: antes de escribir «X → rojo», comprobar que X sea la única barrera.
- **Una mutación puede caer por una excepción y no por la aserción.** Un `start_time` constante lejano supera la ventana de 7 días de SigV4 y el SDK lanza `InvalidArgumentException`. El rojo era real pero no probaba el #9. Con un valor dentro de la ventana, el #9 cae en su aserción. Hay que mirar por qué falla una mutación, no solo que falle.
- **`withTrashed()` sí rompe el #5 aquí**, a diferencia de la confirmación de HU-14, porque `presignPlayback` no vuelve a leer la fila.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| `sprint-04.md` solo existe en la rama `chore/TS-84-planificar-sprint-4` | Backlog | Sin cambios (v36) |
| «humano» en 32 tickets de Jira | Jira | Sin cambios (v32) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

Ninguno nuevo en esta sesión.

## 6. Bloqueos y pendientes

- **Hallazgo menor (equipo):** `app/Policies/VersionPolicy.php:35`. `play` quedó detrás del `private isProducer`, y el resto de habilidades van antes. Moverlo o dejarlo, y registrarlo en `HU-16.md` §6.
- **#10 (equipo):** correrlo con el comando de §7, comprobar que también se pone en rojo con un ETag erróneo y anotar el resultado en `HU-16.md` §6.
- **Git:** commitear `HU-16.md` y este handoff (comandos en el reporte de cierre). Después, push y PR de `TS-27` a `develop`.
- **Jira:** marcar `ts-16.03` y `ts-16.04` en `TS-27` cuando el equipo lo confirme.
- **De v36, sin tocar:** commits de HU-14 frontend y de los hallazgos del PR de `TS-25`; `ts-14.09` en staging; `graphify` fuera del PATH.
- **ABIERTOS en el ADR:** 8.5 y 11.5, sin cambios.

## 7. Próximos pasos

1. Correr el #10 desde `backend/`, con los mismos valores que el #28 de HU-14:

   ```bash
   docker compose exec -T \
     -e S3_TEST_OBJECT_KEY='<key del objeto subido por HU-13>' \
     -e S3_TEST_OBJECT_ETAG='<etag sin comillas>' \
     laravel.test php vendor/bin/pest tests/Unit/S3AudioStorageBucketTest.php
   ```

   Rojo de control: repetirlo con un `S3_TEST_OBJECT_ETAG` erróneo.
2. Commitear, hacer push y abrir el PR de `TS-27`.
3. Siguiente del S4: `TS-26` (HU-15, reproductor), empezando por `ts-15.01`: decidir si necesita spec backend (v34 §3).

## 8. Cómo retomar el entorno

Sin cambios respecto a v36 §8. Recordatorio de v35 §4: `sail pest` no pasa variables de entorno al contenedor; para el #10 hay que usar `docker compose exec -e`.
