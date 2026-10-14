# Handoff v25 — Track Studio

**Fecha:** 2026-10-14 · **Sprint:** 2 (2026-10-05 → 2026-10-16) · **Capa(s):** backend y frontend
**Foco de la sesión:** `TS-21` (HU-10, registrar, editar y eliminar canciones) completa en las dos capas: specs, tests en rojo, Green del humano y review C3. Queda abrir la PR.

> Continúa [`HANDOFF_v24.md`](HANDOFF_v24.md). Rama `feature/TS-21-songs-crud`, con todo commiteado (cabeza `42b2a53`). **Sin PR todavía.**

## 1. Estado ejecutivo

- **TS-21:** `ts-10.01`–`ts-10.08` marcados en `sprint-02.md`. Specs [`backend/HU-10.md`](../../specs/backend/HU-10.md) y [`frontend/HU-10.md`](../../specs/frontend/HU-10.md) **implementadas** y enlazadas entre sí. Falta `ts-10.09` (staging), bloqueado por **D9.2** como `ts-06.09`, `ts-07.09` y `ts-08.09`. Según el criterio de Done de v24, la historia pasa a «Listo» al mergearse en `develop`.
- **Probado en local por el humano** (2026-10-14) tras aplicar la migración pendiente (§6, trampa 1).
- **Jira sin actualizar en esta sesión:** el MCP de Atlassian no conectó (`EAI_AGAIN`). Hay que marcar a mano en Jira el checklist `ts-10.01`–`ts-10.08` y añadir los comentarios de backend y frontend.

## 2. Jira

- Nada escrito desde el agente (MCP caído). Pendiente del lado humano: el checklist de TS-21 y, al mergear, mover la historia a «Listo».

## 3. Decisiones de la sesión

1. **Backend (2026-10-13):** alta anidada `POST /productions/{production}/songs` (404 si la producción no está disponible); el `PUT` edita nombre y estado; el borrado es lógico y compacta posiciones a `1..n`; el alta se rechaza con 422 `errors.production` si el artista de la producción está `inactivo`. Editar y borrar siguen permitidos en ese caso.
2. **Frontend, rutas:** `/producciones/:productionId/canciones/nueva` y `/canciones/:id/editar`, con enlace «Nueva canción» en `ProductionEditPage`. La edición se alcanza por URL o tras el alta: es un **apaño temporal que HU-11 (`TS-22`) debe sustituir** enlazando cada canción desde la producción.
3. **Frontend, borrado:** `AlertDialog` ya en esta HU, con el mismo patrón que HU-08. HU-12 solo ampliará el texto con la cascada.
4. **Frontend, tras el alta:** a la edición de la canción con «Canción registrada.».
5. **Frontend, forma del formulario:** un solo `songInputSchema` con `status` opcional y un `SongForm` con las props `withStatus` (la edición pinta el `<select>`) y `notFoundMessage` (solo el alta traduce el 404 a «La producción no está disponible.»; un 404 del `PUT` da el aviso genérico).
6. **No se muestra `position`** en el frontend: es del listado (HU-11).

## 4. Evidencia

- **Backend:** suite 303 tests en verde + 1 skip; Pint y Larastan limpios. C3: 50 mutaciones y 4 sobrevivieron; se endureció el test #5 (`count()+1`) y se añadieron #29–#30 (relaciones del modelo).
- **Frontend:** suite 138 tests; Prettier, ESLint (solo los 3 warnings de `TS-58`) y build limpios. C3: 35 mutaciones, 31 en rojo a la primera. Se endurecieron los tests 1 (`GET` de la canción creada) y 12 (respuesta distinta de lo escrito) y se añadió el 22 (404 del `PUT`); repetidas, las tres en rojo. La cuarta (`setQueryData` del alta) es equivalente y está justificada en la spec.
- **CI:** sin correr todavía, porque no hay PR (trampa de v23).

## 5. Archivos de la sesión

