# Handoff consolidado v1–v10 — Track Studio

**Periodo:** 2026-09-17 → 2026-10-02 · **Sprint:** 1 · **Capa(s):** backend / frontend / global / infra
**Qué es:** la unificación de `HANDOFF_v1.md` a `HANDOFF_v10.md` que pide la regla 9 de `PLANTILLA-HANDOFF.md`. Contiene **solo** lo de esos diez. El estado posterior está en `HANDOFF_v11.md` y siguientes.

> Se escribió el 2026-10-05, con retraso: la regla tocaba al cerrar v10. Los originales v1–v10 se conservan como historial. Cuando un dato de aquí choque con un handoff posterior, **manda el posterior**.

---

## 1. Resumen ejecutivo

Sprint 1 llevó Track Studio de un andamiaje sin contrato a un backend autenticado y desplegado en staging:

- Contrato de errores RFC 9457 completo (D3.1), con correlación del `trace_id` en Sentry.
- CORS cerrado (D8.3).
- Endpoint de salud para UptimeRobot (D9.3).
- Autenticación Auth0 en las dos capas (HU-03, `TS-14`).
- Modelo mínimo `users`/`artists` (`TS-54`) y RBAC stateless en el backend (HU-04, `TS-15`).

Jira (proyecto `TS`) volvió a ser la fuente de verdad del estado. Al cerrar v10 quedaban pendientes:

- El merge del arreglo del 401 sin `Accept`.
- El frontend y la integración de HU-04.
- Llevar 9.2 a decisión.
- La tabla `users` vieja de producción.

## 2. Qué se hizo (cronología)

