# Handoff v24 — Track Studio

**Fecha:** 2026-10-13 · **Sprint:** 2 (2026-10-05 → 2026-10-16) · **Capa(s):** backend y frontend
**Foco de la sesión:** `TS-18` (HU-07, cambiar el estado de un artista) completa en las dos capas: specs, tests en rojo, Green del humano, review C3 y merge.

> Continúa [`HANDOFF_v23.md`](HANDOFF_v23.md). Rama `feature/TS-18-artist-status`, PR **#38** mergeada a `develop` el 2026-10-13 (`647fdaf`). La PR #36 (TS-17) también está en `develop`.

## 1. Estado ejecutivo

- **TS-18:** `ts-07.01`–`ts-07.08` marcados en `sprint-02.md` y en el checklist de Jira. Specs [`backend/HU-07.md`](../../specs/backend/HU-07.md) y [`frontend/HU-07.md`](../../specs/frontend/HU-07.md) **implementadas**. Falta `ts-07.09` (staging y log de auditoría en Railway), bloqueado por **D9.2**, igual que `ts-06.09` y `ts-08.09`. En Jira está en «Listo» (movida por el humano el 2026-10-13) con `ts-07.09` pendiente.
- **Criterio de Done (humano, 2026-10-13):** una historia pasa a «Listo» al mergearse en `develop`; la comprobación en staging (`ts-XX.09`) la hace el equipo aparte y no bloquea el Done. Por eso TS-17, TS-18 y TS-19 están en «Listo» con su `.09` pendiente.
- **Cambio de alcance (2026-10-13):** TS-20 (HU-09) pasa a S3 porque sus reglas cuentan canciones y en S2 no existe `songs`; la sustituye **TS-21** (HU-10), que entra completa (backend y frontend) en los 4 días hábiles restantes.

## 2. Jira

- `TS-18`: checklist `ts-07.01`–`ts-07.08` marcado; comentario 10084 (backend) y 10085 (frontend), sin rutas locales por pedido del humano.

## 3. Decisiones de la sesión

1. **El productor solo activa o desactiva.** Cuerpo `{ "active": bool }`. Al reactivar, el servidor deriva el estado de `user_id`: sin cuenta → `invitado`, con cuenta → `activo`. La operación es idempotente: repetirla no escribe ni audita.
2. **Auditoría = log estructurado** `artist.status_changed` (`artist_id`, `from`, `to`, `changed_by`), sin `trace_id` y **sin cambio de esquema**: el ERD sigue cerrado.
3. **Ruta separada** `PUT /api/v1/artists/{artist}/status`, no un campo del `PUT /artists/{artist}`. Fue una pregunta del humano y se mantuvo así.
4. **Frontend:** la sección «Estado» va en `/artistas/:id/editar`, no en el listado. Solo desactivar pide confirmación (`AlertDialog`).
5. **`STATUS_LABELS` vive ahora en `artistSchema.ts`** (dos usos: listado y edición), igual que `FORMAT_LABELS` en v23.

## 4. Evidencia

