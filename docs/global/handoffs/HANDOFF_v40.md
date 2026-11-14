# Handoff v40 — Track Studio

**Fecha:** 2026-11-13 · **Sprint:** 4 · **Capa(s):** global, backend y frontend
**Foco de la sesión:** `TS-85`, dashboard parcial del productor (alcance nuevo pedido por el tutor guía): registro, specs, rojo, Green y review de ambas capas.

## 1. Resumen ejecutivo

`TS-85` recorrió `.01`..`.08` en la rama `feature/TS-85-dashboard-parcial`. El backend sirve `GET /api/v1/dashboard` y el frontend muestra `/dashboard` con cuatro tarjetas y la actividad reciente. Las dos capas están en verde:

- **Backend:** Pint, Larastan y Pest (489 pasan, 3 saltados ya existentes).
- **Frontend:** Prettier, ESLint (0 errores) y Vitest (338/338), más el build.

En el C3, 12/12 mutaciones del backend se pusieron en rojo; en el frontend, 14/14 tras cerrar un hueco. Falta el commit del Green, el PR y la comprobación en staging (`.09`).

## 2. Qué se hizo

- **Registro (2026-11-12):** Story `TS-85` en Jira (bajo `TS-4`, 3 SP, `TS Sprint 4`) con sus criterios de aceptación. La decisión quedó en `roadmap.md` («Reglas de alcance»), `CLAUDE.md` §5, `jira-key-map.md` y `sprint-04.md`.
- **Backend:** [`docs/specs/backend/TS-85.md`](../../specs/backend/TS-85.md).
  - `DashboardController` (invocable), `DashboardService` y `DashboardResource`, más la ruta con la Gate `perform-producer-action`.
  - Tests en `tests/Feature/DashboardTest.php`; la ruta nueva se añadió al inventario de `ApiRouteProtectionTest`.
- **Frontend:** [`docs/specs/frontend/TS-85.md`](../../specs/frontend/TS-85.md).
  - Archivos nuevos: `routes/dashboard/dashboardApi.ts` y `DashboardPage.tsx`, con su test.
  - La ruta va en `App.tsx` bajo `RequireRole` del productor, y el enlace «Dashboard» en `AppShell`.
  - `versionTitle` ahora acepta `Pick<Version, 'label' | 'version_number'>`.
- **Commits del equipo:** `ddd39c6` (alcance y spec backend) y `52520ee` (rojo del backend). El resto está sin commitear.

## 3. Decisiones tomadas en esta sesión

Todas son decisiones del equipo:

1. **Dashboard parcial como Story nueva**, no como HU del Anexo C. Solo usa las tablas existentes, sin migraciones. Suma 3 SP sobre los 92 de la baseline.
2. **`/me` no cambia** y la ruta del dashboard es `/dashboard`. `Home` sigue redirigiendo a `/me`.
3. **Solo el productor.** El dashboard del artista espera a HU-20/HU-21.
4. **Solo cuentan las versiones `verificada`.** `pendiente` y `fallida` no son métrica.
5. **Tarjetas con números, sin librerías de gráficas.**
6. **La actividad reciente muestra el artista** de la producción (2026-11-13, antes del commit). Contrato ampliado con `artist` (`id`, `name`), AC de Jira actualizados. C3 de la enmienda: quitar el eager loading del artista y no pintarlo se ponen en rojo.

## 4. Trampas y hallazgos

- **`SUM` de PostgreSQL llega como cadena.** `SUM(bigint)` devuelve `numeric` y PDO lo entrega como string. El Service convierte a `int` y `coalesce` evita el `null` sin filas. El test 2 usa `toBe`, no `toEqual`, para cazarlo.
- **Las factories crean padres en cascada.** `Song::factory()` y `Version::factory()` crean producción y artista si no se les pasa el padre, y eso falsea los conteos. Los tests del dashboard siempre pasan el padre.
- **Toda versión verificada tiene `duration_ms`.** El CHECK `versions_verified_complete_check` ya lo impone, así que la regla «nulo cuenta 0» sobraba y se quitó de la spec.
- **`es-EC` formatea la hora en 12 horas** («8:30 p. m.»): una expectativa con «20:30» falla.
- **C3 del orden de la lista:** con fechas que ya llegan ordenadas, ordenar en el cliente no rompe nada. Para probar «el orden es el del servidor» hacen falta al menos tres fechas sin orden monótono.
- **Ruta nueva → `ApiRouteProtectionTest`.** Ese inventario falla a propósito con cada ruta nueva. Es lo esperado, no una regresión.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| La regla «`duration_ms` nulo cuenta 0» contradecía el CHECK de `versions` | `docs/specs/backend/TS-85.md` | Corregido |
| De v39 sin tocar: hueco de la barra móvil de `AppShell`, «humano» en Jira, Auth0 v7/D2.1 en la tesis | — | Sin cambios |

## 6. Bloqueos y pendientes

- **Git:** commit del Green y PR de `TS-85` a `develop`.
- **`.09` (equipo):** comprobar `/dashboard` en staging con datos reales del seed. El artista no debe ver el enlace y debe recibir 403 en la API.
- **Jira:** marcar `.01`..`.08` de `TS-85` cuando el equipo lo confirme.
- **ABIERTOS del ADR:** 8.5 y 11.5, sin cambios y sin bloquear.
- **De v39:** `TS-72`, `TS-35`..`TS-37`, `TS-46` y el arrastre del S3.

## 7. Próximos pasos

1. Commit y PR de `TS-85`; comprobación en staging.
2. `TS-72` (UI de canciones), que sigue pendiente en S4.
3. Cierre del S4: el sprint de Jira cierra el 2026-11-16.

## 8. Cómo retomar el entorno

- **Backend:** `./vendor/bin/sail up -d` (Sail estaba apagado al empezar la sesión).
- **Frontend:** `npx vitest run --maxWorkers=2`.
- **Scripts de C3:** están en el scratchpad de la sesión y no se versionan. Restauran cada archivo desde una copia, sin git.
