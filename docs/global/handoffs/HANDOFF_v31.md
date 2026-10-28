# Handoff v31 — Track Studio

**Fecha:** 2026-10-28 · **Sprint:** 3 · **Capa(s):** global
**Foco de la sesión:** cerrar `TS-79` (reconciliación de la documentación) y dejar el estado del S3 a dos días del corte.

## 1. Resumen ejecutivo

`TS-79` está integrada en `develop` (PR #50, 2026-10-27) y en *Listo* en Jira. Las cuatro historias funcionales del S3 (`TS-20`, `TS-22`, `TS-23`, `TS-24`) siguen en *Listo*. Para el cierre del 2026-10-30 quedan `TS-69` y `TS-70` (UI Figma), la evidencia de calidad (`TS-35`..`TS-37`, sin asignar) y la de tesis (`TS-46`, `TS-53`, en curso).

## 2. Qué se hizo

- **`TS-79` (PR #50):** todo lo que v30 dejó en orden quedó hecho.
  - `sprint-03.md` reconciliado con Jira (`09c4020`).
  - README raíz y READMEs de capa reales (`b7d175b`, `dda182f`: Sail publica en el 80).
  - Handoffs v11–v20 y v21–v30 consolidados; originales archivados en `trackstudio-documentacion/Handoffs` (`e8b56bd`, `898c95b`).
  - Regla del repo de documentación y §9 de consolidación en `PLANTILLA-HANDOFF.md` (`f554d1a`); artefactos de importación de Jira archivados (`618b0d6`).
  - Regla 7: «humano» → «equipo» en la documentación vigente (`c6671eb`). Solo queda en la propia regla 7 de `CLAUDE.md`, que es intencional.
  - `graphify-out/` en `.gitignore` (`110078c`).
  - Drift residual: ruta de la matriz RBAC, alcance de backend y convenciones de git (`0b897de`).
  - Se borró `backlogexample/`, que era de otro proyecto (`3026e42`).
  - Commits y PRs sin trailers de agente (`4f3e5a0`).
- **Jira:** `TS-35`..`TS-37` ya están en `TS Sprint 3`. `TS-79` pasada a *Listo* por el equipo el 2026-10-28.

## 3. Decisiones tomadas en esta sesión

- **Decisión del equipo (2026-10-28):** después de este handoff se atacan `TS-69` y `TS-70` en esta misma sesión, con el reparto de la regla 2 (el agente escribe spec y tests; el equipo teclea).

## 4. Trampas y hallazgos (lo que costó tiempo)

- El consolidado v21–v30 remite a «`HANDOFF_v31.md` y siguientes», pero v31 no existía hasta hoy. Al consolidar, escribir el handoff siguiente en la misma tarea para que la referencia no quede colgando.
- En zsh, `echo ======` falla (`=cmd` se expande como ruta de comando). Para separadores en comandos encadenados usar `echo ---`.

## 5. Drift detectado

Resuelto por `TS-79`: los seis puntos de v30 (sprint-03, READMEs, consolidación, `TS-35`..`TS-37` en el sprint, regla 7, `graphify-out/`).

Siguen vivos (vienen de v22–v30):

| Drift | Dueño | Estado |
|---|---|---|
| El CORS del bucket permite `PUT`/`GET` (v26), pero HU-13 sube con POST desde el 2026-10-20 | Infraestructura (equipo) | Sin verificar. Puede romper la subida en staging |
| La descripción del PR #47 usa `sail psql -c` | GitHub | Pendiente |
| `sprint-03.md` no tiene subtareas `ts-39.0x` / `ts-40.0x` / `ts-41.0x` | `sprint-03.md` | Pendiente; se resuelve al especificar `TS-69`/`TS-70` |
| Correcciones de Auth0 v7 y D2.1 sin llevar al documento de tesis | Tesis | Pendiente |
| Ajustes de Jira: SP de TS-40, épicas en *Por hacer*, TS-61 ausente | Jira | Pendiente |

## 6. Bloqueos y pendientes

- **ABIERTOS en el ADR:** 8.5 (rate limiting) y 11.5 (medición de RNF). Ninguno bloquea `TS-69`/`TS-70`.
- **Equipo (regla 6):** `php -v` en Railway, `node -v` en Vercel, `APP_DEBUG=false` en staging, log `artist.status_changed` en Railway (`ts-07.09`), smoke test y CORS del bucket con POST.
- **Comprobaciones `.09` en staging:** `TS-17`, `TS-18`, `TS-19`, `TS-21`, `TS-20`, `TS-22`, `TS-23`, `TS-24`. No bloquean el Done.
- **Sin tarea:** el 405 que sale como 500 en el manejador D3.1.
- **Cosmético:** el menú móvil del shell no se cierra al navegar hacia atrás; clases `dark:` en `input.tsx`; línea en blanco de más en `SongList.tsx`.

## 7. Próximos pasos

1. `TS-69` (login, inicio, 403 y errores) y luego `TS-70` (artistas): spec, tests en rojo, implementación del equipo y review.
2. Evidencia de `TS-35`..`TS-37` sobre la superficie del S3. Es la reserva que el plan pide proteger al corte.
3. Evidencia de `TS-46`/`TS-53` y cierre del S3 el 2026-10-30. Lo que no entre de `TS-69`/`TS-70` pasa al S4 con registro.

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9.
