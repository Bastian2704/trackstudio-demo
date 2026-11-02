# Handoff v33 — Track Studio

**Fecha:** 2026-11-02 · **Sprint:** 3 · **Capa(s):** frontend / global
**Foco de la sesión:** `TS-70` completa (inventario → spec → rojo → verde → review) y registro de las candidatas post-S6 `TS-81` y `TS-82`.

## 1. Resumen ejecutivo

`TS-70` cerró su ciclo en la sesión: inventario contra Figma, spec aprobada, tests en rojo, verde y review con hallazgos corregidos. La suite está en verde (270/270), con Prettier, build y ESLint sin errores (los 3 avisos previos). Falta publicar `972b7ae`, pasar el PR #52 a *Ready for review* y hacer las comprobaciones que el review dejó sin capturar (§6). `TS-81` y `TS-82` quedaron en el backlog de Jira, pero sus cambios de documentación siguen sin commitear.

## 2. Qué se hizo

- **Spec** [`docs/specs/frontend/TS-70.md`](../../specs/frontend/TS-70.md): aprobada, incluidas §3.5 y §3.7. Enmienda HU-05, HU-06 y HU-07. El detalle de rojo, verde y review está en su registro (§6).
- **Código y tests:** `ArtistStatusBadge`, `artistStyles.ts`, `dialog.tsx`, listado con tarjetas por debajo de `lg`, alta en modal con ruta hija, edición con paneles, `onCancel` en `ArtistForm`, padding de `AppShell` y `color-scheme: dark` en `index.css`. Sin dependencias nuevas. C3: 14 mutaciones en rojo, más el test 8.
- **Commits en `feature/TS-70-ui-artistas`:** `0ed2d72` (spec), `a5a5152` (rojo) y `972b7ae` (verde). El último sigue sin publicar. PR #52 a `develop`, en draft.
- **Jira:** casillas `ts-41.04` y `ts-41.05` marcadas en `TS-70`, con las limitaciones de §6. El ticket sigue En curso y en el Sprint 3.
- **`TS-81`** (Story candidata bajo `TS-4`, sin sprint): listado de producciones con filtros. Checklist `ts-81.01`..`.10`.
- **`TS-82`** (Story candidata bajo `TS-7`, sin sprint): notificaciones en la aplicación. Checklist `ts-82.01`..`.11`.
- **Documentación:** `roadmap.md` («Reglas de alcance») y `jira-key-map.md` registran ambas. Sin commitear (§6).

## 3. Decisiones tomadas en esta sesión

- **Alta de artista en modal sobre el listado** (`/artistas/nuevo`): decisión del equipo que amplía el alcance original de la Task (`TS-70` §0.6, §3.5).
- **Tarjetas por debajo de `lg`, no de `md`:** a 768 px el aside deja 448 px y no caben las cinco columnas.
- **Mandan los tokens y el marco de escritorio sobre el móvil:** `106:1038` trae colores y fuente que no están en los tokens. Las desviaciones aceptadas están en `TS-70` §3.7.
- **`TS-70` se mantiene en el Sprint 3 de Jira:** decisión del equipo.
- **Artistas solo para invitar y editar; producciones en su propia pantalla, con filtros por artista y por tipo (`TS-81`):** decisión del equipo, para después de S6. No cambia S1..S6 ni los 92 SP. Exige enmendar el AC de `TS-17` y revisar RF-01.
- **Notificaciones de comentarios y solicitudes de sesión en la aplicación (`TS-82`):** decisión del equipo, para después de S6, con actualización por consulta periódica. Depende de `TS-28` y `TS-34`.
- **`TS-82` va bajo `TS-7`:** cruza comentarios y sesiones; `TS-7` porque HU-17 es la primera que genera avisos.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`npx shadcn add dialog` volvió a instalar `cn`** (`cn@0.5.2`) y además se detenía al pedir sobrescribir `button.tsx`. Se revirtió con `npm ci` y `dialog.tsx` se escribió sobre `@base-ui/react/dialog`. Sigue vigente la trampa de v32 §4: revisar siempre `package.json` tras un `shadcn add`.
- **Un modal en ruta hija necesita `<Outlet />` en el padre.** Sin él no hay `dialog`: fue la causa común de los 15 rojos del alta.
- **La tabla desbordaba a 1024 px y mostraba una barra de scroll blanca:** se corrigió con `lg:px-4 xl:px-6` y `color-scheme: dark`. Ningún test lo veía; salió en la comparación lado a lado.
- **Capturas en este equipo:** Brave sin interfaz no genera la captura; Firefox sin interfaz sí, pero no baja de 500 px de ancho y no termina si un retraso depende de una imagen. Un `await` al final del módulo retrasa `load` y deja renderizar a React.
- **Figma no mapeaba todo:** `TS-68` §0.2 no asociaba `106:1038` a artistas, y es su marco móvil. Conviene revisar los marcos móviles antes de dar por cerrado un inventario.
- **Jira y las casillas:** en la creación por Markdown, un `` `código` `` dentro de una línea `- [ ]` convirtió toda la lista en viñetas con `\[ \]` escapado. Las líneas de checklist van sin comillas invertidas.
- **Comprobar la épica antes de copiar un precedente:** `TS-81` y `TS-82` se crearon bajo `TS-2` por copiar a `TS-80`. La API de lectura no devuelve `parent`; se verifica con JQL (`parent = TS-4 AND key = TS-81`).

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| AC de `TS-17` y RF-01 frente a la reorganización de `TS-81` | Jira / dueño de Track Studio | Pendiente hasta planificar `TS-81`; `ts-81.01` lo cubre |
| `TS-70` figura En curso y en el Sprint 3 tras el corte del 2026-10-30 | Jira | Decisión del equipo; se revisa al cerrar la Task |
| «humano» en 32 tickets de Jira | Jira | Sin cambios (v32) |
| CORS del bucket con `PUT`/`GET`, pero HU-13 sube con POST | Infraestructura (equipo) | Sin verificar (v31) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes

- **`TS-70`, sin capturar en el review:** 390 px, foco por teclado, diálogo de desactivación y flujo contra el backend real con Auth0. Las casillas `ts-41.04` y `ts-41.05` se marcaron por indicación del equipo con esto abierto: deben comprobarse antes de cerrar la Task.
- **`TS-70`, git:** publicar `972b7ae`, commitear este handoff y pasar el PR #52 a *Ready for review*.
- **`TS-81` y `TS-82`, git:** `roadmap.md` y `jira-key-map.md` siguen modificados en el árbol, sin commitear. Van en `chore/TS-81-registrar-candidatas`.
- **`TS-82`:** las dependencias con `TS-28` y `TS-34` constan en la descripción, no como enlaces de Jira.
- **Evidencia de `TS-35`..`TS-37` y `TS-46`/`TS-53`:** no se tocó en esta sesión; su estado no se verificó.
- **ABIERTOS en el ADR:** 8.5 y 11.5, sin cambios.
- **Equipo (regla 6) y comprobaciones `.09` en staging:** sin cambios respecto a v31 §6.

## 7. Próximos pasos

1. Publicar `TS-70`, hacer las comprobaciones de §6 y pasar el PR #52 a revisión.
2. Commitear el registro de `TS-81` y `TS-82` en su rama.
3. Confirmar el estado de la evidencia de `TS-35`..`TS-37` y de `TS-46`/`TS-53`, y seguir con el Sprint 3.

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9. Nuevo en el código: `src/components/ui/dialog.tsx`, `ArtistStatusBadge` y `artistStyles.ts`.
