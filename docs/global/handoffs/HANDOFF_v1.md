# Handoff v1 — Track Studio

**Fecha:** 2026-09-17 · **Sprint:** 1 · **Capa(s):** backend (+ docs globales)
**Foco de la sesión:** TS-27, TS-28 y TS-29 (HU-03) — spec de capa y fase **Red** del ciclo SDD/TDD.

> **Primer handoff en la ruta global.** El anterior es `backend/docs/Handoff backend sprint1.md` (31-ago-2026), que cubre el scaffolding y la cadena de calidad. Sigue vigente para entorno y versiones; este no lo repite.

---

## 1. Resumen ejecutivo

HU-03 pasó de no tener spec a tener **spec aprobada y 22 tests en rojo**. Nada de código de aplicación se escribió: el reparto de roles se mantuvo en modo híbrido (agente escribe spec y tests, el humano implementa).

El trabajo real de la sesión no fue escribir tests, fue **desatascar la Definition of Ready**: TS-27 estaba bloqueada por dos decisiones `ABIERTO` del ADR (3.6 y 3.7) y por un ADR que ni siquiera estaba en el repositorio. Ambas cosas están resueltas.

Queda pendiente la fase **Green de TS-27**, que no depende de Auth0 y se puede hacer entera sin instalar el SDK.

Estado de la cadena de calidad: `pint --test` ✅ · `phpstan` (nivel 5) ✅ · `pest` 🔴 **a propósito** (22 rojos, 3 verdes).

## 2. Qué se hizo

| Tarea | Estado | Dónde |
|---|---|---|
| **TS-27** manejador de excepciones | Spec ✅ · Red ✅ · **Green ⬜** | `docs/specs/backend/HU-03.md` §3.1 |
| **TS-28** validación JWT + rol del claim | Spec ✅ · Red ✅ · Green ⬜ | ídem §3.2 |
| **TS-29** endpoint de humo `/api/v1/me` | Spec ✅ · Red ✅ · Green ⬜ | ídem §3.4 |
| Arreglo del CI contra PostgreSQL | ✅ commiteado (rama `fix/ci-postgres`) | `.github/workflows/backend-ci.yml`, `backend/.env.example` |

**Commits de la sesión** (rama `feature/TS-27-manejador-excepciones`):

- `dfc059e` — `docs(backend): TS-27 spec HU-03, cierre de ADR 3.6 y reconciliación de drift en docs`
- `c53d03d` — `feat(backend): TS-27 tests en rojo de HU-03 (D3.1, guard Auth0 y /me)`

Y en `fix/ci-postgres`: `91a7d39` — CI contra PostgreSQL.

**Tests escritos (22, todos en rojo):**

- `backend/tests/Feature/ErrorShapeTest.php` — 9 casos (TS-27)
- `backend/tests/Unit/UserRepositoryTest.php` — 6 casos (TS-28)
- `backend/tests/Feature/TokenGuardTest.php` — 3 casos (TS-28)
- `backend/tests/Feature/MeEndpointTest.php` — 5 casos (TS-29)
- `backend/tests/Pest.php` — helpers `impersonarToken()` y `claimsDeToken()`; pasa a `->in('Feature', 'Unit')`

## 3. Decisiones tomadas en esta sesión

Todas con su documento dueño ya actualizado (regla anti-drift: primero cambia el documento).

1. **ADR `3.6` → `DECIDIDO`: RFC 9457 completo**, con `type` e `instance`. El motivo original para diferirlo —que la URL del `type` apuntaba a un dominio sin comprar— desapareció al confirmarse `trackstudio.site`. El `type` **se deriva del `code`** (`FORBIDDEN` → `.../errors/forbidden`), no se escribe a mano.
2. **ADR `3.7` sigue `ABIERTO`, pero se declara NO bloqueante.** El backend genera un ULID por respuesta de error, comportamiento compatible con las dos salidas posibles: si mañana el frontend manda `X-Trace-Id`, el manejador lo respeta y solo genera cuando falta. **Esto generó una regla nueva en la metodología §8:** una decisión abierta no bloquea si la implementación es compatible con todas sus salidas — y lo que no vale es elegir una en silencio y llamarlo "no bloquea".
3. **D4.8 se cumple con el guard `auth0-api` del SDK + `UserRepositoryContract::fromAccessToken()`, sin clase de middleware propia.** El SDK ya valida el JWT (escribir eso a mano es lo que el handoff de backend §8.3 prohíbe), y el repositorio es un punto de extensión que **no se puede olvidar de registrar**, a diferencia de un middleware. D4.8 quedó reescrito para decir esto. **Consecuencia de trazabilidad:** el título de TS-28 en Jira ("Middleware que valida el JWT…") describe el efecto, no el artefacto; el artefacto es `App\Auth\UserRepository`. Anotarlo en el PR para que nadie busque una clase que no existe.
4. **`/api/v1/me` no toca la base de datos en Sprint 1.** La tabla `users` nace en T-31, que es HU-04. El endpoint sirve la identidad del token; la provisión JIT queda documentada en `HU-04.md` §5.
5. **Contrato de `/api/v1/me`: `{ sub, role }`**, no `{ sub, name, email, role }` — ver trampa 4.2.
6. **Tests de extracción de rol en `tests/Unit/`**, no en Feature — ver trampa 4.1.

