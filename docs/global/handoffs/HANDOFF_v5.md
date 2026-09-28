# Handoff v5 — Track Studio

**Fecha:** 2026-09-27 · **Sprint:** 1 · **Capa(s):** global / infra
**Foco de la sesión:** smoke test del entorno de staging (ts-29.06) y registro del entorno (ts-29.07).

> Continúa [`HANDOFF_v4.md`](HANDOFF_v4.md). Los handoffs anteriores permanecen como historial.

---

## 1. Resumen ejecutivo

TS-40 ya está integrado en `develop` (PR #13, `51db702`). Staging quedó desplegado y el smoke test pasa completo: el frontend en Vercel carga, el login con Auth0 redirige y vuelve con el claim de rol, `/up` del backend en Railway responde 200 y el CORS de D8.3 responde correctamente al origen de staging. No se tocó código en esta sesión; solo se añadió este handoff.

## 2. Entorno de staging

| Componente | URL | Plataforma | Responsable |
| --- | --- | --- | --- |
| Frontend | `https://trackstudio-staging.vercel.app` | Vercel (despliega `develop`) | _por confirmar_ |
| Backend | `https://trackstudio-demo-staging.up.railway.app` | Railway | _por confirmar_ |
| Identidad | Tenant de desarrollo de Auth0 (`dev-…us.auth0.com`), audience `https://api.trackstudio.site/v1` | Auth0 | _por confirmar_ |

Sin credenciales: los secretos viven solo en los paneles de Vercel, Railway y Auth0 (regla §0.5, D2.2).

**Configuración verificada desde fuera** (sin leer los paneles):

- `VITE_API_BASE_URL` en Vercel apunta al backend de Railway (visible en el bundle).
- `CORS_ALLOWED_ORIGINS` en Railway incluye `https://trackstudio-staging.vercel.app`.
- Auth0 acepta `https://trackstudio-staging.vercel.app` como callback.

## 3. Smoke test (ts-29.06) — 2026-09-27

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| El frontend carga | ✅ | `GET /` → 200 (bundle `index-B5w-uacM.js`); `GET /callback` → 200 (rewrite SPA de `vercel.json`). |
| El login redirige | ✅ | `/authorize` con `redirect_uri` de staging llega a `/u/login` (sin "Callback URL mismatch"). |
| … y vuelve | ✅ | Probado por el humano en el navegador: vuelve a la app autenticado, "Mi sesión" muestra el rol `productor` desde el claim del token. |
| `/up` del backend | ✅ | `GET /up` → 200 (~0,5 s). |
| CORS (D8.3) | ✅ | Preflight `OPTIONS /api/v1/me` desde el origen de staging → 204 con `Access-Control-Allow-Origin` de staging, métodos y headers de D8.3, `max-age 600`. Con un origen ajeno no devuelve `Access-Control-Allow-Origin`. |

`GET /api/v1/me` → 404 `RESOURCE_NOT_FOUND` en formato D3.1. **Es lo esperado:** `backend/routes/api.php` está vacío; el endpoint todavía no existe. La pantalla "Mi sesión" del frontend ya lo muestra así.

## 4. Trampas y hallazgos

1. **Hay dos URLs de Vercel.** El alias de rama (`trackstudiodemofront-git-develop-track-studio.vercel.app`) **no** está registrado en Auth0 ni en `CORS_ALLOWED_ORIGINS`: ahí el login da "Callback URL mismatch" y el preflight sale sin `Access-Control-Allow-Origin`. La URL de staging es `https://trackstudio-staging.vercel.app`; usar siempre esa.
2. Si se cambia el dominio de staging (p. ej. a `staging.trackstudio.site`), hay que actualizar a la vez Auth0 (callback, logout, web origins) y `CORS_ALLOWED_ORIGINS` en Railway (bloque "Revisar" de D8.3).

## 5. Drift pendiente (heredado de v4)

- `CLAUDE.md` raíz §1.1 sigue diciendo "**8.3** CORS y rate limiting"; debe decir **8.5** rate limiting.

## 6. Bloqueos y pendientes

- **Anotar URLs y responsables en el ticket de Jira** (lo hace el humano; el agente no tiene acceso a Jira).
- Sigue **ABIERTO** en el ADR: 8.5 rate limiting, 9.2 migraciones en deploy, 9.4 rollback, 11.5 plan de medición de RNF.
- `docs/global/Prompts-fase.md` sigue sin seguimiento en Git; decidir aparte si se versiona.

## 7. Próximos pasos

1. Rellenar los responsables de §2.
2. Cuando exista `GET /api/v1/me`, repetir el smoke test contra ese endpoint desde staging (con token).
3. Corregir el drift de `CLAUDE.md` §1.1.

## 8. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
