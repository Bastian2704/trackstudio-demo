# Handoff v41 — Track Studio

**Fecha:** 2026-11-16 · **Sprint:** cierre del 4 y planificación del 5 · **Capa(s):** global
**Foco de la sesión:** conexión con el Jira correcto, cierre de `TS Sprint 4` y planificación de `TS Sprint 5` (`TS-86`).

## 1. Resumen ejecutivo

`TS Sprint 4` quedó cerrado en Jira con TS-25, TS-26, TS-27 y TS-85 en `Listo`. R1 queda cerrado: HU-01..HU-16, 55/92 SP de la baseline, más 3 SP de alcance nuevo. `TS Sprint 5` tiene objetivo, fechas y alcance: HU-17..HU-19 (TS-28..TS-30, 13 SP), TS-73, TS-44 y la reserva de TS-35..TS-37. Falta que el equipo apruebe el plan, asigne responsables, inicie el sprint y commitee los docs.

## 2. Qué se hizo

- **Conexión con Jira:** el MCP de este proyecto se llamaba `atlassian`, igual que el del home, y compartía su token con el sitio de otro proyecto. Se renombró a `atlassian-ts` (configuración local de Claude Code, fuera del repo). Ahora apunta al sitio del proyecto `TS`.
- **Cierre del S4:** TS-35..TS-37 pasaron al sprint 73 y después se cerró el sprint 72.
- **TS-86** creada (Sprint Planning S5, Task de `TS-1`) con su checklist.
- **Sprint 73:** objetivo y fechas (2026-11-16 a 2026-11-30). Se movieron TS-28, TS-29, TS-30, TS-73 y TS-44.
- **Tickets:** checklists `.01`..`.09` y frontera S5 en TS-28..TS-30, sin tocar los AC. En TS-73, «humano» pasó a «equipo» y se añadieron la ventana y la frontera con TS-29. Casillas `.s5` y arrastre comentados en TS-35..TS-37.
- **Docs:** `docs/backlog/sprints/sprint-05.md` (nuevo), `CLAUDE.md` §5 (veto de `comments` levantado solo para TS-28..TS-30), `roadmap.md` («Siguiente paso») y `jira-key-map.md` (TS-84, TS-85 y TS-86).

## 3. Decisiones tomadas en esta sesión

Todas salen de reglas ya vigentes; ninguna abre alcance:

1. **En S5 solo comenta el productor.** `production_access` sigue vetada hasta HU-20/S6, igual que en HU-15/HU-16.
2. **La fila RBAC de `comments` (ADR 8.1) se cierra en la spec backend de HU-17.**
3. **TS-44 entra en S5**, como pide el roadmap («Fin de S5: infraestructura productiva preparada»). La ejecuta el equipo.
4. **`ts-44.01` (inventario de Figma de TS-73) va en la semana 1**, antes de la spec frontend de HU-18.

## 4. Trampas y hallazgos

- **Los controles nativos de `<audio>` no admiten marcadores.** `VersionPlayer` usa `controls`. HU-18 necesita una barra propia alineada a `duration_ms` o controles propios. Lo decide la spec frontend.
- **`VersionPlayer` vuelve a montar `<audio>` al renovar la URL** y conserva la posición con `resumeAt`. El salto de HU-19 tiene que pasar por ahí.
- **Mismo nombre de MCP, mismo token.** Dos servidores con el mismo nombre y URL comparten el token OAuth aunque estén en proyectos distintos.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| `TS-81` (candidata post-S6) está en `Listo` en Jira desde el 2026-11-13; `jira-key-map.md` y el roadmap la dan como «Por hacer, no Ready» | Equipo | Sin tocar; confirmar si fue un error |
| `TS-46`, `TS-47` y `TS-48` (tesis) están en `Listo`, pero el roadmap las cierra en S6 | Equipo | Sin tocar; confirmar si la tesis ya se entregó |
| Correcciones de la tesis (Auth0 v7, ClickUp → Jira) sin ticket abierto | Equipo | Pendiente |
| «humano» en TS-73 | Jira | Corregido |
| De v40 sin tocar: hueco de la barra móvil de `AppShell` | — | Arrastre del S5 |

## 6. Bloqueos y pendientes

- **Equipo:** aprobar `sprint-05.md`, asignar responsables de TS-28..TS-30 e iniciar el `TS Sprint 5` en Jira.
- **Git:** commit y PR de la planificación (comandos en el reporte de la sesión).
- **PR #53, #54 y #55** (evidencia de calidad de S2 y S3), abiertos desde el 2026-11-02: integrarlos o cerrarlos.
- **TS-44:** accesos de producción, a cargo del equipo.
- **ABIERTOS del ADR:** 8.5 y 11.5, sin cambios y sin bloquear.

## 7. Próximos pasos

1. Spec backend de HU-17 (`docs/specs/backend/HU-17.md`): migración, creación y fila RBAC de `comments`.
2. Inventario de Figma de TS-73 (`ts-44.01`).
3. Specs backend de HU-18 y HU-19.

## 7b. Replanificación del S5 con la ampliación del comité (misma sesión)

- **Origen:** en la revisión de avance, el comité vio el alcance simple («calza en Programación 4») y pidió proceso, motivo de cada versión, dashboard de indicadores, análisis o servicios externos, comunicación y varios productores.
- **Decisiones del equipo:**
  - Se aprueba [`ampliacion-comite-2026-11.md`](../../backlog/ampliacion-comite-2026-11.md): flujo de revisión y aprobación, motivo de la versión, análisis técnico en el navegador (LUFS, pico real, saturación, silencios; $0 de AWS), A/B con curvas y decisión, correos, dashboard del proceso y autoría con varios productores. Total: 27 SP.
  - Queda fuera el resumen con IA, por costo.
  - Capacidad de **20–22 SP por semana**.
  - El alcance principal y todas las Tasks de Figma quedan listos el 2026-12-11.
  - Las pantallas nuevas se diseñan antes en Figma, juntos, con el MCP (`TS-88`).
  - Si hay que recortar, caen primero los correos y luego el dashboard.
- **Jira:**
  - Creadas `TS-87`..`TS-96`.
  - HU-20/HU-21 (`TS-31`, `TS-32`) y `TS-74` pasan al S5.
  - El S5 queda en 40 SP; `TS-95` (dashboard) va en S6.
- **Docs:** `sprint-05.md` reescrito; `CLAUDE.md` §5, roadmap («Reglas de alcance» y «Siguiente paso») y `jira-key-map.md` actualizados.
- **Siguiente paso:**
  - `TS-87`, el slice del ERD y el ADR. Es el gate de TS-90..TS-92.
  - `TS-88`, empezando por la comparación A/B en una página nueva del archivo de Figma. Escribir en Figma necesita la confirmación del equipo.
  - En paralelo, la spec backend de HU-17.

## 8. Cómo retomar el entorno

- **Jira:** usar el servidor MCP `atlassian-ts`. Si `getAccessibleAtlassianResources` no devuelve el sitio de `TS`, volver a autenticarlo con `/mcp`.
- **Sprint de Jira:** `TS Sprint 5` es el id 73, en el tablero 3.
