# Handoff v22 — Track Studio

**Fecha:** 2026-10-08 · **Sprint:** 2 (2026-10-05 → 2026-10-16) · **Capa(s):** backend / frontend
**Foco de la sesión:** backend de `TS-17` (HU-06) desde los tests en rojo hasta el review C3, con el humano implementando paso a paso; borrador de la spec frontend.

> Continúa [`HANDOFF_v21.md`](HANDOFF_v21.md). Rama: `feature/TS-17-artists-list`, PR **#36** hacia `develop` en **borrador**.

## 1. Estado ejecutivo

- **TS-19:** PR #33 integrada en `develop` (`d54e97d`). En Jira está en «Pendiente de Verificación»; solo falta `ts-08.09` (staging), bloqueado por **D9.2**.
- **TS-17:** backend terminado (`ts-06.01`–`ts-06.04` marcados en Jira y en `sprint-02.md`). La spec frontend [`../../specs/frontend/HU-06.md`](../../specs/frontend/HU-06.md) está en **borrador** y **espera aprobación del humano (C1)** antes de escribir tests.
- La PR #36 queda en borrador hasta que entre el frontend, para mergear la historia completa (mismo criterio que TS-19).

## 2. Jira

- `TS-17`: descripción actualizada (checklist `ts-06.01`–`ts-06.04` marcado; referencias a las specs sin «(pendientes)») y comentario con la evidencia del backend (rojo en CI, verde, C3, PR #36).
- El humano corrigió el «(pendientes)» de `TS-19`.

## 3. Decisiones de la sesión

1. **Rojo esperado corregido en la spec backend §4:** el `GET` sin ruta no da 404, sino 500 (ver §6, trampa 1).
2. **Evidencia de la fase roja recuperada sin reescribir historia:** rama temporal sobre el commit rojo `18ba449` y PR en borrador #34, cerrada sin merge. [Job en rojo](https://github.com/Bastian2704/trackstudio-demo/actions/runs/37823056507/job/113468747412). Registrado en la spec backend §6.
3. **Mensajes de commit en inglés** a partir de ahora (petición del humano).
4. **Spec frontend: propuestas pendientes de aprobación** (registro de cambios de la spec): ruta `/artistas`; página en la URL (`?page=N`); producciones como enlaces «nombre · formato»; «Nueva producción» en la columna Acciones, que sustituye el apaño de TS-19 conservando la ruta anidada; enlace «Volver al listado» en las páginas de HU-05; sin columna de fecha mientras D3.2 siga abierto. Revisada contra Figma `1:373`.

## 4. Evidencia

- **Backend:** suite 218 verdes + 1 omitido; Pint y Larastan limpios (con `APP_LOCALE=es`, ver §6).
- **C3:** 18 mutaciones sobre controlador, Resource, Policy y rutas, todas en rojo. La de quitar el desempate por `id` de las producciones quedó verde en la primera pasada (dos producciones empatadas, la base acertaba por azar); se reforzó el test #5 con cinco empatadas y pasó a rojo en 3 de 3 ejecuciones.

## 5. Archivos de la sesión

- **Specs:** `docs/specs/backend/HU-06.md` (rojo esperado, evidencia, implementada, C3); `docs/specs/frontend/HU-06.md` (nueva, borrador).
- **Tests (agente):** `backend/tests/Feature/ArtistIndexTest.php` (nuevo); `ArtistShowTest.php` (ausencia de `productions`); `ApiRouteProtectionTest.php` (inventario).
- **Código (humano):** `ArtistPolicy::viewAny`, ruta `GET /artists`, `ArtistController::index`, `productions` con `whenLoaded` en `ArtistResource`.
- **Backlog:** `docs/backlog/sprints/sprint-02.md` — marcados `ts-06.01`–`ts-06.04` y `ts-08.05`–`ts-08.08` (estos últimos estaban hechos desde v21 pero sin marcar).

## 6. Trampas operativas

1. **Un 405 sale como 500 `INTERNAL_ERROR`.** El manejador D3.1 de `bootstrap/app.php` no mapea `MethodNotAllowedHttpException`. Se ve al pedir un método no registrado sobre una URI que sí existe. **Hallazgo sin tarea:** conviene abrir un `fix/` o una task en Jira.
2. **`.env` local del humano con `APP_LOCALE=en`** (el `.env.example` y el CI usan `es`): 7 tests de validación en español fallan solo en local. Arreglo: cambiar esa línea a `es`. Mientras tanto: `sail exec -e APP_LOCALE=es laravel.test php vendor/bin/pest`.
3. **El editor del humano formatea PHP con otra regla que Pint** (`{}` → `{\n}`, `new X()`): pasar `sail pint` antes de commitear o apuntar el editor a Pint.
4. **`whenLoaded('x')` sin closure devuelve `MissingValue`** cuando la relación no está cargada; encadenarle `->map()` revienta en `show`/`store`/`update`. La transformación va como segundo argumento.
5. **Orden con empates y UUID:** Laravel genera UUID ordenados por tiempo; para probar un desempate por `id` hay que fijar los `id` a mano y usar varios empatados, o la base acierta por azar.
6. **Pest no tiene `assertExactJsonPath`** en esta versión; `assertJsonPath` ya compara estricto.
7. **CI solo corre en `pull_request` hacia `main`/`develop`** (y en `push` a esas ramas): un push a una feature sin PR no deja evidencia. Abrir la PR (en borrador) **antes** de empujar el commit rojo.

## 7. Próximos pasos ordenados

1. **Aprobar (o ajustar) la spec frontend de HU-06** — las propuestas del §3.4.
2. `ts-06.06`: tests frontend en rojo (`ArtistListPage.test.tsx`, enlaces en `ArtistEdit/CreatePage`, ruta en `App.test.tsx`). Push del commit rojo con la PR #36 ya abierta, para que el CI lo registre.
3. `ts-06.07`/`ts-06.08`: Green del humano y review C3.
4. Resolver **D9.2** para desbloquear `ts-08.09` y `ts-06.09` en staging.
5. Abrir tarea para el 405 → 500 del manejador D3.1.
6. Quedan en el sprint `TS-18` (HU-07) y `TS-20` (HU-09); cierre el 2026-10-16. Candidatos a recorte: TS-20 o TS-18.
7. Pendiente sin fecha: llevar al documento de tesis las correcciones de Auth0 (`auth0/login` v7) y de versiones (D2.1), CLAUDE.md raíz §6.