| v | Fecha | Foco | Resultado |
|---|---|---|---|
| v1 | 09-17 | HU-03: spec y Red | 22 tests en rojo; ADR 3.6 cerrado (RFC 9457 completo); CI pasado a PostgreSQL (`91a7d39`). |
| v2 | 09-23 | TS-27 (hoy `TS-51`): Green del contrato HTTP | Catálogo `ErrorCode` de 10 códigos, `application/problem+json`, `/api/v1` (`d410ebd`). Sanctum accidental retirado. |
| v3 | 09-24 | Cierre de TS-27: Sentry | `sentry/sentry-laravel` 4.28.0; el mismo ULID va en la respuesta y en el tag `trace_id` del evento. 25 tests. |
| v4 | 09-25 | TS-40: CORS para el PR de staging | D8.3 decidido (solo CORS), `CorsTest` 7/7, 32 tests. |
| v5 | 09-27 | Smoke test de staging (ts-29.06/07) | Vercel + Railway + Auth0 comprobados de punta a punta; `/api/v1/me` daba 404 porque no existía todavía. |
| v6 | 09-28 | TS-44: `/api/v1/health` | Contrato 200/503 exento de D3.1 (D9.3), 40 tests. |
| v7 | 09-30 | Normalizar Jira, GitHub y docs | Objetivo del sprint en Jira, 46 enlaces `Blocks`, creados `TS-51`..`TS-54`. Rulesets de `main` y `develop` verificados. |
| v8 | 10-01 | TS-14 backend: Green y review | Guard `auth0-api`, rol del claim, `GET /api/v1/me` → `{ sub, role }`. 62 verdes + 1 saltado. Creado `TS-55`. |
| v9 | 10-01 | TS-54 + TS-15 backend | Modelo mínimo aprobado (PR #23). RBAC stateless y sonda `POST /api/v1/rbac-check` 401/403/204. 71 verdes + 1 omitido (PR #24). |
| v10 | 10-02 | Cierre de TS-14 | Spec, tests (Vitest) y review del frontend de HU-03. PR #25 en `develop`. Staging comprobado. Bug del 401 sin `Accept` arreglado en una rama aparte. 72 verdes + 1 saltado. Creado `TS-56`. |

## 3. Decisiones vigentes (con su documento dueño)

**Errores y observabilidad**
- **D3.1, RFC 9457 completo** (3.6 cerrado): `type` derivado del `code` (`_` → `-`, sin `Str::kebab`), `instance`, `application/problem+json`. `title` es estable por código y `detail` es de cada ocurrencia.
- **ADR 3.7 (origen del `trace_id`) sigue ABIERTO, pero no bloquea:** el backend genera el ULID y respetaría un `X-Trace-Id` si algún día llega. De aquí salió la regla de la metodología §8: una decisión abierta no bloquea si la implementación es compatible con todas sus salidas.
- **Sentry:** `Integration::handles($exceptions)` sin captura manual. Un callback reportable añade el tag `trace_id`. Sin DSN no se envía nada y la respuesta no cambia. Evento de prueba confirmado (v7).
- **Health exento de D3.1** (D9.3): claves exactas `status`, `checks` y `timestamp`, sin `environment`, sin throttle mientras 8.5 siga abierto. `/up` y `/api/v1/health` son las dos rutas públicas justificadas frente a RNF-01.

**CORS y autenticación**
- **D8.3, CORS:** solo `api/*`; orígenes desde `CORS_ALLOWED_ORIGINS` (nunca `*` ni patrones); métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`; headers `Authorization, Content-Type, Accept, X-Requested-With`; `max_age 600`; sin credenciales. El rate limiting pasó a **8.5 ABIERTO**.
- **D4.8, Auth0:** `auth0/login` **v7** (7.22.0) configurado como API stateless pura: `registerGuards`, `registerMiddleware` y `registerAuthenticationRoutes` en `false`. El guard `auth0-api` se declara a mano en `config/auth.php` y apunta a `App\Auth\UserRepository::fromAccessToken()`. No hay middleware propio ni rutas `/login`.
- **El 401 no lleva código propio:** `AuthenticationException` → manejador D3.1. Con `redirectGuestsTo(null)`, la API nunca redirige a un invitado.
- **`/api/v1/me` → `{ sub, role }`**, sin `name` ni `email`: el access token no los trae y el SPA los tiene de `useAuth0().user`. No toca la base de datos.

**Modelo de datos y RBAC (`TS-54` / HU-04)**
- `users.email` es nullable y único.
- **El rol nunca se persiste:** solo viene del claim (D4.8).
- `production_access` queda diferida.
- La provisión JIT se dejó para HU-05+.
- La tabla `sessions` se eliminó (`SESSION_DRIVER=array`).

**Frontend de HU-03**
- El interceptor pide el token en cada request y, sin token, la petición no sale.
- `api` solo acepta rutas relativas.
- `RequireRole`, `useRole` y el test de «token fuera del storage» son de HU-04.

## 4. Trampas y hallazgos (las que siguen siendo útiles)

**Tests**
- **`setImpersonating()` del SDK no pasa por `fromAccessToken()`.** Prueba el rol directamente sobre el repositorio (Unit) y mantén un test de **cableado** que afirme que el provider es nuestra clase. Sin él, la extracción del rol puede no ejecutarse nunca.
- **Un test tiene que fallar por lo que afirma, no de rebote**, por ejemplo con un 404 de ruta inexistente donde se espera un 401. Usa rutas desechables propias cuando haga falta.
- **`expect(null)->toMatch()` da *error*, no *fallo*.** Afirma primero `->toBeString()`.
- **Un test que nace verde** se borra o se justifica como guardarraíl y se comenta en el archivo.
- **401 frente a 500 según `Accept`:** `getJson` ocultaba el redirect a `route('login')`. Los tests de «sin token» también tienen que probar sin `Accept`.
- **El test de fuga a Sentry no podía fallar:** `SetRequestMiddleware` solo se registra si hay DSN. Lo destapó la C3.

**SDK y bibliotecas**
- **El SDK de Auth0 solo acepta JWK con `x5c`**: la clave de prueba lleva un certificado autofirmado. El JWKS de prueba se sirve con un cliente HTTP falso en `config('auth0.guards.default.httpClient')`.
- **Todo test que mande un `Bearer` debe llamar a `configurarSdkDePrueba()`**: en CI, `AUTH0_AUDIENCE` está vacío y el SDK da 500. Para reproducirlo: `sail exec -e AUTH0_AUDIENCE= -e AUTH0_DOMAIN= laravel.test vendor/bin/pest`.
- **Instalar `auth0/login` sin configurarlo** rompe `GET /` con un 500 (falta el guard `auth0-session`). `vendor:publish` con Sail apagado no hace nada.
- **PHPStan no acepta el `__get` de `StatelessUser`**: usa `getAttribute('role')` + `instanceof Role`.
- **`install:api` instala Sanctum sin necesidad.** Para `routes/api.php` no hace falta.
- **CORS con un único origen:** Fruitcake devuelve siempre ese origen. Afirma que el header **no** es el origen ajeno ni `*`; no que falta.
- **Health:** los tests de base de datos caída mockean `DB::select`. Mantén `DB::select('SELECT 1')`.

**Entorno, CI y despliegue**
- **El CI corría contra SQLite** porque `.env.example` decía `sqlite`. Corregido; la compuerta C4 exige PostgreSQL.
- **Permisos dentro del contenedor:**
  - `storage/logs/laravel.log` con dueño root → bórralo.
  - El aviso `pest/.temp/test-run-history` es inofensivo (`sudo chown -R $USER backend/vendor/pestphp/pest/.temp`).
  - PHPStan `Undefined constant LARAVEL_VERSION` → `phpstan clear-result-cache` o `--debug`.
- **`.env` local:** créalo desde `.env.example` + `key:generate`. `DB_HOST=pgsql`, nunca el host interno de Railway.
- **Migraciones:** nunca edites una migración ya aplicada en un entorno; crea una nueva. La de `users` (`bigint` → `uuid`) obligó a resetear staging, y **producción fallará igual**.
- **Railway ejecuta `migrate --force` en cada deploy** sin que el repo lo pida. Es la decisión de hecho sobre 9.2, que sigue abierto.
- **Staging:** usa siempre `https://trackstudio-staging.vercel.app`, nunca el alias de rama (no está en Auth0 ni en CORS).
- **Access token real:** cópialo de la petición XHR a Railway, no de la página `/me`. El token de la pestaña Test de Auth0 es M2M y no trae roles.

**Shell y git**
- **En fish**, `<token>` literal es una redirección: usa `read -s -P "token: " TOKEN`.
- **Git sin editor:** usa `commit --no-edit` o `-m`.
- **Merges de docs:** compara el resultado con los dos padres, porque pueden reaparecer duplicados.
- **Rama creada antes del `pull`:** se resuelve con rebase.
- **Texto pegado en el código:** dos veces entraron bloques markdown en archivos PHP. Revisa `git diff` antes de correr la suite.

**Frontend**
- El CI corre `prettier --check .`, no `src`. Verificación completa: `npm test; npx tsc -b; npm run lint; npm run format:check`.
- Husky no parece ejecutarse en local (`.husky` está en `frontend/` y la raíz de git, arriba). Sin investigar.

**Gestión**
- **Claves de Jira renumeradas:** en las ramas y commits antiguos, `TS-27/28/29` eran errores, JWT y `/me`. Hoy son HU-16/17/18. De aquí en adelante se usan `TS-51` y `TS-14`.

## 5. Drift: estado al cerrar v10

| Drift | Dueño | Estado en v10 |
|---|---|---|
| La tesis dice «Auth0 SDK v4.x» y tiene la tabla de versiones vieja | Documento de tesis | Pendiente |
| `reglas-git.md` §3 no tiene los tipos `test` ni `chore` | `reglas-git.md` | Pendiente (v1–v2) |
| `CLAUDE.md` §1.1 decía «8.3 CORS y rate limiting» | `CLAUDE.md` raíz | Pendiente en v4–v6 (debía decir 8.5) |
| `CLAUDE.md` menciona `frontend/CLAUDE.md`, `frontend/docs/` y `graphify-out/`, que no existían | `CLAUDE.md` raíz | Pendiente (v8, v10) |
| `backend/CLAUDE.md` §6 desalineado con el §5 del raíz | El raíz manda | Pendiente (v8) |
| `TS-15 ts-04.03` y la spec HU-03 §3.3 piden «`unauthenticated()` sobrescrito» | Jira + spec | Pendiente de reescribir (v8–v10) |
| RNF-04 «mensual» frente a «por sprint» (D9.3) | Tesis / D9.3 | Sin contrastar (v6) |
| `HU-03.md` backend con duplicados sobre `production_access` | Spec | Delegado al equipo de TS-14 (v9) |

## 6. Bloqueos y pendientes al cerrar v10

- **ADR ABIERTO:** 8.5 rate limiting, 9.2 migraciones en deploy (el agente debía redactar la propuesta), 9.4 rollback, 11.5 medición de RNF. 3.7 sigue abierto, pero no bloquea.
- **Producción:** resolver la tabla `users` vieja antes de llevar `develop` a `main`.
- **Tickets:**
  - `TS-55`: dependencias con avisos de seguridad.
  - `TS-56`: CSP estricta (D5.1).
  - `TS-13`: faltan los runs rojos deliberados como evidencia; el PR #22 es la evidencia de autodeploy.
  - `TS-43`: falta evidencia no secreta de Resend.
- **Infraestructura (humano):**
  - `AUTH0_*` en Railway (staging y producción).
  - Healthcheck Path `/api/v1/health` en Railway.
  - Monitores de UptimeRobot y prueba de alerta.
  - Status page.
  - Responsables de staging sin rellenar.
- **Test 24** (token real con otro audience) sin C3: necesita a una persona.
- **Agente, cuando haya URLs:** `runbook-mantenimiento.md` y la tabla de disponibilidad de RNF-04.
- **`docs/global/Prompts-fase.md`** sin versionar. Decidir si se versiona.

## 7. Próximos pasos (tal como quedaron en v10)

1. Rebase de `feature/TS-14-401-sin-accept` sobre `develop`, PR, merge y `curl -si …/api/v1/me | head -1` → `HTTP/2 401` para cerrar `ts-03.09` y `TS-14`.
2. Propuesta del ADR 9.2.
3. Frontend de HU-04 (`ts-04.05`..`08`), usuarios sintéticos (`ts-04.10`) e integración (`ts-04.09`).

## 8. Cómo retomar el entorno (referencia de v1–v10)

```fish
cd ~/repositories/trackstudio-demo/backend
./vendor/bin/sail up -d
./vendor/bin/sail pint --test
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G
./vendor/bin/sail pest
```

- **Backend:** `.env` con `DB_HOST=pgsql` y las tres `AUTH0_*` (los tests no las necesitan). El test con token real se corre con `AUTH0_TEST_ACCESS_TOKEN` (ver v8 §8), y ese valor nunca se versiona.
- **Frontend:** `npm install`, que trae Testing Library y `jsdom`.
- **URLs de staging:** frontend `https://trackstudio-staging.vercel.app` y API `https://trackstudio-demo-staging.up.railway.app`.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. **La próxima consolidación toca al cerrar v20 y cubre v11–v20.**
