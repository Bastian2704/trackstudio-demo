# Roadmap de desarrollo (Fase 2)

**Estado:** baseline oficial replanificada a 12 semanas y aprobada el 2026-10-02. Sustituye la baseline de 14 semanas del 2026-09-21 sin reducir alcance.

## Propósito y autoridad

Este documento ordena el desarrollo de Track Studio en seis sprints de dos semanas, agrupados en tres releases, y gobierna su secuencia en Jira (proyecto `TS`). No reemplaza al ADR (`docs/adr/decisiones-tecnicas-track-studio.md`), al `CLAUDE.md` ni a la metodología (`docs/global/metodologia-sdd-tdd.md`). Ante una contradicción, prevalecen esos documentos.

El alcance proviene de `Documentacion.md`: RF-01 a RF-07, RNF-01 a RNF-07 y las 28 historias del Anexo C. Las historias y sus criterios de aceptación viven en Jira; este roadmap solo las asigna a una ventana objetivo. La reducción de 14 a 12 semanas elimina S7 y S8 como contenedores de calendario, pero **no elimina HU-24..HU-28 ni ninguna Task**: calidad, producción, tesis y aceptación se ejecutan progresivamente dentro de S2-S6.

## Supuestos de planificación

- Inicio: lunes 2026-09-21 (America/Guayaquil). Fecha límite: viernes 2026-12-11.
- Seis sprints de dos semanas. Si un sprint cumple su objetivo antes, se continúa con el siguiente sin esperar al calendario (ver [flujo continuo](#flujo-continuo-y-control-de-capacidad)).
- Tres releases, heredados del plan de releases de la tesis, con R2 y R3 como gates distintos dentro de S6.
- Estimación Fibonacci (1, 2, 3, 5), sin traducción directa a horas. Backlog invariable: 28 HU y 92 SP.
- Capacidad: dos desarrolladores × 80 horas por sprint = 160 horas nominales. Specs, tests, revisión, integración, correcciones, documentación e infraestructura humana consumen esa misma capacidad. No se contabilizan horas de agentes ni se asume un multiplicador.
- Capacidad objetivo restante desde S2: 76 SP en cinco sprints, promedio de 15,2 SP por sprint. La referencia nominal es S1, planificado con 16 SP.
- Ciclo SDD/TDD híbrido: el agente escribe spec y tests en rojo y audita; el humano escribe el código de aplicación y hace todo lo de git.
- Cada sprint cierra con un incremento demostrable en staging (merge a `develop`). Solo R3 se despliega a producción.

## Hitos de avance

| Hito                   | Semana | Fecha límite | Condición                                                                                                                                                       |
| ---------------------- | -----: | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cierre R1              |      8 | 2026-11-13   | HU-01..HU-16 terminadas: 55/92 SP (≈ 60 %), más evidencia transversal acumulada.                                                                                |
| Preparación de entrega |     10 | 2026-11-27   | HU-01..HU-19 terminadas: 68/92 SP; infraestructura productiva preparada y 8 SP de HU-24..HU-26 trabajados incrementalmente, todavía sujetos a aceptación final. |
| Cierre R2              |     12 | 2026-12-07   | Beta con artista y sesiones validada en staging; HU-20..HU-23 completadas. Es un gate interno de S6.                                                            |
| Cierre R3              |     12 | 2026-12-11   | 92/92 SP, producción, documentación y aceptación con el productor.                                                                                              |

El avance parcial de HU-24..HU-26 no se reporta como SP Done hasta que sus criterios completos estén aceptados. Se reporta aparte como capacidad consumida y evidencia acumulada para no distorsionar Jira.

## Releases

| Release                    | Sprints/gate            | Semanas | Resultado esperado                                                                                                   | Ambiente   |
| -------------------------- | ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| R1 - Núcleo interno (MVP)  | S1-S4                   | 1-8     | El productor gestiona artistas, producciones, canciones y versiones de audio servidas con URLs firmadas.             | Staging    |
| R2 - Beta con artista      | S5 + gate interno de S6 | 9-12    | Comentarios con marca de tiempo, acceso restringido del artista y calendario de sesiones validados de punta a punta. | Staging    |
| R3 - Entrega en producción | gate final de S6        | 12      | QA integral, despliegue a producción, documentación final y aceptación entregada a Milenium Sound.                   | Producción |

Un release es liberable solo cuando todas sus historias cumplen la Definition of Done: código integrado por pipeline sin fallos, pruebas pasando, criterios de aceptación cumplidos, RNF aplicables verificados y revisión en el Sprint Review. R2 y R3 comparten sprint, pero no criterio de salida: fallar el gate R2 impide iniciar el despliegue de R3.

## Distribución de alcance y capacidad

| Sprint    | Ventana        | HU principales              | SP de HU principales |           Reserva HU-24..HU-26 | Capacidad objetivo |
| --------- | -------------- | --------------------------- | -------------------: | -----------------------------: | -----------------: |
| S1        | 21 sep-2 oct   | HU-01..HU-04                |                   16 |                              0 |                 16 |
| S2        | 5-16 oct       | HU-05..HU-09                |                   13 |                              2 |                 15 |
| S3        | 19-30 oct      | HU-10..HU-13                |                   13 |                              2 |                 15 |
| S4        | 2-13 nov       | HU-14..HU-16                |                   13 |                              2 |                 15 |
| S5        | 16-27 nov      | HU-17..HU-19                |                   13 |                              2 |                 15 |
| S6        | 30 nov-11 dic  | HU-20..HU-23 y HU-27..HU-28 |                   16 | cierre con evidencia acumulada |                 16 |
| **Total** | **12 semanas** | **HU-01..HU-28**            |               **84** |                          **8** |             **92** |

Los 8 SP de HU-24..HU-26 se cuentan una sola vez. Se ejecutan con subtareas o evidencia verificable en S2-S5 y las historias padre cierran en S6, cuando toda la superficie crítica esté cubierta. HU-27 y HU-28 reservan sus 5 SP completos en S6. Las Tasks sin SP también consumen la capacidad de su sprint.

## Secuencia objetivo por sprint

| Sprint | Historias y trabajo transversal                                 | Demostrable al cierre                                                                                                      | Riesgo o dependencia principal                                                                                        |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| S1     | HU-01..HU-04 (16 SP)                                            | Monorepo, CI front/back, login Auth0 y endpoint protegido con RBAC.                                                        | TS-15 quedó en `Listo` el 2026-10-02; el contrato RBAC está disponible para S2.                                       |
| S2     | HU-05..HU-09 (13 SP) + 2 SP de HU-24..HU-26                     | Alta, edición, listado y estado de artistas; producciones con reglas de formato; pruebas/evidencia de la superficie nueva. | Modelo de `productions` aprobado en TS-49; contrato de duración de EP definido antes de TS-20.                        |
| S3     | HU-10..HU-13 (13 SP) + 2 SP de HU-24..HU-26                     | Canciones por producción, borrado confirmado y subida WAV/MP3 ≤ 500 MB con progreso.                                       | ERD de canciones/versiones aprobado; bucket S3 e IAM de TS-42 configurados por el humano.                             |
| S4     | HU-14..HU-16 (13 SP) + 2 SP de HU-24..HU-26                     | Versionado secuencial, reproductor y URLs prefirmadas. **Cierre R1.**                                                      | Expiración/refresco de URLs e integridad por hash (RNF-02, RNF-05).                                                   |
| S5     | HU-17..HU-19 (13 SP) + 2 SP de HU-24..HU-26                     | Comentarios sobre la línea de tiempo, navegación y borrado propio; ensayo de aceptación.                                   | Sincronización reproductor-comentarios; producción debe quedar preparada al cierre.                                   |
| S6     | HU-20..HU-23 (11 SP), HU-27..HU-28 (5 SP) y cierre HU-24..HU-26 | Acceso del artista, sesiones, regresión/RNF, R2 en staging, producción y aceptación final. **Cierre R2 y R3.**             | S6 no tiene holgura: dominio, Resend, infraestructura productiva y documentación deben llegar preparados desde S2-S5. |

HU-28 conserva 2 SP supuestos para cuadrar los 92 SP de la tesis, pendiente de confirmación en su refinación.

### Cobertura de requerimientos

| Requerimiento                   | Historias                         | Ejecución/cierre           |
| ------------------------------- | --------------------------------- | -------------------------- |
| RF-01 Artistas                  | HU-05, HU-06, HU-07               | S2                         |
| RF-02 Producciones              | HU-08, HU-09                      | S2                         |
| RF-03 Canciones                 | HU-10, HU-11, HU-12               | S3                         |
| RF-04 Versiones y audio         | HU-13, HU-14, HU-15, HU-16        | S3-S4                      |
| RF-05 Comentarios               | HU-17, HU-18, HU-19               | S5                         |
| RF-06 Acceso del artista        | HU-20, HU-21                      | S6                         |
| RF-07 Sesiones                  | HU-22, HU-23                      | S6                         |
| RNF-01 Control de acceso        | HU-04, HU-21                      | S1, S6                     |
| RNF-02 Confidencialidad         | HU-03, HU-16                      | S1, S4                     |
| RNF-03 Tiempo de respuesta      | HU-13, HU-26                      | evidencia S3-S6; cierre S6 |
| RNF-04 Disponibilidad           | HU-27                             | S6                         |
| RNF-05 Integridad               | HU-14, HU-16                      | S4                         |
| RNF-06 Facilidad de aprendizaje | HU-28                             | S6                         |
| RNF-07 Accesibilidad            | HU-26                             | evidencia S2-S6; cierre S6 |
| Infraestructura y calidad       | HU-01, HU-02, HU-24, HU-25, HU-27 | S1-S6                      |

Los RNF aplican además a cada historia funcional afectada; la tabla indica dónde se verifican formalmente.

## Ejecución transversal de HU-24..HU-26

- En S2-S5 se reservan 2 SP equivalentes por sprint para inventario, pruebas unitarias, integración, regresión, accesibilidad, rendimiento y registro de defectos sobre el incremento recién entregado.
- El trabajo se registra en subtareas o checklists enlazados a TS-35 (HU-24), TS-36 (HU-25) y TS-37 (HU-26), sin duplicar los tests que ya exige cada Story funcional.
- Cada cierre de sprint verifica que la superficie nueva quedó incorporada al inventario integral.
- TS-35..TS-37 permanecen con cierre objetivo S6. La evidencia parcial no convierte una Story en Done.
- Si el trabajo transversal no consume su reserva, la capacidad no se reasigna automáticamente a alcance nuevo; primero se cubren deuda de pruebas, RNF y defectos conocidos.

## Flujo continuo y control de capacidad

- La ventana de cada sprint es un máximo. Si todas sus historias cumplen la Definition of Done antes, se inicia el siguiente sprint con historias Ready.
- Ready significa: criterios de aceptación en Jira, dependencias del ADR en estado DECIDIDO, slice del ERD aprobado y trabajo fuera de los vetos vigentes de `CLAUDE.md` §5.
- TS-15 quedó en `Listo` el 2026-10-02. Su contrato RBAC pasa a ser una precondición satisfecha de S2, no un bloqueo abierto.
- Nunca se adelanta una historia bloqueada por un bloque ABIERTO del ADR o por infraestructura imprescindible.
- En cada corte de mitad y fin de sprint se compara la velocidad real con la meta de 15 SP. Dos cortes consecutivos por debajo obligan a decidir entre aumentar capacidad, reducir esperas externas o renegociar la fecha; el alcance no es una palanca autorizada.
- Todo arrastre se registra con capacidad reasignada y efecto sobre los gates. No se absorbe de forma invisible.

## Reglas de alcance

El backlog conserva completos RF-01 a RF-07, RNF-01 a RNF-07, HU-01 a HU-28 y las Tasks transversales. La asignación a un sprint es una previsión y no elimina alcance.

- Autenticación, RBAC, URLs firmadas, validación de audio, integridad, pruebas, producción y aceptación no se recortan para cumplir la fecha.
- Fuera del alcance: app móvil nativa, pagos y facturación, contratos y derechos, chat o notificaciones en tiempo real, edición o procesamiento de audio, integración con DAWs o distribuidoras, multiestudio, perfiles públicos, analítica, login social, i18n y formatos distintos de WAV/MP3.
- Los elementos de prototipos sin respaldo en RF (métricas del dashboard, estado/prioridad/respuestas de comentarios, notas técnicas y estadísticas del artista, porcentaje de avance y portada) no entran al roadmap hasta una decisión formal.

## Track paralelo: ADR, infraestructura y tesis

| Periodo | Entregable                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S2      | TS-49: ERD completo por hitos; TS-41: dominio/DNS; TS-46: evidencia de desarrollo; correcciones SDK Auth0 y ClickUp → Jira en la tesis. |
| S3      | TS-42: bucket/IAM; evidencia de integración de canciones y audio; continuar diseño/desarrollo de tesis.                                 |
| S4      | TS-45: diseño de la solución (C4 niveles 2-4, ERD, persistencia); preparar configuración productiva.                                    |
| S5      | TS-43: Resend; TS-44: preparación de producción; TS-47: pruebas/evaluación y ensayo de aceptación.                                      |
| S6      | Cierre TS-44, TS-47 y TS-48; despliegue, resultados, conclusiones, resumen/abstract y paquete de aceptación.                            |

## Gates y dependencias externas

- **S2:** TS-49 debe aprobar el slice de `productions` antes de la implementación de TS-19; el contrato de duración del EP debe resolverse en la spec de HU-09.
- **S3:** ADR D7.1-D7.7 está cerrado; los gates vivos son ERD e infraestructura manual TS-42.
- **Fin de S5:** dominio, correo e infraestructura productiva preparados; inventario de pruebas/RNF y guion de aceptación casi completos.
- **S6/R2:** HU-20..HU-23 y regresión crítica en staging antes de producción.
- **S6/R3:** merge a `main`, infraestructura y aceptación requieren acciones/aprobación humanas.
- Railway, Vercel, Auth0, S3, DNS y Resend los configura el equipo humano. El agente documenta la dependencia y se detiene.

## Discrepancias a reconciliar

| Discrepancia                                                   | Dónde            | Acción                                                                  |
| -------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| Restricción "Auth0 SDK v4.x"; lo instalado es `auth0/login` v7 | Tesis vs backend | ADR D2.1 ya corregido; actualizar tesis en TS-53/TS-46.                 |
| La tabla de costos cita ClickUp; el tablero es Jira            | Tesis            | Actualizar en TS-53/TS-46.                                              |
| HU-28 sin SP ni RF/RNF                                         | Anexo C          | Confirmar 2 SP y enlace RNF-06 en su refinación.                        |
| Importación inicial conserva etiquetas `target-s7`/`target-s8` | Jira histórico   | Cerrada el 2026-10-02: TS-35..TS-39 apuntan a S6; no reimportar el CSV. |

## Gobierno en Jira

La jerarquía oficial sigue siendo:

```text
Epic -> Story o Task con checklist detallada
Sub-task solo cuando necesita seguimiento propio
```

Release y sprint son atributos de planificación, no padres. Jira es la fuente de verdad operativa; el mapa vigente está en [`jira-key-map.md`](jira-key-map.md). Los CSV de `imports/` son evidencia histórica y no se regeneran ni reimportan para aplicar esta replanificación.

## Siguiente paso

1. Integrar esta baseline documental mediante TS-60 y su PR contra `develop`.
2. Iniciar `TS Sprint 2` (Jira id 37) el 2026-10-05 con [`sprints/sprint-02.md`](sprints/sprint-02.md) como baseline de ejecución.
3. Comenzar por TS-49 (slice `productions`) y la spec backend de TS-16; el gate RBAC de TS-15 ya está satisfecho.
4. Revisar capacidad y evidencia transversal de TS-35..TS-37 a mitad del sprint, sin duplicar sus 8 SP.
