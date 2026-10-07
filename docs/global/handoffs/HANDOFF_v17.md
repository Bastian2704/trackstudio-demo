# Handoff v17 — Track Studio

**Fecha:** 2026-10-07 · **Sprint:** 2 · **Capa(s):** backend / planificación
**Foco de la sesión:** cambiar el orden de ejecución de Sprint 2 y redactar el borrador de la spec backend de `TS-19` (HU-08).

> Continúa [`HANDOFF_v16.md`](HANDOFF_v16.md). Rama observada: `feature/TS-19-productions-crud`. El agente no escribió código de aplicación, tests, Git ni Jira.

## 1. Resumen ejecutivo

Se decidió ejecutar `TS-19` antes de `TS-17`. Es el orden lógico porque HU-06 necesita producciones reales para cumplir su aceptación completa; así se evita dejar una rama de TS-17 abierta y dependiente de otra rama.

Se redactó [`../../specs/backend/HU-08.md`](../../specs/backend/HU-08.md) como **borrador pendiente de aprobación humana**. Por C1 todavía no se escribieron tests.

## 2. Decisiones aprobadas

- El alta admite artistas `invitado` y `activo`; un artista `inactivo` produce 422 en `errors.artist_id`.
- El estado inactivo no impide consultar, editar o eliminar producciones ya existentes.
- `artist_id` es inmutable después del alta.
- El borrado es lógico y responde 204 sin cuerpo.
- Contrato REST: `POST /productions`, `GET|PUT|DELETE /productions/{production}` bajo `/api/v1`.
- Las reglas detalladas por cantidad de canciones siguen perteneciendo a `TS-20`.

## 3. Estado y drift de Jira

- `TS-19` continúa `Por hacer`, sin asignar.
- Jira aún muestra `ts-08.10` sin marcar, aunque el comentario del ticket, `sprint-02.md`, TS-49 y el ERD confirman que está satisfecha desde el 2026-10-05.
- No se modificó Jira sin autorización explícita.

## 4. Próximo paso exacto

1. El humano revisa y aprueba o enmienda `docs/specs/backend/HU-08.md`.
2. Tras la aprobación, marcar `ts-08.10` y `ts-08.01` y pasar TS-19 a `En curso` en Jira, con autorización humana.
3. El agente escribe `ts-08.02`: tests backend y demuestra el rojo por la razón prevista.
4. El humano implementa el Green; el agente guía y luego ejecuta review/C3.

## 5. Trampas para la siguiente sesión

- No reutilizar `origin/feature/TS-19-backend-ci`: es una rama histórica de CI, no esta HU.
- `graphify` existe, pero falta `graphify-out/graph.json`; se usó búsqueda dirigida.
- D9.2 (migraciones en deploy) no bloquea el código local, pero sí debe resolverse antes de verificar la migración en staging.
- Los tests de 404 deben comprobar primero que la ruta existe, para no nacer verdes por una ruta ausente.

## 6. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
