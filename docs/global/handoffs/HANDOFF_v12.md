# Handoff v12 — replanificación a 12 semanas y Sprint 2

**Fecha:** 2026-10-02 · **Sprint:** transición S1 → S2 · **Capa(s):** global / planificación
**Foco de la sesión:** convertir la replanificación aprobada en baseline documental, sincronizar Sprint 02 con Jira y preparar la integración mediante TS-60.

> Continúa [`HANDOFF_v11.md`](HANDOFF_v11.md). Rama observada al iniciar: `feature/TS-15-rbac-frontend`. Este cambio solo modifica documentación. El agente no realizó escrituras de git ni infraestructura; Jira sí fue sincronizado con autorización del usuario.

## 1. Resumen ejecutivo

El proyecto queda replanificado de 14 a **12 semanas**, desde el 2026-09-21 hasta el 2026-12-11, sin eliminar ninguna de las 28 HU, sus 92 SP ni las Tasks transversales. La nueva baseline conserva seis sprints de dos semanas y absorbe el trabajo de los antiguos S7/S8 dentro de S2-S6.

HU-24..HU-26 mantienen sus 8 SP y cierre formal en S6, pero se trabajan incrementalmente con una reserva de 2 SP equivalentes en cada sprint S2-S5. HU-27 y HU-28 reservan 5 SP en S6. Los SP se cuentan una sola vez; las subtareas/checklists intermedias aportan trazabilidad, no puntos adicionales.

Sprint 02 queda definido para el 5-16 de octubre con HU-05..HU-09 (`TS-16`..`TS-20`, 13 SP), 2 SP equivalentes de calidad transversal y las Tasks `TS-41`, `TS-46` y `TS-49`.

En Jira se creó `TS Sprint 2` (id 37), se cargó ese alcance y se reconciliaron dependencias, descripciones, etiquetas y checklists. TS-15 y TS-54 están en `Listo`. TS-60 permanece `En curso` hasta integrar este cambio documental.

## 2. Decisiones aprobadas

- Seis sprints de dos semanas en lugar de ocho sprints.
- Fecha final: viernes 2026-12-11.
- Alcance invariable: HU-01..HU-28, 92 SP, RF-01..07, RNF-01..07 y Tasks existentes.
- R1 cierra al final de S4; R2 es un gate interno de S6; R3 cierra S6 en producción.
- Meta desde S2: 15,2 SP promedio por sprint; control formal a mitad y cierre.
- Dos cortes consecutivos por debajo de la meta obligan a ajustar capacidad, esperas o fecha. El alcance no es una palanca autorizada.
- TS-15 quedó en `Listo` el 2026-10-02; su contrato RBAC es una precondición satisfecha de S2.
- TS-17 necesita TS-19 para demostrar producciones asociadas, aunque su spec/listado base pueda empezar después de TS-16.
- TS-20 no implementa la regla de duración del EP hasta aprobar su fuente/momento de cálculo sin inventar prematuramente canciones/audio de S3.

## 3. Documentos actualizados

- [`../../backlog/roadmap.md`](../../backlog/roadmap.md): baseline completa de 12 semanas, capacidad, releases, gates, riesgos y seguimiento transversal.
- [`../../backlog/sprints/sprint-02.md`](../../backlog/sprints/sprint-02.md): objetivo, selección, dependencias, secuencia, checklists, DoD, gates, riesgos y acciones Jira.
- [`../../backlog/jira-backlog.md`](../../backlog/jira-backlog.md): ventanas S1-S6, movimiento lógico de HU-24..HU-28, Tasks transversales y resumen de Sprint 02.
- [`../../backlog/backlog-format.md`](../../backlog/backlog-format.md): convención de seis sprints y contabilidad de HU-24..HU-26.
- [`../../backlog/sprints/sprint-01.md`](../../backlog/sprints/sprint-01.md): cierre de TS-15 y transición efectiva a S2.
- [`../../backlog/imports/README.md`](../../backlog/imports/README.md): advertencia de que las etiquetas S7/S8 del CSV son históricas.
- [`../../backlog/jira-key-map.md`](../../backlog/jira-key-map.md): verificación del 2026-10-02, Sprint 2 id 37 y TS-60.
- [`../../../CLAUDE.md`](../../../CLAUDE.md): vetos temporales actualizados al alcance de S2; artistas/producciones quedan habilitados tras ERD y spec.
- [`../runbook-mantenimiento.md`](../runbook-mantenimiento.md): Resend referenciado a S5, no al alcance histórico de S1.