- **Backend:** 19 casos en `ArtistStatusTest` + fila en `ApiRouteProtectionTest`; suite 238 tests (237 pasan, 1 skip) con `APP_LOCALE=es`; Pint y PHPStan limpios. C3: 17 mutaciones, 15 en rojo y 2 equivalentes. Una se eliminó del código (brazo redundante del `match`); la otra es `whereUuid`, redundante con `HasUuids`, y se mantiene por coherencia.
- **Frontend:** 12 casos nuevos en `ArtistEditPage.test.tsx` (tests 1–9 de la spec); suite 105 tests; Prettier, ESLint (solo los 3 warnings de `TS-58`) y build limpios. C3: 21 mutaciones, 20 en rojo. La que no se detectaba (no cerrar el diálogo tras el 200) se cubrió con el test 9; el código ya era correcto.
- **CI en verde** sobre `827b1db` (cabeza de la PR #38): [lint](https://github.com/Bastian2704/trackstudio-demo/actions/runs/38348283188/job/115134647529), [static-analysis](https://github.com/Bastian2704/trackstudio-demo/actions/runs/38348283188/job/115134647667), [test](https://github.com/Bastian2704/trackstudio-demo/actions/runs/38348283188/job/115134647579), [build](https://github.com/Bastian2704/trackstudio-demo/actions/runs/38348283338/job/115134648040) y Vercel.

## 5. Archivos de la sesión

- **Backend (humano):** `ChangeArtistStatusRequest`, `ArtistPolicy::changeStatus`, `ArtistService::changeStatus`, `ArtistController::changeStatus`, ruta en `routes/api.php`.
- **Frontend (humano):** `ArtistEditPage.tsx` (sección «Estado», `statusMutation`, diálogo), `artistApi.ts` (`changeArtistStatus`), `artistSchema.ts` y `ArtistListPage.tsx` (`STATUS_LABELS`).
- **Tests (agente):** `backend/tests/Feature/ArtistStatusTest.php`, `ApiRouteProtectionTest.php` (fila nueva), `frontend/src/routes/artists/ArtistEditPage.test.tsx`.
- **Specs/backlog:** las dos `HU-07.md`, `docs/backlog/sprints/sprint-02.md` (`ts-07.01`–`ts-07.08`).
- Se borraron `frontend/pnpm-lock.yaml` y `pnpm-workspace.yaml`, creados por error (el gestor es npm).

## 6. Trampas operativas

1. **Sin el método del controller con `Artist $artist` tipado, Laravel no resuelve el modelo:** `can:` recibe el id crudo y responde 403 donde la spec espera 404. Durante el Green, añadir ruta y Policy antes del controller da 403 temporales; desaparecen al añadir el controller.
2. **Pest cuenta las aserciones de `Log::spy()` (`shouldHaveReceived`) como `errors`, no como `failed`.** Un script de C3 que solo mire `failed` da por verdes mutaciones que sí están en rojo.
3. **Un componente que se desmonta oculta estado colgado.** Tras desactivar, el ternario desmonta el `AlertDialog` y el test 3 no ve si `confirmOpen` quedó en `true`. Solo se nota al volver a montarlo (reactivar → test 9). En los diálogos controlados, probar el ciclo de ida y vuelta.
4. **Al mover una constante entre archivos, revisar el `import type` que queda:** `Artist` quedó sin uso en `ArtistListPage.tsx` y rompió ESLint y `tsc -b`. Los tests no lo detectan.
5. Siguen vigentes de v23: `findBy…` y la rama pendiente, `conPrecarga` siempre 200, el 405 → 500 del manejador D3.1 (sin tarea), `APP_LOCALE=en` en el `.env` local, y que el CI solo corre con PR abierta hacia `main`/`develop`.

## 7. Próximos pasos ordenados

1. **TS-21 (HU-10):** spec backend `docs/specs/backend/HU-10.md` sobre `docs/erd/modelo-completo.md` §3.4, en la rama `feature/TS-21-songs-crud`.
2. Resolver **D9.2** para desbloquear `ts-06.09`, `ts-07.09` y `ts-08.09` en staging. Para `ts-07.09`, comprobar además que el canal de log por defecto llega a los logs de Railway.
3. Abrir tarea para el 405 → 500 del manejador D3.1.
4. Pendiente sin fecha: llevar al documento de tesis las correcciones de Auth0 (`auth0/login` v7) y de versiones (D2.1).
5. **Jira, del lado humano (detectado en la reconciliación del 2026-10-13):**
   - Cambiar el objetivo de `TS Sprint 2`, que sigue diciendo «HU-05..HU-09» (ahora es HU-05..HU-08 y HU-10).
   - Crear `TS Sprint 3` (19–30 oct) y meter TS-20, que hoy está en el backlog con `target-s3`.
   - TS-40 tiene 2 SP, pero la regla local dice que las Tasks no llevan SP: quitarlos o documentar la excepción.
   - Épicas TS-1…TS-11 todas en «Por hacer»; TS-3 (Artistas) ya tiene sus tres historias en Listo.
   - Confirmar que TS-61 se borró a propósito (la numeración salta de TS-60 a TS-62).
6. **Sprint 2, aún abierto:** evidencia de tesis TS-46 (`ts-35.s2.01`–`.04`) y TS-53; calidad S2 de TS-35…TS-37 (`ts-24/25/26.s2.01`); reunión con el docente guía (TS-62).
