# Handoff v11 — Track Studio

**Fecha:** 2026-10-02 · **Sprint:** 1 · **Capa(s):** frontend / global
**Foco de la sesión:** completar el frontend de `TS-15` (HU-04) desde la aprobación de la spec hasta Green y review C3.

> Continúa [`HANDOFF_v10.md`](HANDOFF_v10.md). Rama de trabajo: `feature/TS-15-rbac-frontend`, nacida de `develop` (`a0f149e`).

## 1. Resumen ejecutivo

El frontend de HU-04 quedó implementado y revisado. La aplicación conserva `/me` para ambos roles, añade `/productor` como ruta mínima exclusiva del productor y lleva un error D3.1 `FORBIDDEN` a `/403`. El interceptor decide por `code`, ignora el texto, no convierte errores desconocidos en fallos de autenticación y conserva el rechazo original.

La cadena termina con **9 archivos y 21 tests verdes**, TypeScript sin errores, ESLint sin errores (2 warnings preexistentes de Fast Refresh) y Prettier limpio. Siete mutaciones C3 quedaron demostradas y restauradas. El diff está listo para commit, push y PR; el agente no realizó ninguna escritura de git.

Esto completa técnicamente `ts-04.05` a `ts-04.08`. `TS-15` sigue abierto hasta completar los usuarios sintéticos (`ts-04.10`) y la integración en staging (`ts-04.09`).

## 2. Estado de TS-15

| Casilla | Estado | Evidencia |
|---|---|---|
| `ts-04.01`–`ts-04.04` backend | Hechas (v9/v10) | PR #24, backend integrado en `develop`. |
| `ts-04.05` spec frontend | Hecha | [`../../specs/frontend/HU-04.md`](../../specs/frontend/HU-04.md) aprobada el 2026-10-02. |
| `ts-04.06` tests frontend | Hecha | `api.test.ts`, `RequireRole.test.tsx`, `App.test.tsx` y `main.test.tsx`; 21 tests verdes. |
| `ts-04.07` código frontend | Hecha en la rama | `/productor`, navegación a `/403` y pantalla mínima `ProducerOnly`. |
| `ts-04.08` review frontend | Hecha | 0 hallazgos abiertos; C3 completa (§4). |
| `ts-04.10` usuarios sintéticos | Pendiente humano | Crear/verificar productor y artista sintéticos en Auth0 con el rol dentro del claim. |
| `ts-04.09` integración y demo | Pendiente | PR, CI, deploy y comprobaciones de staging (§7). |

## 3. Archivos de la sesión

- **Spec y trazabilidad:** `docs/specs/frontend/HU-04.md`, `docs/specs/frontend/HU-03.md`.
- **Tests (agente):** `frontend/src/lib/api.test.ts`, `frontend/src/routes/RequireRole.test.tsx`, `frontend/src/App.test.tsx`, `frontend/src/main.test.tsx`.
- **Código de aplicación (humano):** `frontend/src/App.tsx`, `frontend/src/routes/ProducerOnly.tsx`.
- **Continuidad:** este handoff.

## 4. Evidencia TDD y review

Los dos faltantes de aplicación nacieron rojos:

1. `/productor` no estaba registrada: el usuario artista terminaba en `/me`, no en `Forbidden`.
2. `onForbidden` solo ejecutaba `console.warn`: la pantalla seguía en Home.

Después del Green humano, se demostraron y restauraron estas mutaciones C3:

1. usar `error.message` en vez de `body.code` → rojo en `FORBIDDEN`;
2. despachar 401 al handler de 403 → rojo en `UNAUTHENTICATED`;
3. tratar cualquier error como 401 → rojo para código desconocido y error de red;
4. permitir siempre en `RequireRole` → cuatro rojos de denegación;
5. denegar siempre en `RequireRole` → rojo del control positivo del productor;
6. resolver el error en vez de rechazarlo → rojos los tres tests del interceptor;
7. cambiar `cacheLocation` a `localstorage` → rojo en D5.1.

Review del diff humano: **0 hallazgos abiertos**. La única corrección durante Green fue declarar `void navigate(...)`, porque React Router 7 permite que `navigate()` retorne una promesa y ESLint rechazaba usarla donde se esperaba `void`.

## 5. Decisiones aplicadas

- `/me` continúa accesible a `productor` y `artista`; HU-04 no estrecha el contrato de HU-03.
- `/productor` es una pantalla de humo sin funcionalidad de dominio y queda bajo `RequireAuth` + `RequireRole(['productor'])`.
- Un 403 del backend y una denegación preventiva del guard convergen visualmente en `/403`, pero sus evidencias se verifican por separado.
- Vitest fija `cacheLocation="memory"`; la ausencia efectiva del access token en `localStorage` y `sessionStorage` se inspecciona después de un login real en staging (C4).
- La spec de HU-03 se reconcilió porque afirmaba que `main.test.tsx` no miraba `cacheLocation`; desde HU-04 ese mismo test contiene una aserción trazada a la historia nueva.

## 6. Limitaciones y pendientes

- `graphify` está instalado, pero falta `graphify-out/graph.json`; se usó búsqueda dirigida como fallback y no se regeneró el índice.
- `npm ci` informó 11 avisos de dependencias (3 moderados, 8 altos). Ya existe `TS-55`; no se mezcló su resolución con HU-04.
- Los 2 warnings de Fast Refresh en `components/ui/button.tsx` y `routes/RequireAuth.tsx` son preexistentes y no bloquean ESLint.
- La casilla Jira histórica `ts-04.03` todavía puede mencionar sobrescribir `unauthenticated()`; el backend aprobado no lo hace porque D3.1 ya resuelve el 401 de forma centralizada.
- No se tocó Auth0, Railway ni Vercel: son acciones humanas según `CLAUDE.md`.

## 7. Próximos pasos

1. Commit y push de `feature/TS-15-rbac-frontend`; abrir PR hacia `develop` y esperar CI verde.
2. Tras review y merge, comprobar el autodeploy de Vercel y Railway.
3. Completar `ts-04.10` con dos usuarios exclusivamente sintéticos. Confirmar que sus tokens contienen respectivamente `productor` y `artista` en el claim namespaced; no guardar tokens en archivos, Jira, terminal compartida ni handoffs.
4. En staging, verificar:
   - sin token, `POST /api/v1/rbac-check` → 401 `UNAUTHENTICATED`;
   - token artista → 403 `FORBIDDEN`;
   - token productor → 204;
   - artista en `/productor` → pantalla `/403` sin contenido reservado;
   - productor en `/productor` → pantalla «Acceso de productor»;
   - después del login, ningún access token en `localStorage` ni `sessionStorage`.
5. Registrar evidencia no secreta, actualizar este estado y cerrar `ts-04.09`, `ts-04.10` y `TS-15` a mano en Jira.

## 8. Verificación de referencia

Desde `frontend/`:

```bash
npm test
npx tsc -b
npm run lint
npm run format:check
```

Resultado de referencia: 21 tests verdes; TypeScript, ESLint y Prettier sin errores. ESLint conserva los 2 warnings conocidos de §6.
