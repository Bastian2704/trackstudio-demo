# Handoff v20 — Consolidado v11–v20

**Fecha:** 2026-10-07 · **Sprint:** 2 · **Capa(s):** global / backend / frontend
**Propósito:** consolidar los handoffs v11–v20. Los originales se conservan como evidencia detallada.

## 1. Estado ejecutivo

Sprint 2 está activo sobre la baseline de 12 semanas (2026-09-21 a 2026-12-11). El ERD completo está aprobado y el slice de `productions` habilitó TS-19.

El backend de TS-19 / HU-08 está terminado en el árbol de trabajo de `feature/TS-19-productions-crud`: spec aprobada, tests vistos en rojo, CRUD singular implementado, review sin hallazgos abiertos y C3 demostrada. La Story aún no está Done: faltan frontend, integración por PR/CI, demostración en staging y actualización humana de Jira.

## 2. Entregas consolidadas

| Trabajo | Estado técnico | Evidencia principal |
| --- | --- | --- |
| TS-15 / HU-04 RBAC | Implementado y revisado; integración/staging pendiente | Backend integrado en `develop`; frontend con guards, `/403` y 21 tests verdes. |
| TS-60 / replanificación | Integrada documentalmente | Baseline de 12 semanas, seis sprints y Sprint 2 con 15 SP equivalentes. |
| TS-16 / HU-05 artistas | Backend integrado; frontend implementado | Backend con 137 tests y 1 skip en v16; frontend en rama/PR pendiente según v16. |
| TS-49 / ERD | Diseño aprobado | `modelo-sprint-2.md` y `modelo-completo.md`; DDL validado en transacción. Cierre administrativo de Jira/PR pendiente. |
| TS-19 / HU-08 producciones | Backend listo para commit | CRUD, esquema y C3 descritos en §3. |

## 3. TS-19 backend: estado verificable

### Contrato implementado

- Tabla `productions` con PK/FK UUID, `CHECK` de formato, índice de FK, índice único parcial insensible a mayúsculas y soft delete.
- Enum, modelo, factory y relaciones `Production::artist()` / `Artist::productions()`.
- `POST`, `GET`, `PUT` y `DELETE /api/v1/productions`, con `auth:auth0-api`, Policy de productor y `whereUuid` en rutas parametrizadas.
- Form Requests, regla de unicidad por artista, Service, Resource y Controller; `artist_id` es inmutable después del alta.
- Alta permitida para artistas `invitado`/`activo`; `inactivo` recibe 422 solo en el alta. Las producciones existentes siguen siendo consultables, editables y borrables.

### Evidencia final

```bash
cd backend
./vendor/bin/sail pint --test
./vendor/bin/sail php vendor/bin/phpstan analyse --no-progress --memory-limit=2G
./vendor/bin/sail pest tests/Feature/MinimumSchemaTest.php tests/Feature/ApiRouteProtectionTest.php tests/Feature/ProductionModelTest.php tests/Feature/ProductionStoreTest.php tests/Feature/ProductionShowTest.php tests/Feature/ProductionUpdateTest.php tests/Feature/ProductionDeleteTest.php
./vendor/bin/sail exec -e APP_LOCALE=es laravel.test php vendor/bin/pest
```

- Pint: PASS.
- PHPStan: 0 errores.
- TS-19: 77 tests, 379 aserciones.
- Suite completa: 205 tests, 974 aserciones y 1 skip previsto (`AUTH0_TEST_ACCESS` no configurado para el token real de Auth0).
- C3: 34 mutaciones temporales detectadas y restauradas; cubrieron esquema, rutas, Policy, validación, estado del artista, unicidad, campos controlados, Resource, persistencia y soft delete.

## 4. Decisiones y límites que siguen vigentes

- D3.1 centraliza errores; los controladores no formatean errores.
- D4.5 usa soft delete sin `ON DELETE CASCADE`; las cascadas futuras son explícitas en Services.
- D4.6 usa enums backed y `Rule::enum()`; PostgreSQL conserva `varchar + CHECK` para formatos.
- D4.8 toma el rol del claim Auth0; la autorización fina usa Policies.
- No se adelantan canciones, audio, S3, comentarios, accesos ni sesiones; siguen fuera de alcance de S2 para HU-08.
- D8.5, D9.2, D9.4 y D11.5 continúan abiertos. D9.2 no bloquea Green local, pero sí la evidencia de migración en staging.

## 5. Trampas operativas

- Para la suite completa local, inyectar `APP_LOCALE=es`; el `.env` local puede conservar inglés.
- No aceptar `foreignUlid()` para relaciones a `artists.id`: la columna es UUID y requiere `foreignUuid()`.
- Mantener `whereUuid('production')`: el 404 HTTP puede coincidir sin él, pero `ApiRouteProtectionTest` valida la restricción estructural.
- La unicidad de nombre tiene una carrera residual: dos escrituras simultáneas pueden competir tras validar; PostgreSQL protege el dato, pero la segunda puede devolver 500. Se acepta bajo el supuesto actual de un único productor (D8.1).
- No incluir `.php-cs-fixer.cache`; está ignorado en la raíz.
- No registrar tokens ni secretos en documentación, terminal compartida o Git.

## 6. Estado de Git y cierre pendiente

Rama observada: `feature/TS-19-productions-crud`.

El agente no ejecutó escrituras de Git. Al cerrar esta sesión quedan cambios de TS-19 y documentación sin commit. Antes de publicar, el humano debe revisar el diff, commitear unidades atómicas, hacer push y abrir un PR hacia `develop`; nunca hacer push directo a `main` o `develop`.

## 7. Próximos pasos ordenados

1. Revisar y ejecutar los commits atómicos de TS-19 entregados al cierre de esta sesión.
2. Publicar la rama y abrir PR hacia `develop`; esperar CI verde.
3. Actualizar Jira manualmente: `ts-08.03` y `ts-08.04` están completos; TS-19 permanece en curso hasta frontend e integración.
4. Resolver D9.2 antes de demostrar la migración en staging; después verificar el CRUD con productor y el rechazo por rol artista.
5. Continuar TS-19 con `ts-08.05` (spec frontend), o iniciar TS-17 solo donde no dependa de la demostración completa de producciones.

## 8. Historial consolidado

- v11: frontend de TS-15 Green y C3.
- v12: baseline de 12 semanas y Sprint 2 sincronizado.
- v13–v14: TS-16 backend, RED → Green → C3.
- v15: ERD completo y slice de `productions` aprobados.
- v16: mensajes backend en español y frontend de TS-16.
- v17–v19: TS-19, spec → RED → persistencia Green.
- v20: TS-19 backend completado, C3 y cierre documental.
