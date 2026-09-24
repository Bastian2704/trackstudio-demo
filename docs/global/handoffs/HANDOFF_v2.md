# Handoff v2 — Track Studio

**Fecha:** 2026-09-23 · **Sprint:** 1 · **Capa(s):** backend (+ docs globales)
**Foco de la sesión:** limpieza de Sanctum accidental, auditoría de completitud y fase Green del contrato HTTP de TS-27.

> Continúa [`HANDOFF_v1.md`](HANDOFF_v1.md). El handoff histórico `backend/docs/Handoff backend sprint1.md` sigue siendo útil para el scaffolding y el entorno, pero el estado operativo vigente está aquí.

---

## 1. Resumen ejecutivo

El contrato HTTP de **TS-27** quedó implementado y en Green: catálogo completo de diez códigos, respuestas RFC 9457 con `application/problem+json`, mapeos 401/403/404/422/429/500, protección del mensaje interno de los 500 y enrutado `/api/v1`. El checkpoint humano quedó en `d410ebd` (`feat(backend): TS-27 implementar contrato de errores`).

TS-27 **todavía no se declara cerrada**. La auditoría final detectó que D3.1 promete correlacionar el `trace_id` con Sentry, pero el código actual solo genera y devuelve el ULID: no hay SDK de Sentry instalado ni enlace con un evento reportado. El acuerdo para la próxima sesión es intentar completar esa integración dentro de TS-27, empezando por spec y test rojo.

TS-28 y TS-29 siguen en Red a propósito. La suite focalizada de TS-27 está verde; la suite completa seguirá fallando hasta implementar Auth0 y `/api/v1/me`.

## 2. Qué se hizo

| Tarea | Estado | Evidencia |
| --- | --- | --- |
| **TS-27 — contrato HTTP D3.1** | Spec ✅ · Red ✅ · Green ✅ | `ErrorShapeTest.php`: 12 casos; `ErrorCodeTest.php`: 10 datasets; **22 tests / 95 assertions** verdes dentro de Sail |
| **TS-27 — correlación Sentry** | Requisito detectado · spec/test/Green ⬜ | D3.1 y D9.3 la exigen; no existe integración todavía |
| **TS-27 — C3 final** | Pendiente | Los nuevos rojos fueron observados antes del Green; falta la pasada deliberada de mutaciones sobre la implementación final |
| **TS-28 — JWT + rol** | Spec ✅ · Red ✅ · Green ⬜ | `UserRepositoryTest.php` y `TokenGuardTest.php` siguen fallando por clases/config aún inexistentes |
| **TS-29 — `/api/v1/me`** | Spec ✅ · Red ✅ · Green ⬜ | `MeEndpointTest.php` sigue fallando por ruta e implementación inexistentes |

**Commit de aplicación de la sesión:**

- `d410ebd` — `feat(backend): TS-27 implementar contrato de errores`

**Archivos incluidos en ese checkpoint:**

- `backend/app/Enums/ErrorCode.php`
- `backend/bootstrap/app.php`
- `backend/routes/api.php`
- `backend/tests/Feature/ErrorShapeTest.php`
- `backend/tests/Unit/ErrorCodeTest.php`
- `docs/specs/backend/HU-03.md`

También se eliminó completamente el intento accidental de instalar Sanctum mediante `install:api`: no quedan referencias a `sanctum`, `laravel/sanctum` ni middleware asociado en Composer, bootstrap, config o rutas. `routes/api.php` sí permanece porque D3.1 y el futuro guard de Auth0 necesitan el grupo API, no porque Sanctum sea necesario.

## 3. Decisiones tomadas en esta sesión

