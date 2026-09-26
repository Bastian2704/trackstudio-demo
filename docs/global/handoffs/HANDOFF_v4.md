# Handoff v4 — Track Studio

**Fecha:** 2026-09-25 · **Sprint:** 1 · **Capa(s):** backend / global
**Foco de la sesión:** cerrar la política CORS del backend (D8.3) para poder aprobar el PR de TS-40 (staging Vercel + Railway).

> Continúa [`HANDOFF_v3.md`](HANDOFF_v3.md). Los handoffs anteriores permanecen como historial.

---

## 1. Resumen ejecutivo

El reviewer bloqueó el PR de TS-40 porque `backend/config/cors.php` traía valores de plantilla de Laravel (`sanctum/csrf-cookie`, `*` en métodos y headers, `max_age 0`), y esa política pertenecía a **8.3, todavía ABIERTA** en el ADR. En esta sesión se cerró **D8.3 (solo CORS)**, se escribió `CorsTest.php` (primero en rojo, después en verde) y el humano ajustó `cors.php`. Dentro de Sail pasan Pint, PHPStan (0 errores) y la suite completa (**32 tests, 113 assertions**). Los tres commits ya están hechos en la rama; falta el push, el PR y configurar la variable en Railway.

## 2. Qué se hizo

| Tarea | Estado | Evidencia |
| --- | --- | --- |
| Merge de `develop` en `TS-40-vercel-railway-staging` (lo hizo el humano) | Hecho | `119e2f5` |
| Cerrar D8.3 en el ADR (solo CORS; rate limiting pasa a 8.5 ABIERTO) | Hecho | `37079c3` · `docs/adr/decisiones-tecnicas-track-studio.md` §8 |
| `backend/tests/Feature/CorsTest.php`: 7 casos, preflight OPTIONS | Hecho | `f1000fa` |
| Ajuste de `backend/config/cors.php` a D8.3 (lo tecleó el humano; auditado sin hallazgos) | Hecho | `e2508cb` |

Commits previos de TS-40 que ya estaban en la rama: SPA rewrites en `frontend/vercel.json`, `CORS_ALLOWED_ORIGINS` en `backend/.env.example` y la creación de `cors.php`.

**Evidencia SDD/TDD:**

| Compuerta | Evidencia |
| --- | --- |
| Rojo (C3) | Con el `cors.php` original: 3/7 verdes. Fallan métodos, headers, `max_age` y la ruta de Sanctum. |
| Verde | Con el `cors.php` ajustado: 7/7. |
| Formato | `sail pint --test` pasa. |
| Análisis estático | PHPStan nivel 5: 0 errores. |
| Suite | 32 tests, 113 assertions, todo verde. |
| Review del diff | Sin hallazgos: el diff coincide exactamente con D8.3. |

## 3. Decisiones tomadas en esta sesión

- **D8.3 — CORS del backend: DECIDIDO (2026-09-25).**
  - **Rutas:** solo `paths ['api/*']`, sin Sanctum; no está instalado y la auth es Bearer de Auth0 (D4.8, D5.1).
  - **Orígenes:** desde `CORS_ALLOWED_ORIGINS` (CSV), nunca `*` y sin `allowed_origins_patterns`. `*.vercel.app` lo comparte cualquier proyecto de Vercel.
  - **Métodos:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
  - **Headers:** `Authorization, Content-Type, Accept, X-Requested-With`.
  - **Resto:** `max_age 600` y `supports_credentials false`.
  - **Por qué:** es lo que envía hoy `frontend/src/lib/api.ts` (axios + Bearer, sin cookies), con el mismo criterio de "nunca `*`" que D7.5.
- **8.5 — Rate limiting: ABIERTO.** Se separó de 8.3 para no decidirlo sin necesidad en este PR.

## 4. Trampas y hallazgos (lo que costó tiempo)

1. **Con un solo origen configurado, `HandleCors` devuelve siempre ese origen.** Fruitcake/php-cors, cuando `allowed_origins` tiene un único valor sin comodín, pone ese valor fijo en `Access-Control-Allow-Origin` aunque pregunte otro origen. El navegador bloquea igual porque no coincide. Un test que haga `assertHeaderMissing('Access-Control-Allow-Origin')` con un origen ajeno **falla por diseño**. Lo correcto es afirmar que el header **no es el origen ajeno ni `*`** (así quedó `CorsTest.php`).
2. **`storage/logs/laravel.log` con dueño root.** Al levantar Sail por primera vez el log se creó como root. Después, 4 tests de `ErrorShapeTest` fallaban con `Permission denied` al escribir en el log. No es un bug de código. Solución: `rm backend/storage/logs/laravel.log` y volver a correr.
3. **Sin `.env`, Sail no arranca los tests** (avisos `DB_DATABASE`/`DB_USERNAME` vacíos y "Sail is not running"). Hay que crearlo con `cp .env.example .env`, luego `sail up -d` y `sail artisan key:generate`.
4. **El ADR solo existía en `develop`.** Las ramas creadas antes de su merge no lo tienen. Antes de tocar decisiones hay que integrar `develop`.
5. Apareció un `tests/Feature/TmpDebugCors.php` de depuración (con `dump()`) que el agente no había creado. No se incluyó en los commits y ya no está en el árbol.

## 5. Drift detectado

- **`CLAUDE.md` raíz §1.1** sigue listando "**8.3** CORS y rate limiting" entre lo que bloquea. Ahora debe decir **8.5 rate limiting** (CORS ya está decidido). El dueño es el `CLAUDE.md` raíz; hay que corregirlo la próxima vez que se toque.
- **"Resumen de puntos abiertos priorizados" del ADR:** no se añadió un recordatorio para 8.5; se dejó fuera a propósito para limitar el PR a lo necesario. Añadirlo cuando se trabaje el rate limiting.

## 6. Bloqueos y pendientes

- **Railway (lo hace el humano, regla §0.6):** definir `CORS_ALLOWED_ORIGINS` con el dominio real de staging en Vercel. Sin eso, el frontend desplegado recibe errores CORS.
- **Vercel:** confirmar que `VITE_API_BASE_URL` apunta a la URL de Railway.
- **Sigue ABIERTO en el ADR:** 8.5 rate limiting, 9.2 migraciones en deploy, 9.4 rollback y 11.5 plan de medición de RNF.
- `docs/global/Prompts-fase.md` está sin seguimiento en Git y no pertenece a TS-40; decidir aparte si se versiona.

## 7. Próximos pasos

1. Push de la rama y actualizar el PR de TS-40 respondiendo al reviewer: D8.3 cerrado, Sanctum retirado, valores explícitos y tests.
2. Configurar `CORS_ALLOWED_ORIGINS` en Railway y probar desde el staging de Vercel un request real a `/api/v1/me`.
3. Al configurar el dominio de producción, o si 3.7 decide `X-Trace-Id` desde el frontend, revisar D8.3 (ver su bloque "Revisar").
4. Corregir el drift de `CLAUDE.md` §1.1 (8.3 → 8.5).

## 8. Cómo retomar el entorno (si cambió)

Si `backend/.env` no existe:

```fish
cd backend
cp .env.example .env
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail pest --filter=Cors
```

Si fallan tests de `ErrorShapeTest` con `Permission denied` en `laravel.log`, ver la trampa 2 de §4.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
