# Handoff v18 — Track Studio

**Fecha:** 2026-10-07 · **Sprint:** 2 · **Capa(s):** backend / documentación
**Foco de la sesión:** aprobar la spec backend de `TS-19` (HU-08) y completar `ts-08.02` en fase RED.

> Continúa [`HANDOFF_v17.md`](HANDOFF_v17.md). Rama observada: `feature/TS-19-productions-crud`. El agente escribió documentación y tests; no escribió código de aplicación, Git ni Jira.

## 1. Resumen ejecutivo

El humano aprobó [`../../specs/backend/HU-08.md`](../../specs/backend/HU-08.md). Se marcaron `ts-08.01` y `ts-08.02` como cumplidas en `sprint-02.md`.

La batería backend de HU-08 quedó escrita y comprobada en rojo. Sus 69 casos ejecutables fallan por las ausencias previstas: tabla `productions`, modelo/factory/enum y rutas de la feature. No hay fallos de sintaxis ni fixtures inventados.

## 2. Tests añadidos o ampliados

- `tests/Feature/MinimumSchemaTest.php`: columnas, PK/FK sin cascada, `CHECK`, ausencia de default, índice de FK y único parcial; ejercicios reales de unicidad en PostgreSQL.
- `tests/Feature/ApiRouteProtectionTest.php`: inventario de las cuatro rutas, middleware exacto y restricción UUID.
- `tests/Feature/ProductionModelTest.php`: cast del formato y relaciones `Production::artist()` / `Artist::productions()`.
- `tests/Feature/ProductionStoreTest.php`: alta, estados del artista, validación, tres formatos, unicidad, campos controlados y RBAC.
- `tests/Feature/ProductionShowTest.php`: Resource exacto, 404 real y RBAC.
- `tests/Feature/ProductionUpdateTest.php`: edición, artista inactivo, unicidad, inmutabilidad de `artist_id`, validación, 404 y RBAC.
- `tests/Feature/ProductionDeleteTest.php`: soft delete con 204 vacío, artista inactivo, 404 y RBAC.
- `tests/Datasets/Producciones.php` y helpers en `tests/Pest.php`.

## 3. Evidencia

- Sintaxis PHP: limpia en los nueve archivos de test tocados.
- Pint dentro de Sail: verde.
- PHPStan dentro de Sail: verde, 0 errores.
- Suite previa: 128 casos pasan y 1 se omite al excluir los dos archivos compartidos modificados; dentro de `MinimumSchemaTest`, los 8 casos preexistentes también pasan.
- RED TS-19: 69 fallos esperados; 34 assertions por rutas/tabla ausentes y 35 errores por `App\\Models\\Production` ausente. Los 8 casos preexistentes de esquema permanecen verdes en esa ejecución.
- El `.env` local conserva locale inglés: sin inyectar `APP_LOCALE=es`, 7 casos previos de mensajes en español fallan. Con la variable inyectada pasan. No se modificó `.env`.

## 4. Próximo paso exacto

El humano implementa `ts-08.03` hasta Green, siguiendo este orden sugerido:

1. `ProductionFormat`, `Production`, `ProductionFactory` y relaciones.
2. Migración `create_productions_table` exactamente desde `modelo-sprint-2.md` §5.
3. `ProductionPolicy` y las cuatro rutas con `whereUuid`.
4. `StoreProductionRequest`, `UpdateProductionRequest` y regla única por artista.
5. `ProductionService`, `ProductionResource` y `ProductionController`.
6. Ejecutar dentro de Sail: Pint → PHPStan → Pest con `APP_LOCALE=es`.

Después, el agente revisa el diff humano y ejecuta C3 antes del commit.

## 5. Pendientes y trampas

- Jira no fue modificado: reconciliar `ts-08.10`, marcar `ts-08.01`/`ts-08.02` y pasar `TS-19` a `En curso` con autorización humana.
- La precondición `exigirRuta()` de los 404 debe mantenerse: evita verdes falsos por ruta ausente.
- D9.2 no bloquea el Green local, pero impide demostrar la migración en staging hasta decidir el mecanismo de deploy.
- Los contenedores de Sail quedaron levantados para continuar el Green.

## 6. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
