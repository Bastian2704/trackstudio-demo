# Handoff v8 — Track Studio

**Fecha:** 2026-10-01 (sesión iniciada el 2026-09-30) · **Sprint:** 1 · **Capa(s):** backend / global
**Foco de la sesión:** `TS-14` (HU-03, autenticación Auth0) en la capa backend: de la spec aprobada al review, casilla por casilla.

> Continúa `HANDOFF_v7.md` (normalización de Jira y docs). La rama de trabajo es `feature/TS-14-auth0-auth`.

---

## 1. Resumen ejecutivo

El backend de HU-03 está implementado y en verde: el guard `auth0-api` valida el JWT de Auth0 (firma, `iss`, `aud`, `exp`), el rol se extrae del claim namespaced y `GET /api/v1/me` responde `{ sub, role }`. Dentro de Sail pasan Pint, PHPStan nivel 5 (0 errores) y Pest (**62 verdes y 1 saltado**); el saltado es el test con access token real, que una persona corrió aparte y **pasó**. El CI de la rama está en verde. Todos los tests no triviales se probaron en rojo rompiendo lo que afirman (C3). Para cerrar `ts-03.04` solo falta traducir dos PHPDoc; la capa frontend de HU-03 está sin empezar.

## 2. Qué se hizo

Checklist de `TS-14` en Jira (la descripción del ticket manda):