- **Backend (humano):** migración `create_songs_table`, `Song`, `SongStatus`, `SongFactory`, `SongPolicy`, `StoreSongRequest`, `UpdateSongRequest`, `UniqueSongName`, `SongService`, `SongResource`, `SongController`, rutas en `routes/api.php` y `Production::songs()`.
- **Backend (agente, tests):** `SongStoreTest`, `SongShowTest`, `SongUpdateTest`, `SongDeleteTest`, `SongModelTest`, filas en `MinimumSchemaTest` y `ApiRouteProtectionTest`.
- **Frontend (humano):** `routes/songs/songSchema.ts`, `songApi.ts`, `SongForm.tsx`, `SongCreatePage.tsx`, `SongEditPage.tsx`; rutas en `App.tsx`; enlace en `ProductionEditPage.tsx`.
- **Frontend (agente, tests):** `SongCreatePage.test.tsx`, `SongEditPage.test.tsx`, el caso del enlace en `ProductionEditPage.test.tsx` y las rutas en `App.test.tsx`.
- **Docs:** las dos `HU-10.md` y `docs/backlog/sprints/sprint-02.md` (`ts-10.01`–`ts-10.08`).

## 6. Trampas operativas

1. **Una migración nueva no llega sola a la base local.** Pest usa `RefreshDatabase` y monta el esquema en cada ejecución, así que la suite pasa aunque `sail artisan migrate` nunca se haya corrido. Síntoma: 500 con `relation "songs" does not exist`. Antes de probar en local una HU con migración: `sail artisan migrate:status`. En staging pasará lo mismo mientras D9.2 siga abierto.
2. **`useParams` no conoce las rutas declaradas:** devuelve `Record<string, string | undefined>`. Un nombre mal escrito (`ProductionId` en vez de `productionId`) compila, vale `''` por el valor por defecto y produce URLs como `/api/v1/productions//songs`. Solo lo detecta un test que compare la URL exacta.
3. **Vitest no comprueba tipos.** Un componente usado sin `import` en `App.tsx` da `ReferenceError` en ejecución y tumba **todos** los tests de `App.test.tsx` y `main.redirect.test.tsx`, no solo los nuevos. `tsc -b` lo marca antes.
4. **Un simulador de API que responde a cualquier `GET` esconde la navegación a un id equivocado.** Al afirmar el destino tras un alta, comprobar también la URL del `GET` siguiente.
5. **Para probar que el formulario pinta la respuesta del servidor, la respuesta debe diferir de lo escrito;** si no, quitar el `setQueryData` no se detecta.
6. **Un test que importa un módulo de otra HU pone en rojo todo su archivo durante la fase roja.** Por eso el test 20 monta el alta de canción como marcador y la página real la afirma `App.test.tsx`.
7. **El `detail` del 500 incluye SQL y valores** cuando `APP_DEBUG=true` (`bootstrap/app.php:182`). En local es esperable; staging y producción deben tener `APP_DEBUG=false`. Está pendiente comprobarlo en Railway.
8. Siguen vigentes de v23–v24: `findBy…` y la rama pendiente, `conPrecarga` siempre 200, el 405 → 500 del manejador D3.1 (sin tarea), `APP_LOCALE=en` en el `.env` local y que el CI solo corre con una PR abierta hacia `main`/`develop`.

## 7. Próximos pasos ordenados

1. **Abrir la PR de `feature/TS-21-songs-crud` hacia `develop`**, esperar el CI en verde y mergear. Luego mover TS-21 a «Listo» y marcar el checklist en Jira.
2. **Sprint 2 cierra el 2026-10-16:** evidencia de tesis TS-46 (`ts-35.s2.01`–`.04`) y TS-53; calidad S2 de TS-35…TS-37 (`ts-24/25/26.s2.01`); reunión con el docente guía (TS-62).
3. Resolver **D9.2** para desbloquear `ts-06.09`–`ts-08.09` y `ts-10.09`. Al hacerlo, incluir la migración de `songs` y comprobar `APP_DEBUG=false` en staging.
4. **Sprint 3:** TS-20 (HU-09, máximo de canciones por formato) sobre la tabla `songs`, y TS-22 (HU-11), que debe sustituir el apaño de navegación de §3.2.
5. Pendientes heredados de v24: tarea para el 405 → 500 de D3.1; las correcciones de Auth0 y D2.1 en el documento de tesis; los ajustes de Jira (objetivo de `TS Sprint 2`, crear `TS Sprint 3`, SP de TS-40, épicas, TS-61).