## 4. Trampas y hallazgos (lo que costó tiempo)

### 4.1 `setImpersonating()` del SDK no pasa por `fromAccessToken()` ⚠️ la importante

El helper de impersonación de `auth0/login` **pone el usuario directamente en el guard**. No ejecuta el repositorio. Un test que impersone y luego afirme el rol estaría probando el objeto que el propio test construyó, no nuestro código.

Dos consecuencias, ya aplicadas:

- La extracción del rol se prueba **directamente sobre `UserRepository::fromAccessToken()`** en `tests/Unit/UserRepositoryTest.php`. Es una función pura de los claims; meter HTTP de por medio solo añadía ruido.
- Hizo falta un test de **cableado** (`TokenGuardTest`, caso 11c) que afirme que `config('auth.providers.….repository')` es nuestra clase. **Sin él, la extracción del rol puede estar perfecta y no ejecutarse nunca**: el guard serviría el usuario por defecto del SDK, sin rol, y en HU-04 todas las Policies negarían a todo el mundo con un 403 inexplicable. Ese sería un día entero de depuración.

### 4.2 Un access token de Auth0 no lleva `name` ni `email`

Son claims del **ID token**. La spec pedía devolverlos en `/api/v1/me` y no se puede sin: (a) inyectarlos como claims custom en la Action post-login (T-22, infraestructura), o (b) llamar a la Management API en cada request (dependencia de red y límite de tasa dentro de un endpoint de humo). Ninguna hace falta: el SPA ya los tiene de `useAuth0().user`. Contrato reducido a `{ sub, role }`. Si se quieren, es **una línea en la Action** más actualizar spec y test 16 — en ese orden.

### 4.3 El CI corría contra SQLite y nadie se enteraba

`backend/.env.example` declaraba `DB_CONNECTION=sqlite` y el workflow hace `cp .env.example .env`. En local no se notaba: el `.env` real dice `pgsql` y `phpunit.xml` apunta a la base `testing` que crea el `compose.yaml` de Sail. O sea: **los tests corrían contra PostgreSQL en local y contra SQLite en CI**. Justo el desfase que D2.1 dice querer evitar. T-06 pedía `pgsql` en `.env.example` y nunca se aplicó. Arreglado, y el job ahora hace también el `migrate` que T-11 pedía y no estaba.

Hoy no dolía porque no hay migraciones propias. Habría dolido en HU-04: `timestamptz` (D3.2), UUID nativo (D6.1) y el **único parcial** `(production_id, user_id) WHERE revoked_at IS NULL` (D6.7) son garantías de PostgreSQL. Verificarlas contra otro motor es lo que la compuerta **C4** prohíbe.

### 4.4 Los tests de TS-28 no deben tocar `/api/v1/me`

Primera versión: los 401 de TS-28 iban contra la ruta de TS-29, que no existe → fallaban con **404 en vez de 401**. Rojo, sí, pero por la causa equivocada. Ahora `TokenGuardTest` registra su **propia ruta protegida desechable**. Regla general: un test debe fallar por lo que afirma, no de rebote.

### 4.5 `expect(null)->toMatch(...)` da *error*, no *fallo*

Pest revienta con "This expectation may only be used on a value of type [string]" y el rojo no dice nada útil. Igual con `assertJsonPath()` en su forma de closure: escupe "Failed asserting that false is true". Cuando el valor puede venir nulo, afirmar primero que existe (`->toBeString()`) o sacar el valor con `->json('campo')` y afirmar sobre él.

### 4.6 Dos ramas, y los docs en solo una

Los docs se commitearon en `feature/TS-27-…` y el arreglo del CI en `fix/ci-postgres`, que nace de `develop`. Al volver a la rama del CI, `docs/specs/backend/HU-03.md` **desaparece del árbol** (correcto, pero desconcierta). Los archivos nuevos sin commitear sí viajan con el `checkout`. Antes de editar un doc, confirmar la rama.

### 4.7 Dos tests que la spec pedía y no debían existir tal cual

- El **test 8** ("`errors` solo en 422") **nacía verde**: hoy un 404 tampoco trae `errors`. La metodología prohíbe un test que no puede fallar. Eliminado; su intención vive en el test 1, que afirma el **conjunto exacto** de claves.
- El **test 10** (el manejador no toca rutas web) **nace verde y se queda**: es un guardarraíl, no un criterio de aceptación. No hay implementación futura que lo vuelva rojo; su trabajo es ponerse rojo el día que alguien extienda el formato a todo el sitio. Es la **única excepción** de la suite, y está comentada en el archivo para que no se lea como descuido.

## 5. Drift detectado

**Corregido en esta sesión:**