| Casilla | Estado | Evidencia |
| --- | --- | --- |
| `ts-03.10` Tenant Auth0 | **Hecha** | Token real verificado en jwt.io (RS256, `iss`, `aud`, claim de roles como array). |
| `ts-03.01` Spec backend | **Hecha** | Enmienda del 2026-09-30 aprobada: §3.3 (los cuatro rechazos comparten el mismo 401), §3.5 (sin credenciales propias), tests 20-26. |
| `ts-03.02` Tests en rojo | **Hecha** | Dos rojos vistos en Sail: antes y después de instalar `auth0/login`. Test 24 visto rojo con token real. |
| `ts-03.03` Código hasta verde | **Hecha** | Tecleado por el humano, guiado paso a paso. Cadena completa limpia; test 24 verde con token real de staging. |
| `ts-03.04` Review backend | **Casi** | C3 sobre 22 tests; 2 hallazgos arreglados, 2 justificados y **1 abierto** (§6). No marcada en Jira. |
| `ts-03.11` Sin credenciales propias | **Lista para marcar** | Tests 25 (cero consultas) y 26 (token fuera de logs y de Sentry) en verde y probados en rojo. Se marca junto con `ts-03.04`. |
| `ts-03.05` · `06` · `08` Frontend | Sin empezar | — |
| `ts-03.07` Código frontend | Hecha (PR #6) | Ver drift en §5. |
| `ts-03.09` Integración | Sin empezar | Depende de frontend y de `ts-29.06`. |

Archivos de la capa backend que quedaron en la rama:

- **Código (humano):** `config/auth0.php`, `config/auth.php`, `app/Enums/Role.php`, `app/Auth/UserRepository.php`, `app/Http/Controllers/MeController.php`, `app/Http/Resources/UserResource.php`, `routes/api.php`, `phpunit.xml`, `.env.example`, `composer.json/lock` (`auth0/login` 7.22.0, `auth0/auth0-php` 8.19.0).
- **Tests (agente):** `tests/Pest.php` (helpers), `TokenGuardTest`, `TokenVerificationTest`, `TokenLeakTest`, `MeEndpointTest`, `Unit/UserRepositoryTest`. `ErrorShapeTest` (test 4b) pasó a usar el helper compartido `capturarEventosDeSentry()` y se re-probó en rojo.
- **Docs (agente):** `docs/specs/backend/HU-03.md` (§3.5 nuevo, §4 tests 20-26, §5 y §6 con toda la evidencia), `docs/specs/backend/HU-04.md` §5 (hereda la limpieza de `password`).

**Jira:** marcadas `ts-03.10`, `ts-03.01`, `ts-03.02` y `ts-03.03`; reescrita `ts-03.11`; `TS-15 ts-04.03` hereda la limpieza del esqueleto de `users`. Creada **`TS-55`** (dependencias con avisos de seguridad).

## 3. Decisiones tomadas en esta sesión

- **Reparto de `ts-03.11`.** HU-03 cubre "no se persiste nada y el token no sale a logs ni a Sentry". La mitad "`users` solo guarda `auth0_sub`, sin `password`" pasa a `ts-04.03`, donde nace la tabla; el veto del §5 del `CLAUDE.md` impide adelantar esa migración. Reflejado en spec y en las dos casillas de Jira.
- **El SDK se configura como API stateless pura.** En `config/auth0.php`: `registerGuards`, `registerMiddleware` y `registerAuthenticationRoutes` en `false`. El guard `auth0-api` y su proveedor se declaran a mano en `config/auth.php`, apuntando a `App\Auth\UserRepository`. No existen `/login`, `/logout` ni `/callback`.
- **El 401 no necesita código propio.** Con el guard cableado, un token inválido termina en `AuthenticationException`, que el manejador de errores ya convierte en `401 UNAUTHENTICATED` con cuerpo D3.1. La casilla `ts-04.03` que pide "`unauthenticated()` sobrescrito" queda sin objeto (ver §5).
- **Hallazgo del review justificado por ahora:** si `AUTH0_ROLES_CLAIM` falta en un entorno, todos los usuarios quedan sin rol sin aviso. Se acepta porque la suite fija la clave en `phpunit.xml` y el riesgo es de despliegue (§6). Se reconsidera en HU-04, donde el rol decide permisos.
- **Hallazgo del review justificado:** `config/auth0.php` conserva secciones sin uso (`guards.web`, `routes`). Es el archivo tal como lo publica el paquete; no editarlo facilita actualizarlo.
- **Avisos de `composer audit` fuera de esta HU:** ya estaban en `develop`. Van a `TS-55`.

## 4. Trampas y hallazgos (lo que costó tiempo)

1. **Instalar `auth0/login` sin configurarlo rompe `GET /` con un 500.** El paquete añade al grupo `web` un middleware que pide el guard `auth0-session`, que no existe hasta publicar la config. Se arregla con el `config/auth0.php` de §3, no tocando `ExampleTest`.
2. **`vendor:publish` con Sail apagado no hace nada.** Imprime "Sail is not running" y no crea el archivo. Levantar Sail primero.
3. **El SDK solo acepta claves del JWKS que traigan `x5c`.** Una JWK con solo `n`/`e` se descarta en silencio. Por eso la clave de prueba de `tests/Pest.php` lleva un certificado autofirmado.
4. **El JWKS de prueba se entrega con un cliente HTTP falso** en `config('auth0.guards.default.httpClient')`. Confirmado contra el paquete instalado; vive solo en `configurarSdkDePrueba()`.
5. **CI rojo en un test que pasaba en local.** En CI el `.env` sale de `.env.example`, con `AUTH0_AUDIENCE` vacío, y el SDK lanza "`audience` must be configured" (500) antes de rechazar el token. Todo test que mande un `Bearer` debe llamar a `configurarSdkDePrueba()`. Para reproducir en local: `sail exec -e AUTH0_AUDIENCE= -e AUTH0_DOMAIN= laravel.test vendor/bin/pest`.
6. **El test de fuga a Sentry nacía incapaz de fallar.** `SetRequestMiddleware` de Sentry, el que le entrega el request al SDK, solo se registra si al arrancar hay DSN. En la suite no lo hay, así que el evento salía sin cabeceras. La ruta del test lo añade a mano y el test exige que el evento traiga cabeceras antes de buscar el token. Lo destapó la C3 del review.
7. **PHPStan no acepta el `__get` mágico de `StatelessUser`.** Leer el rol con `getAttribute('role')` y comprobar `instanceof Role`, no con `->role`.
8. **Sacar un access token real del navegador:** no sirve la petición de la página `/me` de Vercel; hay que tomar la petición XHR a Railway (`.../api/v1/me`, filtro Fetch/XHR, "Copy as cURL"). El token de la pestaña Test de Auth0 es M2M y no trae el claim de roles.
9. **En fish, `<token>` literal es una redirección:** `...=<token> laravel.test` creó un archivo vacío `backend/laravel.test`. Usar `read -s -P "token: " TOKEN` y `$TOKEN`.
10. **El `.env` local apareció con `DB_HOST=postgres.railway.internal`**, el host interno de staging, que no resuelve fuera de Railway, y `HealthCheckTest` falló. En local es `DB_HOST=pgsql`.
11. **Aviso `fopen(.../pestphp/pest/.temp/test-run-history): Permission denied`** en cada corrida de Pest. Sigue sin afectar resultados (ya anotado en v6).

## 5. Drift detectado

- **`frontend/src/routes/Me.tsx`** tipa la respuesta de `/me` como `{ id, email, name, role }`; el contrato aprobado es `{ sub, role }` (spec backend §3.4). Dueño: la spec frontend de `ts-03.05`, que debe recogerlo.
- **`TS-15 ts-04.03`** sigue pidiendo "manejador centralizado D3.1, `unauthenticated()` sobrescrito". El manejador está hecho (`TS-51`) y el 401 ya sale correcto sin sobrescribir nada (§3). Pendiente de decisión humana: reescribir la casilla.
- **`backend/CLAUDE.md` §6** sigue diciendo "solo `users`, `artists`, `production_access` (T-31)"; el `CLAUDE.md` raíz §5 ya dice "modelo mínimo aprobado en `TS-54`". El raíz es el dueño del bloque; hay que alinear el de backend.
- **`CLAUDE.md` raíz** menciona `frontend/CLAUDE.md` y `frontend/docs/`, que no existen, y `graphify-out/`, que tampoco: no se pudo consultar el grafo en esta sesión.

## 6. Bloqueos y pendientes

- **Abierto del review (`ts-03.04`):** los PHPDoc de `backend/app/Auth/UserRepository.php:16` y `:36` siguen en inglés; nomenclatura §1 pide comentarios en español. Al traducirlos, el agente marca `ts-03.04` y `ts-03.11` en Jira.
- **Infraestructura (humano, regla §0.6):** el backend de Railway (staging y producción) debe tener `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` y `AUTH0_ROLES_CLAIM`. Sin dominio o audience, cualquier request con token responde 500; sin el claim, todos quedan sin rol.
- **Test 24 sin C3:** verlo dar 401 cambiando `AUTH0_AUDIENCE` exige un token real; queda para una persona.
- **`ts-03.06` necesita dependencias nuevas:** D11.2 decide Vitest + React Testing Library, pero `frontend/package.json` no tiene `@testing-library/*` ni `jsdom`. Instalarlas es cambio de dependencias (humano).
- **`TS-55`:** actualizar `laravel/framework` y `league/commonmark` (3 avisos, uno alto).
- Sigue **ABIERTO** en el ADR: 8.5 rate limiting, 9.2 migraciones en deploy, 9.4 rollback y 11.5 plan de medición de RNF. Nada de esto bloquea el resto de HU-03.

## 7. Próximos pasos

1. Traducir los dos PHPDoc; el agente marca `ts-03.04` y `ts-03.11`.
2. `ts-03.05`: el agente escribe `docs/specs/frontend/HU-03.md`, enlazada a la backend. Debe documentar el código ya integrado, corregir el drift de `Me.tsx` y no repetir el test de token en memoria de HU-04 frontend.
3. Instalar React Testing Library y `jsdom` (humano); luego `ts-03.06`, tests Vitest de login/logout y del interceptor `Bearer`, con el rojo demostrado rompiendo la implementación.
4. `ts-03.08`: review frontend.
5. Configurar las `AUTH0_*` en Railway; después `ts-03.09`: PR a `develop`, login, logout y `/api/v1/me` comprobados en staging, y RNF-02.

## 8. Cómo retomar el entorno

Sin cambios respecto a v6, salvo que el backend necesita en `.env` las tres claves `AUTH0_*` con los valores del tenant (los tests no las necesitan) y `DB_HOST=pgsql`. Para el test con token real:

```fish
cd ~/repositories/trackstudio-demo/backend
./vendor/bin/sail up -d
read -s -P "token: " TOKEN
./vendor/bin/sail exec -e AUTH0_TEST_ACCESS_TOKEN=$TOKEN laravel.test vendor/bin/pest --filter='access token real'
set -e TOKEN
```

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
