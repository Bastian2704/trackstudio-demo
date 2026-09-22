# Roadmap de desarrollo (Fase 2)

**Estado:** baseline oficial de planificación desde 2026-09-21.

## Propósito y autoridad

Este documento ordena el desarrollo de Track Studio en ocho sprints agrupados en tres releases y gobierna su secuencia en Jira (proyecto `TS`). No reemplaza al ADR (`docs/adr/decisiones-tecnicas-track-studio.md`), al `CLAUDE.md` ni a la metodología (`docs/global/metodologia-sdd-tdd.md`). Ante una contradicción, prevalecen esos documentos.

El alcance proviene de `Documentacion.md`: requerimientos RF-01 a RF-07, RNF-01 a RNF-07 y las 28 historias del Anexo C. Las historias y sus criterios de aceptación viven en Jira; este roadmap solo las asigna a una ventana objetivo. S1 está en curso con trabajo previo ya integrado; S2-S8 son ventanas objetivo que se refinan antes de cada sprint sin perder alcance aprobado.

## Supuestos de planificación

- Inicio: lunes 2026-09-21 (America/Guayaquil). Horizonte objetivo: 14 semanas, hasta el viernes 2026-12-25.
- Ocho sprints con **duración máxima de dos semanas**. Si un sprint cumple su objetivo antes, se continúa con el siguiente sin esperar al calendario (ver [flujo continuo](#flujo-continuo)).
- Tres releases, heredados del plan de releases de la tesis en @Documentacion.md
- Estimación en story points con Fibonacci (1, 2, 3, 5) mediante planning poker, sin traducción directa a horas. Backlog total: 92 SP.
- Capacidad: dos desarrolladores × 80 horas por sprint de dos semanas = 160 horas nominales por sprint (80 horas en los sprints de una semana). Specs, tests, revisión, integración y correcciones consumen esa misma capacidad. No se contabilizan horas de agentes ni se asume un multiplicador.
- Ciclo SDD/TDD híbrido: el agente escribe spec y tests en rojo y audita; el humano escribe el código de aplicación y hace todo lo de git.
- Cada sprint cierra con un incremento demostrable en staging (merge a `develop`). Solo R3 se despliega a producción.

## Hitos de avance

| Hito                          | Semana | Fecha límite | Condición                                                       |
| ----------------------------- | ------ | ------------ | --------------------------------------------------------------- |
| Mitad del proyecto            | 8      | 2026-11-13   | ≥ 50 % del backlog terminado. Cierre de R1 = 55/92 SP (≈ 60 %). |
| Proyecto prácticamente cerrado | 14     | 2026-12-25   | R3 entregado: 92/92 SP, producción y aceptación con el productor. |

## Releases

| Release                    | Sprints | Semanas | Resultado esperado                                                                                               | Ambiente   |
| -------------------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| R1 - Núcleo interno (MVP)  | S1-S4   | 1-8     | El productor gestiona artistas, producciones, canciones y versiones de audio servidas con URLs firmadas.        | Staging    |
| R2 - Beta con artista      | S5-S6   | 9-12    | Comentarios con marca de tiempo, acceso restringido del artista y calendario de sesiones validados de punta a punta. | Staging    |
| R3 - Entrega en producción | S7-S8   | 13-14   | QA, pruebas de integración, despliegue a producción y documentación final entregada a Milenium Sound.           | Producción |

Un release es liberable solo cuando todas sus historias cumplen la Definition of Done: código integrado por pipeline sin fallos, pruebas pasando, criterios de aceptación cumplidos, RNF aplicables verificados y revisión en el Sprint Review.

## Secuencia objetivo por sprint

Las ventanas son **máximas**, no fijas.

| Sprint | Ventana máxima       | Historias | SP  | Demostrable al cierre                                                                          | Riesgo o dependencia principal                                                                                          |
| ------ | -------------------- | --------- | --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| S1     | 21 sep - 2 oct       | HU-01..04 | 16  | Monorepo, CI front/back, login Auth0 y endpoint protegido con RBAC (403 al rol artista).       | Riesgo bajo.       |
| S2     | 5 oct - 16 oct       | HU-05..09 | 13  | Alta, edición, listado y estado de artistas; producciones con reglas de formato.              | ERD de `artists`/`productions`. La migración de `productions` sigue bloqueada mientras el bloque 7 del ADR esté ABIERTO. |
| S3     | 19 oct - 30 oct      | HU-10..13 | 13  | Canciones por producción con borrado confirmado; subida de audio WAV/MP3 ≤ 500 MB con progreso. | **Gate:** bloque 7 del ADR DECIDIDO antes de iniciar S3. Bucket S3 e IAM los configura el humano.                    |
| S4     | 2 nov - 13 nov       | HU-14..16 | 13  | Versionado secuencial, reproductor embebido y URLs prefirmadas con expiración. **Cierre R1.**  | Expiración y refresco de URLs; integridad por hash (RNF-02, RNF-05).                                                    |
| S5     | 16 nov - 27 nov      | HU-17..19 | 13  | Comentarios con marca de tiempo sobre la línea de tiempo, navegación y borrado propio.        | Sincronización reproductor-comentarios. Hasta HU-20, el rol artista se prueba con accesos sintéticos sembrados.         |
| S6     | 30 nov - 11 dic      | HU-20..23 | 11  | Invitación y revocación de artista, vista restringida y calendario sin solapes. **Cierre R2.** | Resend (infraestructura humana) para la invitación por correo; pruebas de rechazo a recursos ajenos (RNF-01).           |
| S7     | 14 dic - 18 dic      | HU-24..26 | 8   | Pruebas unitarias e integración en pipeline; RNF-03 y RNF-07 verificados; defectos resueltos.  | Sprint de una semana: requiere que S1-S6 cierren sin arrastre.                                                          |
| S8     | 21 dic - 25 dic      | HU-27..28 | 5   | Producción en Railway y Vercel; aceptación con el productor en < 10 min. **Cierre R3.**         | 25 de diciembre es feriado (cuatro días útiles). Aprobación manual del merge a `main`.                                  |
|        |                      | **Total** | 92  |                                                                                                |                                                                                                                         |

HU-28 no tiene SP en el Anexo C; se asumen 2 SP para cuadrar los 92 SP de la tesis, pendiente de confirmar en planning poker.

### Cobertura de requerimientos

| Requerimiento           | Historias               | Sprint      |
| ----------------------- | ----------------------- | ----------- |
| RF-01 Artistas          | HU-05, HU-06, HU-07     | S2          |
| RF-02 Producciones      | HU-08, HU-09            | S2          |
| RF-03 Canciones         | HU-10, HU-11, HU-12     | S3          |
| RF-04 Versiones y audio | HU-13, HU-14, HU-15, HU-16 | S3-S4    |
| RF-05 Comentarios       | HU-17, HU-18, HU-19     | S5          |
| RF-06 Acceso del artista | HU-20, HU-21           | S6          |
| RF-07 Sesiones          | HU-22, HU-23            | S6          |
| RNF-01 Control de acceso | HU-04, HU-21           | S1, S6      |
| RNF-02 Confidencialidad | HU-03, HU-16            | S1, S4      |
| RNF-03 Tiempo de respuesta | HU-13, HU-26         | S3, S7      |
| RNF-04 Disponibilidad   | HU-27 (monitoreo post-despliegue) | S8 |
| RNF-05 Integridad       | HU-14, HU-16            | S4          |
| RNF-06 Facilidad de aprendizaje | HU-28           | S8          |
| RNF-07 Accesibilidad    | HU-26                   | S7          |
| Infraestructura y calidad | HU-01, HU-02, HU-24, HU-25, HU-27 | S1, S7, S8 |

Los RNF aplican además a cada historia funcional afectada; la tabla indica dónde se verifican formalmente.

## Flujo continuo

- La ventana de cada sprint es un máximo. Si todas sus historias cumplen la Definition of Done antes, se inicia el siguiente sprint con sus historias en estado Ready.
- Ready significa: criterios de aceptación en Jira, dependencias del ADR en estado DECIDIDO y fuera de "Qué NO hacer todavía" (`CLAUDE.md` §5).
- Nunca se adelanta una historia bloqueada por un bloque ABIERTO del ADR, aunque haya capacidad libre. La capacidad sobrante se usa en specs, tests en rojo o el track paralelo.
- Adelantar no mueve las fechas de los hitos; solo reduce el riesgo de S7-S8, que son de una semana.
- Si una historia no cabe en su ventana, vuelve al backlog y se replanifica dentro del alcance. Si el arrastre compromete el hito de la semana 8 o 14, se registra en el handoff y se decide explícitamente qué se mueve.

## Reglas de alcance

El backlog conserva completos RF-01 a RF-07. La asignación a un sprint es una previsión y no elimina alcance.

- Autenticación, RBAC, URLs firmadas, validación de audio e integridad no se recortan para cumplir una fecha.
- Fuera del alcance (Documentación, Alcance y Limitaciones): app móvil nativa, pagos y facturación, contratos y derechos, chat o notificaciones en tiempo real, edición o procesamiento de audio, integración con DAWs o distribuidoras, multiestudio, perfiles públicos, analítica, login social, i18n y formatos distintos de WAV/MP3.
- **Pendientes de decisión:** los prototipos muestran elementos que no respaldan RF-01..07 (métricas del dashboard, estado resuelto/pendiente y prioridad de comentarios, respuestas a comentarios, notas técnicas y estadísticas del artista, porcentaje de avance de la producción, portada). No entran al roadmap hasta que se decida incorporarlos a un RF o descartarlos.

## Track paralelo: ADR y documento de tesis

| Periodo | Entregable                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S1-S2   | Cerrar el bloque 7 del ADR (subida de audio a S3) y el ERD. Corregir la versión del SDK de Auth0 y la tabla de versiones (D2.1). |
| S3-S6   | Sección "Diseño de la solución" (C4 niveles 2-4, ERD, persistencia) y "Desarrollo de la solución" con evidencia por sprint.   |
| S7-S8   | "Pruebas y evaluación" (trazabilidad RF/RNF → pruebas → evidencia), "Resultados y discusión", conclusiones y resumen/abstract. |

## Gates y dependencias externas

- **ADR bloque 7 ABIERTO:** bloquea HU-13..16 y las migraciones de `productions`, `songs`, `versions`, `comments` y `studio_sessions`. Debe cerrarse antes del 19 de octubre para no desplazar R1.
- **Infraestructura manual:** Railway, Vercel, Auth0, S3, DNS y Resend los configura el equipo humano. El agente los señala como dependencia y se detiene.
- **Producción:** el merge a `main` requiere aprobación manual (plan CI/CD).

## Discrepancias a reconciliar

| Discrepancia                                                                                    | Dónde                          | Acción                                          |
| ----------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| HU-02 dice "el merge a main despliega a staging"; el plan CI/CD y `reglas-git.md` dicen `develop` → staging. | Anexo C vs plan CI/CD | Corregir el criterio de HU-02 en Jira y en el documento. |
| Restricción "Auth0 SDK v4.x para Laravel"; lo instalado es `auth0/login` v7.                    | Limitaciones vs backend        | Actualizar documento y ADR (D2.1).              |
| La tabla de costos cita ClickUp como gestor SCRUM; el tablero es Jira.                          | Tabla 21                       | Actualizar el documento.                        |
| HU-28 sin SP ni RF/RNF.                                                                          | Anexo C                        | Estimar (supuesto: 2 SP) y enlazar RNF-06.      |

## Gobierno en Jira

La jerarquía oficial es:

```text
Epic -> Story o Task con checklist detallada
Sub-task solo cuando necesita seguimiento propio
```

Release y sprint son atributos de planificación, no padres. Las capacidades visibles son Story; el trabajo técnico, de infraestructura o de decisión es Task. El proyecto `TS` está vacío: todo se crea desde el catálogo de `jira-backlog.md`, con el formato de `backlog-format.md`.

## Siguiente paso

1. Desglosar S1 en `docs/backlog/sprints/sprint-01.md` y preparar el CSV del lote inicial (`docs/backlog/imports/`).
2. Cerrar lo pendiente de S1 (HU-04, staging) registrando la evidencia del trabajo ya integrado.
3. Impulsar el cierre del bloque 7 del ADR durante S1-S2.
