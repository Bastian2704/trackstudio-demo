# Handoff v9 — Track Studio

**Fecha:** 2026-10-01 · **Sprint:** 1 · **Capa(s):** backend / global
**Foco de la sesión:** aprobar el modelo mínimo de `TS-54` y llevar el backend de `TS-15` desde la spec hasta un PR revisable.

> Continúa [`HANDOFF_v8.md`](HANDOFF_v8.md). Jira de MediHealth sigue siendo la fuente de verdad del estado; este documento registra la evidencia técnica y los pendientes para retomar el trabajo.

## 1. Resumen ejecutivo

El modelo mínimo de `users` y `artists` de `TS-54` quedó aprobado e integrado en `develop` mediante el PR [#23](https://github.com/Bastian2704/trackstudio-demo/pull/23) (`e5ec712`). Sobre esa base, el backend de HU-04 quedó implementado en `feature/TS-15-rbac`: migraciones y modelos mínimos, autenticación stateless sin sesiones persistentes, una Policy/Gate por rol y `POST /api/v1/rbac-check` con el contrato 401/403/204.

Dentro de Sail pasan Pint, PHPStan nivel 5 y Pest (**71 pruebas verdes, 1 omitida y 261 aserciones**). El omitido es la comprobación opcional con `AUTH0_TEST_ACCESS_TOKEN`. El PR **#24** está abierto hacia `develop`, todos sus checks están verdes y el review pidió añadir este handoff antes de aprobarlo. Esto cierra técnicamente el bloque backend (`ts-04.01` a `ts-04.04`), pero **no cierra `TS-15`**: su frontend, los usuarios sintéticos y la integración en staging siguen pendientes.

## 2. Qué se hizo

| Unidad | Estado técnico | Evidencia |
| --- | --- | --- |
| `TS-54` — modelo mínimo | Aprobada e integrada | [`../../erd/modelo-minimo-sprint-1.md`](../../erd/modelo-minimo-sprint-1.md) · PR #23 · `e5ec712` |
| `TS-15 ts-04.01` — spec backend | Aprobada | [`../../specs/backend/HU-04.md`](../../specs/backend/HU-04.md) |
| `TS-15 ts-04.02` — tests backend | Hecha | `MinimumSchemaTest`, `RbacTest` y `ApiRouteProtectionTest`; fase Red observada antes de implementar |
| `TS-15 ts-04.03` — código backend | Hecha en la rama | Esquema mínimo, modelos/factories, Policy/Gate y sonda RBAC; Pint, PHPStan y Pest en verde |
| `TS-15 ts-04.04` — review backend | Hecha | Diff auditado; controles RBAC y cero consultas probados mediante mutaciones deliberadas |
| PR #24 | Abierto, CI verde | `feature/TS-15-rbac` → `develop`; aprobación pendiente después de incorporar este handoff |

Commits de la rama antes del cierre documental:

- `3f5496c` — spec aprobada y pruebas rojas de RBAC.
- `6da9590` — esquema mínimo stateless.
- `bbd517d` — modelos y factories del esquema mínimo.
- `adc4a95` — autorización RBAC stateless.

La revisión C3 comprobó, entre otros, estos rojos deliberados:

- quitar `auth:auth0-api` rompe el 401, el acceso del productor y el inventario de rutas;
- quitar `can:perform-producer-action` deja entrar al artista y rompe el inventario;
- permitir siempre en la Policy convierte el 403 del artista en 204;
- negar siempre convierte los 204 del productor en 403;
- introducir una consulta SQL hace fallar la garantía de cero consultas.

## 3. Decisiones tomadas en esta sesión

- **`users.email` nullable y único.** El access token garantiza `sub`, no `email`; PostgreSQL permite varias filas con `NULL` y evita repetir correos presentes. La decisión vive en el modelo aprobado de `TS-54`.
- **El rol no se persiste.** `Role` llega exclusivamente desde el claim del JWT de Auth0 (D4.8); no existe `users.role` ni una segunda fuente de autorización.
- **`production_access` se difiere.** Su FK depende de `productions`, fuera del Sprint 1. Tampoco se crean tablas funcionales no aprobadas.
- **Provisión JIT diferida.** `TS-15` no crea ni consulta usuarios locales durante autenticación; el vínculo `artists.user_id` se resolverá con el flujo de invitación/onboarding de HU-05+.
- **API stateless sin sesiones persistentes.** Se eliminó la tabla `sessions` de la migración inicial y el entorno de referencia usa `SESSION_DRIVER=array`. Reintroducir sesiones server-side requiere una decisión y contrato futuros.
- **Sonda temporal de RBAC.** `POST /api/v1/rbac-check` no recibe cuerpo ni toca la base: sin token devuelve 401, un artista recibe 403 y un productor recibe 204.

## 4. Trampas y hallazgos (lo que costó tiempo)

1. **Larastan pudo fallar con `Undefined constant Larastan\\Larastan\\LARAVEL_VERSION`.** Era un problema de caché/arranque, no del diff. La comprobación autoritativa es dentro de Sail; `sail php vendor/bin/phpstan clear-result-cache` seguido de `analyse --debug` volvió a dejar 0 errores. No usar el PHP del host como evidencia de paridad.
2. **Mutar el orden o retirar middleware produce síntomas distintos.** Sin autenticación, el Gate puede responder 403 antes de construir un usuario; por eso el inventario exige explícitamente `auth` antes de `can`.
3. **La autorización podía quedar verde consultando la base.** El caso que cuenta consultas se mutó introduciendo una consulta y falló con `1 !== 0`; protege de provisión JIT accidental en esta etapa.
4. **Pint puede modificar archivos al ejecutarse sin `--test`.** Después de cada arreglo se volvió a revisar el diff y a correr la cadena dentro del contenedor.
5. **`.php-cs-fixer.cache` apareció como archivo local no versionado.** Se retiró antes del commit; no forma parte del PR.

## 5. Drift detectado

- La spec backend todavía figuraba como no implementada y describía la eliminación de `sessions` como propuesta. Se corrige junto con este handoff.
- La casilla histórica `ts-04.03` menciona sobrescribir `unauthenticated()`. No se implementó porque el manejador D3.1 existente ya traduce `AuthenticationException` correctamente; la spec backend documenta el motivo. Jira debe reflejar el resultado real sin exigir código paralelo.
- [`../../specs/backend/HU-03.md`](../../specs/backend/HU-03.md) conserva duplicaciones y referencias anteriores sobre `production_access` y la provisión local. No se toca en este PR: el equipo que termina `TS-14` asumió su reconciliación.
- La spec frontend de HU-04 continúa en borrador. Es correcto: no formó parte de este bloque backend.
- Los documentos de backlog/sprint son snapshots fechados; no se usan para duplicar el estado vivo de Jira.

## 6. Bloqueos y pendientes

- **PR #24:** necesita este commit documental, nueva revisión y aprobación antes del merge.
- **`TS-15`:** siguen pendientes `ts-04.05` a `ts-04.08` (frontend), `ts-04.10` (usuarios sintéticos) y `ts-04.09` (integración/demo en staging). La Story permanece abierta.
- **`TS-14`:** permanece abierta y bajo responsabilidad del equipo que completa HU-03; este PR no reconcilia sus pendientes.
- **`TS-13`:** el PR [#22](https://github.com/Bastian2704/trackstudio-demo/pull/22), mergeado a `develop` con CI verde, es la referencia acordada para registrar la evidencia de autodeploy de Railway y Vercel. El ticket no se cierra mientras falten los runs rojos deliberados; la evidencia debe usar enlaces o capturas no secretas de ambos despliegues.
- **`TS-55`:** actualización de seguridad independiente; no se mezcla con HU-04.
- **ADR abierto:** 8.5 rate limiting, 9.2 migraciones en deploy, 9.4 rollback y 11.5 medición de RNF. No bloquearon la sonda stateless, que no consulta las tablas nuevas; 9.2 debe resolverse antes de depender de migraciones automáticas en staging.
- **Stash histórico:** `stash@{0}` contiene únicamente una variante anterior de `HANDOFF_v4.md`, sin código. Su información útil ya está recogida por handoffs posteriores; se puede eliminar cuando el humano lo decida, pero no forma parte del PR.

## 7. Próximos pasos

1. Commit y push de `HANDOFF_v9.md` junto con el cierre de estado de la spec backend.
2. Actualizar la descripción del PR #24: añadir el handoff y marcar el pipeline verde; pedir una nueva revisión.
3. Tras aprobación, mergear hacia `develop` y comprobar el autodeploy sin asumir una política de migraciones todavía no decidida.
4. Verificar en staging, con usuarios sintéticos, los tres resultados de la sonda: 401 sin token, 403 para artista y 204 para productor.
5. Actualizar las casillas backend de Jira, conservando `TS-15` En curso hasta completar frontend e integración.
6. Continuar la spec y pruebas frontend de HU-04; mantener `TS-55` separado.

## 8. Cómo retomar el entorno

La rama es `feature/TS-15-rbac`. La cadena backend se ejecuta desde `backend/`, dentro de Sail:

```bash
./vendor/bin/sail pint --test
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G
./vendor/bin/sail pest
```

El resultado de referencia al cerrar esta sesión es 71 pruebas verdes, 1 omitida y 261 aserciones. El test omitido requiere un access token real mediante `AUTH0_TEST_ACCESS_TOKEN`; no se versiona su valor.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
