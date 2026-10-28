# Handoff v32 — Track Studio

**Fecha:** 2026-10-28 · **Sprint:** 3 · **Capa(s):** frontend / global
**Foco de la sesión:** `TS-69` completa (Figma → spec → rojo → verde → review) y registro de «Mi perfil» como candidata (`TS-80`).

## 1. Resumen ejecutivo

`TS-69` cerró su ciclo en la sesión: marcos diseñados en Figma, spec aprobada, cuatro tests en rojo, código del equipo en verde y review con hallazgos corregidos. La suite está en verde (261/261) y el build también. Falta el commit de la fase en verde, pasar el PR (en draft) a *Ready for review* y la comprobación visual de `ErrorAlert` en `/artistas` (§6). Para el corte del 2026-10-30 quedan `TS-70`, la evidencia de `TS-35`..`TS-37` y `TS-46`/`TS-53`.

## 2. Qué se hizo

- **Figma** (archivo «Track Studio (Copy)», `uDajU3zIBNlPk6a2ZKUgIc`): sección nueva **«TS-69 · Ajustes Track Studio» (`2101:2`)**. Los originales no se tocaron. Contiene el login con Auth0 (escritorio `2101:3`, móvil `2101:71`), el 403 (`2102:2`/`2102:43`), el error de autenticación (`2106:2`/`2106:40`), el componente «Alerta de error» (`2106:59`) y la alerta en contexto sobre artistas (`2106:71`). Se escribió con el MCP de Figma (`use_figma`).
- **Spec** [`docs/specs/frontend/TS-69.md`](../../specs/frontend/TS-69.md): aprobada sin cambios. `HU-03.md` y `HU-04.md` remiten a ella en su registro.
- **Red/Green/Review:** detalle en el registro de la spec (§6). Hay cuatro tests nuevos (`Home.test.tsx` y casos en `App.test.tsx` y `LoginButton.test.tsx`) y C3 completa.
- **`TS-80`** (Story candidata bajo `TS-2`, sin sprint): «Mi perfil». Registrada en `roadmap.md` («Reglas de alcance») y en `jira-key-map.md`.
- **Jira:** «(humano)» → «(equipo)» en las checklists de `TS-69` y `TS-70`. Las casillas `ts-40.01`..`.03` las marcó el equipo.

## 3. Decisiones tomadas en esta sesión

- **Login con Auth0 Universal Login** (D4.8): se adopta la tarjeta de Figma sin los campos de credenciales. Tematizar la página de Auth0 sería infraestructura del equipo.
- **El nombre del cliente fuera de la UI** (regla 5, D2.2): el pie dice «Acceso exclusivo para miembros autorizados.».
- **El error de autenticación con «Reintentar inicio de sesión»**: es el único cambio de comportamiento de `TS-69`.
- **Inicio sin marco**; el Dashboard (`1:76`) sigue excluido (métricas sin RF).
- **«Mi perfil» (`TS-80`)**: candidata para otro sprint, solo con datos propios. Las estadísticas esperan una decisión formal con el dueño de Track Studio.
- **Desviaciones de Figma aceptadas** (`TS-69` §3.1 y §6): `AudioWaveform` como marca, pie móvil en `--placeholder`, botón en `--primary`, sin barras decorativas y texto de la alerta al 90 %.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`npx shadcn add` reescribe el import de `cn`.** La versión actual del CLI generó `import { cn } from 'cn'` e instaló el paquete npm `cn` (de shadcn, «sustituto» de `clsx` + `tailwind-merge`). `tsc` pasaba porque el paquete existía. **Después de cada `shadcn add`, revisar el diff de `package.json` y los imports del archivo generado.** El repo usa `@/lib/utils`.
- **`npm uninstall` de un paquete que además es dependencia transitiva** deja ruido en `package-lock.json`: `cn@0.2.6` venía de `shadcn` y npm lo reubica. Se descarta con `git checkout package-lock.json && npm ci`.
- **`rounded-lg` no vale 8px aquí:** con el `--radius: 0.75rem` de TS-68, `rounded-lg` son 12px. Para radios de Figma, usar valores explícitos (`rounded-[8px]`).
- **Los colores de las variantes de shadcn ganan por especificidad.** `*:data-[slot=…]:text-…` sobre el padre (0,2,0) pisa un `text-…` en el hijo (0,1,0). Un `className` en el hijo no basta.
- **Los tests no ven el estilo** (C2): `ErrorAlert` sin aplicar en las páginas pasaba toda la suite, porque el `<p role="alert">` antiguo también cumple. Lo detectó el equipo al mirar `/artistas`. La comparación lado a lado del review es imprescindible.
- **Sin Chrome en `/opt/google/chrome`**, el MCP de Playwright no arranca. Funciona el Chromium de `~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome --headless=new --screenshot=…`. El error de Auth0 se provoca sin backend con `/?error=access_denied&state=abc`.
- En zsh, `echo ======` falla (expansión `=cmd`). Para separadores, usar `echo ---`.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| «humano» en 32 tickets de Jira (TS-71..TS-76, HU cerradas, Tasks) | Jira | Pendiente; el equipo decide si se hace una pasada |
| Los commits `docs:`/`test:` del rojo de TS-69 no llevan `(<scope>)` (`reglas-git.md` §3) | Historial | Ya publicado; los siguientes llevan scope |
| CORS del bucket con `PUT`/`GET`, pero HU-13 sube con POST | Infraestructura (equipo) | Sin verificar (viene de v31) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes

- **`TS-69`:** comprobación visual de `ErrorAlert` en `/artistas` con el backend apagado, contra `2106:71` (el equipo). Luego commit del verde, PR a *Ready for review* y casillas `ts-40.04`/`ts-40.05`.
- **ABIERTOS en el ADR:** 8.5 y 11.5. No bloquean el corte.
- **Equipo (regla 6) y comprobaciones `.09` en staging:** sin cambios respecto a v31 §6.

## 7. Próximos pasos

1. Cerrar `TS-69` (§6).
2. `TS-70` (artistas): inventario contra `1:373`, con la trampa de §4 sobre los radios y la de D6.3 (TS-68 §0.6.1) en la mano.
3. Evidencia de `TS-35`..`TS-37` y de `TS-46`/`TS-53`; cierre del S3 el 2026-10-30. Lo que no entre de `TS-70` pasa al S4 con registro.

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9. Nuevo en el código: `src/components/ui/alert.tsx` (shadcn), `AuthCard` y `ErrorAlert`.
