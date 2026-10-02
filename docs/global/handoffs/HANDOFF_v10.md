# Handoff v10 — Track Studio

**Fecha:** 2026-10-02 (sesión iniciada el 2026-10-01) · **Sprint:** 1 · **Capa(s):** backend / frontend / global
**Foco de la sesión:** cerrar `TS-14` (HU-03, autenticación Auth0) casilla por casilla: spec, tests y review del frontend, cierre del review backend e integración en staging.

> Continúa [`HANDOFF_v9.md`](HANDOFF_v9.md) (backend de TS-15, sesión paralela) y [`HANDOFF_v8.md`](HANDOFF_v8.md) (TS-14 hasta el review backend). Ramas: `feature/TS-14-auth0-auth` (entró a `develop` como **PR #25**, `1a206b5`) y `feature/TS-14-401-sin-accept` (arreglo del 401, PR pendiente).

---

## 1. Resumen ejecutivo

HU-03 está implementada en las dos capas y probada en staging. El frontend tiene spec aprobada, 11 tests de Vitest con C3 y review cerrado. El backend cerró su review y queda con **72 tests verdes y 1 saltado**. En staging se comprobaron login, `/me` con `sub` y rol, logout y las comprobaciones de RNF-02. La prueba en staging destapó un bug: **sin `Accept: application/json`, una petición sin token daba 500 en vez de 401**. Ya tiene test, arreglo y C3 en la rama `feature/TS-14-401-sin-accept`. Para cerrar `ts-03.09` solo falta hacer merge de ese PR y ver el `401` en staging (§7).

## 2. Qué se hizo

Checklist de `TS-14` (Jira manda):

| Casilla | Estado | Evidencia |
| --- | --- | --- |
| `ts-03.10` Tenant Auth0 | Hecha (v8) | Token real verificado en jwt.io. |
| `ts-03.01` Spec backend | Hecha (v8) | Enmiendas del 2026-09-30 y del 2026-10-02 (§3.3, test 27). |
| `ts-03.02` / `ts-03.03` | Hechas (v8) | — |
| `ts-03.04` Review backend | **Hecha** | PHPDoc de `UserRepository.php` traducidos; Pint, PHPStan 0 errores, Pest en verde. |
| `ts-03.11` Sin credenciales propias | **Hecha entera** | Tests 25 y 26; la mitad "solo `auth0_sub`" la cerró TS-15 (`users` sin `password`, `MinimumSchemaTest`). |
| `ts-03.05` Spec frontend | **Hecha** | `docs/specs/frontend/HU-03.md` aprobada el 2026-10-01, enlazada a la backend. |
| `ts-03.06` Tests frontend | **Hecha** | 8 tests (+6b de control), rojo demostrado rompiendo la implementación (8 mutaciones). |
| `ts-03.07` Código frontend | **Hecha** | PR #6 + `Me.tsx` alineado al contrato `{ sub, role }` (test 7 nació rojo y pasó a verde). |
| `ts-03.08` Review frontend | **Hecha** | F1-F3 arreglados (TODO, `Profile.tsx` muerto, textos en inglés), F4-F7 justificados en la spec. |
| `ts-03.09` Integración | **Casi** | PR #25 en `develop`, staging comprobado a mano. Falta el merge del arreglo del 401 y ver `HTTP/2 401` con `curl`. |

**Archivos de la sesión:**

- **Frontend, tests (agente):** `src/test/auth0.ts` (helper `contextoAuth0`), `components/LoginButton.test.tsx`, `components/LogoutButton.test.tsx`, `lib/api.test.ts`, `routes/RequireAuth.test.tsx`, `routes/Me.test.tsx`, `main.test.tsx`.
- **Frontend, código (humano):** `routes/Me.tsx` (contrato `{ sub, role }`), `App.tsx`, `LoginButton.tsx` y `LogoutButton.tsx` (comentarios y textos en español), `components/Profile.tsx` borrado, `vite.config.ts` (`test.environment: 'jsdom'`), `package.json` y `package-lock.json` (Testing Library y `jsdom`).
- **Backend:** `app/Auth/UserRepository.php` (PHPDoc, humano), `bootstrap/app.php` (`redirectGuestsTo(null)`, humano), `tests/Feature/TokenGuardTest.php` (test 27, agente).
- **Docs (agente):** `docs/specs/frontend/HU-03.md` (nueva), `docs/specs/backend/HU-03.md` (enlace a la contraparte, duplicados del merge eliminados, §3.3 y §3.5, test 27, §6).

**Jira:** creado **`TS-56`**, CSP estricta en el frontend (control obligatorio de D5.1 sin implementar). El humano marca las casillas de TS-14.

## 3. Decisiones tomadas en esta sesión

- **Reparto HU-03 / HU-04 en el frontend.** HU-03 cubre login, logout, `RequireAuth`, el interceptor `Bearer` y `/me`. `RequireRole`, `useRole`, el interceptor de errores y el test "token fuera del storage" son de HU-04.
- **El interceptor pide el token en cada request y, sin token, la petición no sale.** Quedó como contrato (tests 4 y 5).
- **`api` solo recibe rutas relativas** (review F6): una URL absoluta le mandaría el `Bearer` a otro host.
- **La API nunca redirige a un invitado** (enmienda §3.3, test 27): `redirectGuestsTo(null)` en `bootstrap/app.php`.
- **Los rechazos de `loginWithRedirect()` y `logout()` no llegan a `useAuth0().error`** (verificado en el SDK 2.22.0). Se aceptan como excepcionales; los fallos del callback sí llegan y `App` los muestra.

## 4. Trampas y hallazgos

1. **El merge de `develop` reintrodujo duplicados en las specs.** Al resolver conflictos de docs, comparar el resultado contra los dos padres (`git diff <padre> <merge> -- <archivo>`).
2. **TS-15 editó una migración ya aplicada** (`0001_01_01_000000_create_users_table.php`, `bigint` → `uuid`). Staging no la volvió a correr y `create_artists_table` falló con la FK. Se resolvió reseteando el esquema de staging (la tabla estaba vacía). **Regla: nunca editar una migración ya aplicada en un entorno; siempre una nueva.** **Producción va a fallar igual** si su base tiene la tabla vieja: resolverlo antes de llevar `develop` a `main`.
3. **Railway ejecuta `migrate --force` en cada deploy** sin que el repo lo pida (lo hace su builder). Es la decisión de facto sobre el **9.2 del ADR, que sigue ABIERTO**.
4. **401 contra 500 según `Accept`:** los tests con `getJson` ocultaban el redirect a `route('login')`. Un test de "sin token" tiene que probar también sin `Accept`.
5. **`prettier --check src` no es lo que corre el CI**: el CI corre `prettier --check .`, y `vite.config.ts` queda fuera de `src/`. Verificación frontend completa: `npm test; npx tsc -b; npm run lint; npm run format:check`.
6. **Husky no parece correr en local:** `vite.config.ts` entró sin formatear pese a lint-staged. `.husky` vive en `frontend/` y la raíz de git está arriba. Sin investigar.
7. **Git sin editor:** `git merge` y `git commit` sin `-m` fallan con "cannot run vi". Usar `git commit --no-edit` o configurar `core.editor`.
8. **PHPStan `Undefined constant "Larastan\Larastan\LARAVEL_VERSION"`:** caché de resultados vieja. Se arregla con `phpstan clear-result-cache` (o una corrida con `--debug`).
9. **Texto pegado dentro del código:** dos veces entraron bloques de markdown (` ```php `, frases) en archivos PHP. Revisar `git diff` antes de correr la suite.
10. **Rama creada antes del `git pull`:** `feature/TS-14-401-sin-accept` nació de `84d113c` y no contiene el PR #25. Se resuelve con rebase (§7).

## 5. Drift detectado

- **`TS-15 ts-04.03`** sigue pidiendo "`unauthenticated()` sobrescrito" (v8). Además, el §3.3 de la spec backend todavía menciona "sobreescribir el `unauthenticated()`", cuando el 401 sale del manejador de D3.1 más `redirectGuestsTo(null)`. Pendiente de alinear.
- **`CLAUDE.md` raíz** sigue mencionando `frontend/CLAUDE.md`, `frontend/docs/` y `graphify-out/`, que no existen (v8).
- **El documento de tesis** sigue con "auth0 v4.x" (v8).

## 6. Bloqueos y pendientes

- **ADR 9.2 (migraciones en deploy):** llevarlo a decisión. Hoy son automáticas de hecho (§4.3). El agente redacta la propuesta en la próxima sesión.
- **Producción:** antes de mergear `develop` a `main`, resolver la tabla `users` vieja (§4.2).
- **`TS-56`:** CSP estricta (D5.1).
- **`TS-55`:** dependencias del backend con avisos de seguridad.
- **Test 24 sin C3** (token real con otro audience): sigue siendo trabajo para una persona.
- Siguen **ABIERTOS** en el ADR: 8.5, 9.2, 9.4 y 11.5. La verificación de RNF-02 de esta HU es manual; el plan formal de medición es el 11.5.

## 7. Próximos pasos

1. **Rebase de la rama del 401 sobre `develop`** y resolución del conflicto (conservar las tres entradas del §6 de `docs/specs/backend/HU-03.md`: primero la de `ts-03.04`, luego las dos del 401).
2. PR `feature/TS-14-401-sin-accept` → `develop` con el CI en verde, merge y deploy.
3. `curl -si https://trackstudio-demo-staging.up.railway.app/api/v1/me | head -1` → `HTTP/2 401`. Con eso, el humano marca `ts-03.09` y `TS-14` pasa a Hecho.
4. Propuesta del 9.2 del ADR.
5. Siguiente historia: `TS-15` (HU-04) en el frontend: `ts-04.06` y la integración `ts-04.09`.

## 8. Cómo retomar el entorno

Igual que en v8. El frontend ahora necesita `npm install` para traer Testing Library y `jsdom`. URLs de staging: frontend `https://trackstudio-staging.vercel.app` (nunca el alias de rama), API `https://trackstudio-demo-staging.up.railway.app`.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