## 4. Baseline de capacidad

| Sprint    | HU principales |                         Reserva transversal | Capacidad objetivo |
| --------- | -------------: | ------------------------------------------: | -----------------: |
| S1        |          16 SP |                                           0 |                 16 |
| S2        |          13 SP |                           2 SP equivalentes |                 15 |
| S3        |          13 SP |                           2 SP equivalentes |                 15 |
| S4        |          13 SP |                           2 SP equivalentes |                 15 |
| S5        |          13 SP |                           2 SP equivalentes |                 15 |
| S6        |          16 SP | cierre HU-24..HU-26 con evidencia acumulada |                 16 |
| **Total** |      **84 SP** |                                    **8 SP** |          **92 SP** |

Las Tasks sin SP consumen la misma capacidad. La tabla no autoriza sobrecargar el sprint ni ocultar arrastre.

## 5. Sprint 02

| Jira  | HU    |  SP | Dependencia crítica                     |
| ----- | ----- | --: | --------------------------------------- |
| TS-16 | HU-05 |   3 | Contrato RBAC satisfecho por TS-15.     |
| TS-17 | HU-06 |   2 | TS-16 y TS-19 para aceptación completa. |
| TS-18 | HU-07 |   2 | TS-16.                                  |
| TS-19 | HU-08 |   3 | TS-16 y slice `productions` de TS-49.   |
| TS-20 | HU-09 |   3 | TS-19 y contrato de duración de EP.     |

Tasks: TS-41 (dominio/DNS), TS-46 (evidencia de desarrollo) y TS-49 (ERD completo). La reserva transversal se registra contra TS-35..TS-37 (HU-24..HU-26), no como SP nuevos.

## 6. Sincronización Jira ejecutada

- Creado `TS Sprint 2` (id 37) con fechas 2026-10-05 a 2026-10-16 y el objetivo aprobado.
- Asignados TS-16..TS-20, TS-41, TS-46 y TS-49.
- Añadido el enlace de bloqueo TS-19 → TS-17 para su aceptación completa.
- Corregidos TS-19/TS-20 respecto al bloque 7 del ADR.
- Reasignado el objetivo de TS-35..TS-39 a S6 y añadido seguimiento incremental S2-S5 a TS-35..TS-37, sin duplicar SP.
- Actualizados TS-41, TS-46 y TS-49; en TS-49 quedaron verificadas las decisiones ya cerradas por TS-54.
- Actualizado TS-60 con alcance, criterios y checklist de la replanificación. Quedan abiertos rama, PR y merge.

## 7. Gates inmediatos

- Aprobar el slice `productions` de TS-49 en el primer tercio de S2.
- Resolver el contrato de duración del EP en la spec de HU-09 antes de escribir tests/implementación de TS-20.
- Mantener verificable el contrato RBAC ya integrado por TS-15 durante TS-16..TS-20.
- Proteger la reserva transversal de calidad y revisar su evidencia a mitad de sprint.
- No iniciar código de aplicación de S2 sin spec aprobada y tests en rojo, conforme a C1/C2.

## 8. Verificación realizada

- Recuento conservado: 28 HU y 92 SP.
- Horizonte: seis sprints × dos semanas = 12 semanas.
- Capacidad: 16 + 15 + 15 + 15 + 15 + 16 = 92 SP.
- No se editaron CSV históricos ni se renumeraron claves Jira; sí se actualizaron campos operativos del tablero.
- No se ejecutaron tests de aplicación porque el cambio es exclusivamente documental.

## 9. Próximo paso recomendado

Crear la rama `feature/TS-60-replan-sprint-02`, integrar estos documentos mediante PR contra `develop` y cerrar TS-60 después del merge. Luego comenzar por TS-49 (slice `productions`) y la spec backend de TS-16.