1. **RFC 9457 completo implica también el media type.** No basta con que el JSON tenga los campos correctos: el manejador emite `Content-Type: application/problem+json`.
2. **El catálogo D3.1 es una unidad.** Los diez códigos viven desde ahora en `ErrorCode`, aunque los cuatro ligados a audio/S3 todavía no se conecten a excepciones por alcance del Sprint 1.
3. **`title` y `detail` tienen responsabilidades distintas.** `title` es estable por `ErrorCode`; `detail` explica la ocurrencia concreta y puede variar.
4. **La derivación de `type` no usa `Str::kebab()` en esta versión.** Con valores `SCREAMING_SNAKE_CASE` conservaba `_`; se usa una conversión explícita de guiones bajos a guiones.
5. **La correlación con Sentry se intentará dentro de TS-27**, como ya prometen D3.1 y D9.3. Será una segunda unidad lógica y un commit separado; no se mezclará con TS-28/Auth0.
6. **El ULID del contrato sigue siendo propio de Track Studio.** La próxima investigación debe adjuntarlo al evento de Sentry como correlación; no sustituirlo silenciosamente por un identificador interno del proveedor.
7. **La elección de Auth0 v7 sigue vigente.** El 2026-09-23 se volvió a comprobar que el [quickstart oficial](https://auth0.com/docs/quickstart/webapp/laravel/interactive) recomienda `auth0/login:^7` para Laravel 13 y que v8 continúa como prerelease en las [releases oficiales](https://github.com/auth0/laravel-auth0/releases).

## 4. Trampas y hallazgos (lo que costó tiempo)

### 4.1 `install:api` no era necesario

Registrar `routes/api.php` y el prefijo `api/v1` no requiere Sanctum. La instalación automática añadió piezas fuera de alcance; se revirtió y se comprobó que no quedan referencias. Para TS-28 se usará el guard stateless de `auth0/login`, no Sanctum.

### 4.2 `Str::kebab()` conservó los guiones bajos

`Str::kebab(strtolower('RESOURCE_NOT_FOUND'))` produjo `resource_not_found` en el stack instalado. El contrato exige `resource-not-found`. La transformación quedó centralizada en el enum con `str_replace('_', '-', strtolower(...))` y hay un test literal anti-drift.

### 4.3 Un typo fue detectado por el dataset

El primer Green dejó 9/10 datasets pasando porque el enum decía `UNATHENTICATED`. `ErrorCode::tryFrom('UNAUTHENTICATED')` devolvió `null`, que era exactamente la clase de drift que el test unitario debía detectar. Corregido antes del commit.

### 4.4 Verde focalizado no significa suite completa verde

Los 22 casos de TS-27 están verdes. La suite completa local ejecutó 38 casos: los no verdes restantes corresponden a TS-28/TS-29 (`auth0-api` no configurado, `UserRepository` inexistente y `/me` inexistente). No relajar ni omitir esos tests: son la fase Red de las siguientes tareas.

### 4.5 El `trace_id` todavía no correlaciona nada externo

El ULID se crea dentro del constructor de la respuesta. No existe hoy un mecanismo que entregue ese mismo valor al reporte de excepción ni un SDK de Sentry instalado. Presencia en el JSON y correlación observacional son dos comportamientos distintos; el test actual solo demuestra el primero.

### 4.6 El entorno del agente y la terminal humana no compartieron Docker

Los comandos Sail funcionaron en la terminal humana, pero el agente recibió `Docker or Podman is not running`. Para la revisión, Pint/PHPStan/Pest se ejecutaron también con los binarios locales; PHPStan necesitó `--debug` para evitar un socket paralelo restringido. En el cierre definitivo manda la cadena dentro de Sail descrita en `backend/CLAUDE.md`.

## 5. Drift detectado

| Estado | Drift | Resolución / dueño |
| --- | --- | --- |
| Corregido | La spec recomendaba `Str::kebab()` aunque el resultado conservaba `_` | Corregido en `HU-03.md`; el enum y el test usan el contrato con `-` |
| Corregido | La decisión RFC 9457 completa no tenía una prueba del media type | Spec y `ErrorShapeTest.php` ahora exigen `application/problem+json` |
| Corregido | El ejemplo JSON del ADR usaba `/errors/validation` mientras la regla derivada exige `/errors/validation-error` | Corregido en D3.1; ADR, spec, enum y tests vuelven a coincidir |
| Corregido | HU-03 decía que D4.8 todavía mencionaba Auth0 v4 | El drift solo persiste en la tesis; D4.8 ya estaba corregido y el quickstart oficial sigue recomendando v7 |
| Registrado, pendiente | D3.1/D9.3 dicen que Sentry se liga al `trace_id`; la implementación solo devuelve el ULID | El ADR sigue siendo correcto como decisión. `HU-03.md` registra la deuda de implementación dentro de TS-27 |
| Histórico | `HANDOFF_v1.md` deja TS-27 totalmente en Red | No se sobrescribe; este v2 es el estado vigente |
| Histórico | `backend/docs/Handoff backend sprint1.md` todavía describe dominio/bloque 7 como abiertos | No se reescribe un handoff histórico; v1 y este v2 documentan las decisiones posteriores |
| Pendiente previo | `reglas-git.md` no enumera `test`/`chore`; `HU-04.md` conserva `TS-XXX`; falta la spec frontend HU-03 | Sin cambios en esta sesión; continúan como deuda documental |

## 6. Bloqueos y pendientes

- **Sentry en TS-27:** no está bloqueado por el ADR —D9.3 ya decidió el proveedor—, pero sí requiere investigar la integración oficial compatible con Laravel 13/PHP 8.4 antes de fijar API, paquete o versión. Añadir dependencias y configuración lo hará el humano después del rojo.
- **ADR 3.7:** origen frontend vs. solo backend del `trace_id` sigue abierto y no bloquea; el backend ya genera el ULID. La integración Sentry debe ser compatible con que en el futuro el request aporte ese valor.
- **ADR 8.3:** sigue bloqueando configurar una política de rate limiting. El mapeo `ThrottleRequestsException → RATE_LIMITED` ya existe; al configurar la política habrá que decidir/probar la conservación de `Retry-After` y demás headers.
- **TS-28:** `auth0/login:^7` todavía no está instalado. No mezclar su instalación con Sentry.
- **TS-29:** depende de TS-28 y continúa sin implementación.
- **Cadena completa:** el gate obligatorio dentro de Sail y C3 deben ejecutarse antes de declarar TS-27 terminada.

## 7. Próximos pasos

En la próxima sesión, mantener este orden:

1. Leer este handoff, `HU-03.md` §3.1/§4 y ADR D3.1/D9.3.
2. Consultar documentación oficial para la versión compatible del SDK Laravel de Sentry y confirmar cómo adjuntar un ULID propio al evento sin llamadas reales desde tests.
3. Actualizar primero la spec con el contrato exacto de correlación: qué errores se reportan, dónde vive el ULID y cómo se prueba sin red.
4. Escribir y ejecutar el test rojo. Debe demostrar que el `trace_id` devuelto en un 500 es el mismo que se adjunta al evento/reporte; no basta con afirmar que ambos existen.
5. El humano instala/configura Sentry y escribe el Green. Mantener DSN/credenciales fuera del repo; `.env.example` solo lleva claves vacías.
6. Ejecutar C3 sobre todos los casos TS-27 y el gate dentro de Sail: `pint --test` → PHPStan → Pest focalizado. La suite completa seguirá roja por TS-28/TS-29 hasta implementar esas tareas.
7. Commit sugerido para esa unidad: `feat(backend): TS-27 correlacionar errores 500 con Sentry`.
8. Después de cerrar TS-27, continuar TS-28 sin mezclar los dos SDK en un mismo cambio.

## 8. Cómo retomar el entorno

Rama y checkpoint al cerrar la sesión de aplicación:

```text
feature/TS-27-manejador-excepciones
d410ebd feat(backend): TS-27 implementar contrato de errores
```

Comandos:

```bash
cd /home/shared/Projects/trackstudio-demo/backend
./vendor/bin/sail up -d

./vendor/bin/sail pest \
  tests/Feature/ErrorShapeTest.php \
  tests/Unit/ErrorCodeTest.php \
  --compact
# Estado esperado actual: 22 passed, 95 assertions.

./vendor/bin/sail pint --test
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G

# La suite completa conserva los rojos deliberados de TS-28/TS-29.
./vendor/bin/sail pest --compact
```

El árbol estaba limpio inmediatamente después de `d410ebd`; los únicos cambios posteriores son este handoff, la actualización final de `HU-03.md` y las dos correcciones anti-drift de D3.1 en el ADR.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
