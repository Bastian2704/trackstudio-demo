# Handoff v34 — Track Studio

**Fecha:** 2026-11-03 · **Sprint:** 4 · **Capa(s):** global / backlog
**Foco de la sesión:** planificar el Sprint 4 en el repositorio y en Jira, con el mismo formato que el S3.

## 1. Resumen ejecutivo

El S4 queda planificado. `TS Sprint 4` (id 72) ya estaba activo desde el 2026-11-02, con el arrastre automático pero sin objetivo. Ahora tiene objetivo, TS-25..TS-27 (13 SP), TS-71, TS-72 y TS-45, con sus checklists de ejecución. El plan está en `docs/backlog/sprints/sprint-04.md`. Al cierre del sprint se cierra R1 (HU-01..HU-16, 55/92 SP). Las tareas de cada historia son las casillas de su ticket, como pide `backlog-format.md`; el único ticket nuevo es `TS-84` (Sprint Planning S4).

## 2. Qué se hizo

- **Jira:** objetivo del sprint 72; TS-25, TS-26, TS-27, TS-71, TS-72 y TS-45 movidas al sprint; Description de TS-25/26/27 con frontera y checklist `ts-14.xx`, `ts-15.xx` y `ts-16.xx` (AC sin tocar); checklist `ts-34.01`..`.05` en TS-45; TS-71/TS-72 con la ventana al día y sus casillas atribuidas al equipo; comentarios de arrastre y casillas `.s4` en TS-46 y TS-35..TS-37; `TS-84` (Sprint Planning S4, Task de `TS-1`) creada en el sprint con la checklist de la planificación.
- **Docs:** `docs/backlog/sprints/sprint-04.md` (nuevo); `CLAUDE.md` §1 y §5 (nota del Sprint 4 que levanta los vetos de verificación y de URLs de lectura); `roadmap.md` («Siguiente paso»); `jira-key-map.md` (línea del Sprint 4).

## 3. Decisiones tomadas en esta sesión

- **La verificación `HeadObject`/ETag, el paso a `verificada`/`fallida` y el abandono de las pendientes van en TS-25 (HU-14)**, no en TS-27: decisión del equipo. TS-27 queda solo con la URL de lectura.
- **TS-71, TS-72 y TS-45 entran al S4:** decisión del equipo.
- **En S4 solo reproduce el productor.** El artista que nombran HU-15/HU-16 espera a HU-21 (S6), porque `production_access` sigue vetada.
- **HU-15 solo tiene spec backend si el reproductor necesita algo que TS-25/TS-27 no den;** si no, `ts-15.01` se cierra registrándolo.

## 4. Trampas y hallazgos

- **El sprint ya existía y estaba activo** (creado e iniciado al cerrar el S3). Antes de crear un sprint conviene consultar `sprint in openSprints()`.
- **`manageJiraSprint` con `update` reescribe el sprint entero:** hay que reenviar nombre y fechas junto con el objetivo, o se borran.
- **La Description en HTML con `ul data-type="task-list"` crea casillas nativas** (se leen como `- [ ]`). Se escribieron sin comillas invertidas (trampa v33 §4).
- **TS-35..TS-37 cuentan 8 SP en el sprint de Jira:** la velocidad del S4 se mide solo con los 13 SP de TS-25..TS-27.
- **Puede que el navegador no deje leer el ETag** de la respuesta del POST a S3 (falta `ExposeHeaders` en el CORS). Queda como riesgo en `sprint-04.md` y debe resolverlo la spec de HU-14.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| CORS del bucket con `PUT`/`GET`; HU-13 sube con POST y HU-14 puede necesitar `ExposeHeaders: ETag` | Infraestructura (equipo) | Sin verificar; riesgo del S4 |
| «humano» en tickets antiguos de Jira | Jira | Corregido solo en TS-71 y TS-72; el resto sigue igual (v32) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes

- **Git:** los cambios de esta sesión siguen sin commitear (§7). Siguen pendientes los de v33 (`TS-70`, `TS-81`/`TS-82`).
- **Responsables** de TS-25..TS-27 sin asignar en Jira.
- **Arrastre del S3:** evidencia de TS-46 y TS-35..TS-37, comprobaciones `.09` y las de TS-70 (v33 §6).
- **ABIERTOS en el ADR:** 8.5 y 11.5, sin cambios.

## 7. Próximos pasos

1. Commitear la planificación (comandos en la respuesta de la sesión).
2. Asignar los responsables de TS-25..TS-27 y verificar el CORS del bucket (equipo).
3. Arrancar `ts-14.01` y `ts-16.01` (specs backend de HU-14 y HU-16).

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9.