| Dónde | Qué decía | Qué dice ahora |
|---|---|---|
| `CLAUDE.md` §1 y §5, `backend/CLAUDE.md` §6, `metodologia-sdd-tdd.md` §8, `HU-04.md` §1 | Bloque 7 (audio/S3) `ABIERTO` | **Cerrado desde 2026-08-18**. Los vetos siguen, pero por alcance de Sprint 1 y ERD diferido. `CLAUDE.md` §1 ya no copia la lista de puntos abiertos: remite al ADR, que es su dueño |
| ADR **D4.8** | "Auth0 SDK v4.x" | `auth0/login` **v7.x** |
| ADR **D3.1** (ejemplo) | `https://trackstudio.app/...` | `https://trackstudio.site/...` |
| ADR **D2.1** | Remitía a una tabla de versiones que solo existía en la tesis | Tabla de versiones verificadas incorporada |
| `PLANTILLA-SPEC.md` | Ponía "bloque 7 ABIERTO" como ejemplo | Ejemplo neutro (8.3, rate limiting) |
| `HU-04.md` §3 | "RFC 9457 nivel pragmático" | Remite a HU-03 §3.1; 3.6 cerrado en completo |

**Detectado y NO corregido (pendiente):**

1. **Documento de tesis** — sigue diciendo "Auth0 SDK v4.x" y con la tabla de versiones vieja. Es el único sitio donde el drift persiste.
2. **`reglas-git.md` §3** — la lista de tipos de commit es `feat · fix · docs · ci`. Faltan **`test`** (los tests fueron como `feat` por no tener tipo propio) y **`chore`**, que el historial ya usa en nombres de rama. Es una línea en ese archivo.
3. **`HU-04.md`** sigue con `TS-XXX` como clave de Jira. Fijarla.
4. **No existe `docs/specs/frontend/HU-03.md`**, aunque el frontend ya tiene `Auth0Provider`, `useRole` y rutas protegidas implementados (`feature/TS-18-frontend-Auth0-login`). Hay código sin spec de capa.

## 6. Bloqueos y pendientes

**ADR, abiertos que tocan el backend:**

- `3.7` — origen del `trace_id`. **No bloquea** (ver decisión 2), pero sigue por decidir.
- `8.3` — CORS y rate limiting. **Sí bloquea** configurar cualquier limitador; el código `RATE_LIMITED` se cablea, la política no se define.
- `9.2` (migraciones en deploy) y `9.4` (rollback) — bloquean el primer despliegue serio, no estas tareas.
- `11.5` — plan de medición de RNF. Mantiene la Definition of Ready en `PARCIAL` (criterio 7).
- **ERD completo** — diferido deliberadamente, no bloqueado por nada. Mientras siga así, HU-13..HU-16 no son "Ready".

**Externas:**

- `auth0/login:^7` **no está instalado**. Es el primer paso de TS-28, no de TS-27.
- Auth0 (tenant, API, app SPA, roles, Action con el claim verificado) — **hecho y confirmado**.
- Railway, Vercel, Resend y AWS — pendientes (bloque 10 del ADR).

## 7. Próximos pasos

En este orden. **No mezclar TS-27 con TS-28**: si un fallo puede venir de dos sitios, cuesta el doble.

1. **Green de TS-27** (humano). Sin instalar nada. Tres archivos: `routes/api.php` (puede ir casi vacío, pero tiene que existir antes de que `bootstrap/app.php` lo referencie), `app/Enums/ErrorCode.php` (el `type` se deriva del value en **un solo** método) y `bootstrap/app.php` (`withRouting(api: …, apiPrefix: 'api/v1')` + `withExceptions`; conservar el `shouldRenderJsonWhen`, que es lo que afirma el test 10). Empezar por el test 1: cuando pase, el 2, 3 y 4 caen casi solos. El 5 y el 6 (flag de `debug`) al final.
2. **Review de TS-27** (agente): auditar el diff y **romper cada test a propósito** según la columna C3 de `HU-03.md` §4. Un test que sigue verde con el código roto se corrige o se borra.
3. **TS-28**: `sail composer require auth0/login:^7`, publicar `config/auth0.php`, añadir a mano la clave `roles_claim` (no viene con el SDK) y `AUTH0_ROLES_CLAIM` en `.env.example`, `config/auth.php` con el guard, y `App\Auth\UserRepository`. **Trampa:** las rutas tienen que estar en `routes/api.php` o el guard del SDK no se registra solo, y el síntoma es un 401 que parece problema de token.
4. **TS-29**: `MeController` + `UserResource`. Si aparece un `MeService`, parar: no hay negocio que meter ahí.
5. Abrir PR de `feature/TS-27-manejador-excepciones` hacia `develop` cuando las tres estén en verde, o antes si se prefiere una tarea por PR.

## 8. Cómo retomar el entorno

Sin cambios respecto al handoff de backend del 31-ago. Único añadido: los contenedores estaban parados al empezar esta sesión.

```bash
cd trackstudio-demo/backend
./vendor/bin/sail up -d
./vendor/bin/sail pest            # 22 en rojo es el estado correcto hoy
./vendor/bin/sail pint --test     # verde
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G   # verde
```

PHPStan solo analiza `app/`, así que los tests no pasan por él — referencian clases que todavía no existen (`App\Auth\UserRepository`, `App\Enums\Role`) y eso es correcto en fase Red.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
