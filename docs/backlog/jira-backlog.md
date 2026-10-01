# Backlog oficial de Jira

**Estado:** baseline oficial de alcance y trazabilidad desde 2026-09-22. Que un ticket sea oficial no lo convierte en Ready ni compromete su fecha de entrega.

## Autoridad y uso

Este backlog descompone [el roadmap](roadmap.md) y gobierna el proyecto `TS` en Jira. Sigue el [formato común del backlog](backlog-format.md). Prevalecen el ADR (`docs/adr/decisiones-tecnicas-track-studio.md`), el `CLAUDE.md` y la [metodología SDD/TDD](../global/metodologia-sdd-tdd.md). El alcance proviene de `Documentacion.md`: RF-01..07, RNF-01..07 y las 28 historias del Anexo C.

El proyecto `TS` está poblado en `medihealthec.atlassian.net` y Jira es la fuente de verdad. Este catálogo conserva el diseño del backlog; las claves vigentes y las unidades posteriores a la importación están en [`jira-key-map.md`](jira-key-map.md). Las checklists se mantienen en Jira y los documentos de sprint solo registran planificación y handoff.

Identificadores: `ts-01`..`ts-28` corresponden a HU-01..HU-28, las Task continúan desde `ts-29` y las épicas son `ts-epic-<slug>`. La clave real `TS-<n>` se registra en `imports/` después de importar.

## Catálogo de épicas

| ID local              | Jira | Épica                           | Resultado y límites                                                                                                   | Contenido                          | Ventana |
| --------------------- | ---- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------- |
| ts-epic-infra         | —    | Infraestructura y entornos      | Monorepo, CI/CD, modelo de datos (ERD), entornos de staging y producción, dominio y proveedores externos (S3, Resend) configurados por el equipo. | HU-01, HU-02, HU-27, ts-29..ts-33, ts-38 | S1-S8   |
| ts-epic-identity      | —    | Identidad y control de acceso   | Autenticación con Auth0 y RBAC productor/artista aplicado en todas las rutas.                                          | HU-03, HU-04                       | S1      |
| ts-epic-artists       | —    | Artistas                        | Registro centralizado de artistas con unicidad y estados activo/suspendido/bloqueado.                                  | HU-05..HU-07                       | S2      |
| ts-epic-productions   | —    | Producciones                    | Producciones por artista y formato (álbum, EP, sencillo) con sus reglas de formato.                                    | HU-08, HU-09                       | S2      |
| ts-epic-songs         | —    | Canciones                       | Canciones por producción con posición, estado y borrado confirmado en cascada.                                         | HU-10..HU-12                       | S3      |
| ts-epic-audio         | —    | Versiones de audio              | Subida WAV/MP3 ≤ 500 MB, versionado secuencial, reproducción embebida y URLs prefirmadas.                              | HU-13..HU-16                       | S3-S4   |
| ts-epic-comments      | —    | Comentarios con marca de tiempo | Retroalimentación vinculada al segundo exacto del audio, no editable, con borrado solo del autor.                     | HU-17..HU-19                       | S5      |
| ts-epic-artist-access | —    | Acceso del artista              | Invitación y revocación por producción; el artista solo ve lo que se le asignó.                                        | HU-20, HU-21                       | S6      |
| ts-epic-sessions      | —    | Sesiones de estudio             | Calendario del productor sin solapes y solicitudes de sesión del artista.                                              | HU-22, HU-23                       | S6      |
| ts-epic-quality       | —    | Calidad y aceptación            | Pruebas unitarias e integración, verificación de RNF y aceptación con el productor.                                    | HU-24..HU-26, HU-28                | S7-S8   |
| ts-epic-thesis        | —    | Documento de tesis              | Secciones de diseño, desarrollo, pruebas y resultados del documento de titulación, con evidencia del proyecto.        | ts-34..ts-37                       | S2-S8   |

Todo el trabajo de infraestructura cuelga de `ts-epic-infra`: repositorio y CI (HU-01, HU-02), entrega a producción (HU-27), las cinco Task de infraestructura humana y el ERD (ts-38), que es transversal a todos los módulos. El bucket S3 (ts-31) va bajo esta épica aunque bloquee a HU-13. Calidad y aceptación consolida la evidencia integral, pero cada historia conserva sus propios tests y su review.

## Cobertura del alcance aprobado

| Requerimiento                   | Épica principal                  | Cobertura complementaria                          |
| ------------------------------- | -------------------------------- | ------------------------------------------------- |
| RF-01 Administrar artistas      | ts-epic-artists                  | ts-epic-artist-access (gestión de acceso)         |
| RF-02 Producciones              | ts-epic-productions              | —                                                 |
| RF-03 Canciones                 | ts-epic-songs                    | ts-epic-audio (cascada de versiones)              |
| RF-04 Versiones de audio        | ts-epic-audio                    | ts-epic-infra (bucket S3)                         |
| RF-05 Comentarios               | ts-epic-comments                 | ts-epic-audio (reproductor)                       |
| RF-06 Acceso del artista        | ts-epic-artist-access            | ts-epic-identity, ts-epic-infra (Resend)          |
| RF-07 Sesiones de estudio       | ts-epic-sessions                 | —                                                 |
| RNF-01 Control de acceso        | ts-epic-identity                 | ts-epic-artist-access; aplica a toda épica funcional |
| RNF-02 Confidencialidad         | ts-epic-identity, ts-epic-audio  | ts-epic-infra                                     |
| RNF-03 Tiempo de respuesta      | ts-epic-quality                  | ts-epic-audio (progreso de subida)                |
| RNF-04 Disponibilidad           | ts-epic-infra                    | ts-epic-quality                                   |
| RNF-05 Integridad               | ts-epic-audio                    | ts-epic-quality                                   |
| RNF-06 Facilidad de aprendizaje | ts-epic-quality                  | —                                                 |
| RNF-07 Accesibilidad            | ts-epic-quality                  | Aplica a toda épica con interfaz                  |

No hace falta otra épica para cubrir el alcance vigente. Los elementos de los prototipos sin respaldo en RF siguen pendientes de decisión (ver roadmap) y no tienen ticket.

## Catálogo de Story

Todas empiezan como P0 respecto del objetivo de su sprint. P1 se asigna al refinar cada sprint. HU-28 tiene 2 SP supuestos hasta confirmarlos en planning poker. Total: 92 SP.

| ID    | HU    | Summary                                                  | Épica                 | Sprint | Release | SP  | Capa     | Riesgo    | Bloqueado por        |
| ----- | ----- | -------------------------------------------------------- | --------------------- | ------ | ------- | --- | -------- | --------- | -------------------- |
| ts-01 | HU-01 | HU-01 Configurar entorno y repositorios                  | ts-epic-infra         | S1     | R1      | 3   | ambas    | normal    | —                    |
| ts-02 | HU-02 | HU-02 Pipeline CI/CD con despliegue a staging            | ts-epic-infra         | S1     | R1      | 5   | infra    | infra     | ts-01, ts-29         |
| ts-03 | HU-03 | HU-03 Autenticación con Auth0                            | ts-epic-identity      | S1     | R1      | 5   | ambas    | seguridad | ts-01                |
| ts-04 | HU-04 | HU-04 Control de acceso basado en roles                  | ts-epic-identity      | S1     | R1      | 3   | ambas    | seguridad | ts-03                |
| ts-05 | HU-05 | HU-05 Registrar y editar artistas                        | ts-epic-artists       | S2     | R1      | 3   | ambas    | datos     | ts-04                |
| ts-06 | HU-06 | HU-06 Listar artistas con estado y producciones          | ts-epic-artists       | S2     | R1      | 2   | ambas    | datos     | ts-05                |
| ts-07 | HU-07 | HU-07 Cambiar el estado de un artista                    | ts-epic-artists       | S2     | R1      | 2   | ambas    | datos     | ts-05                |
| ts-08 | HU-08 | HU-08 Registrar, editar y eliminar producciones          | ts-epic-productions   | S2     | R1      | 3   | ambas    | datos     | ts-05, ts-38         |
| ts-09 | HU-09 | HU-09 Validar restricciones de formato                   | ts-epic-productions   | S2     | R1      | 3   | ambas    | datos     | ts-08                |
| ts-10 | HU-10 | HU-10 Registrar, editar y eliminar canciones             | ts-epic-songs         | S3     | R1      | 3   | ambas    | datos     | ts-08, ts-38         |
| ts-11 | HU-11 | HU-11 Listar canciones con estado y posición             | ts-epic-songs         | S3     | R1      | 2   | ambas    | datos     | ts-10                |
| ts-12 | HU-12 | HU-12 Eliminar canción con confirmación y cascada        | ts-epic-songs         | S3     | R1      | 3   | ambas    | datos     | ts-10, ts-13         |
| ts-13 | HU-13 | HU-13 Subir archivos de audio a una versión              | ts-epic-audio         | S3     | R1      | 5   | ambas    | archivos  | ts-10, ts-31, ts-38  |
| ts-14 | HU-14 | HU-14 Versionado secuencial automático                   | ts-epic-audio         | S4     | R1      | 3   | ambas    | archivos  | ts-13                |
| ts-15 | HU-15 | HU-15 Reproducir versiones desde la interfaz             | ts-epic-audio         | S4     | R1      | 5   | ambas    | archivos  | ts-14, ts-16         |
| ts-16 | HU-16 | HU-16 Servir audio mediante URLs firmadas                | ts-epic-audio         | S4     | R1      | 5   | backend  | archivos  | ts-13                |
| ts-17 | HU-17 | HU-17 Comentar sobre una marca de tiempo                 | ts-epic-comments      | S5     | R2      | 5   | ambas    | datos     | ts-15, ts-38         |
| ts-18 | HU-18 | HU-18 Ver comentarios en la línea de tiempo              | ts-epic-comments      | S5     | R2      | 5   | ambas    | datos     | ts-17                |
| ts-19 | HU-19 | HU-19 Navegar al comentario y eliminar los propios       | ts-epic-comments      | S5     | R2      | 3   | ambas    | datos     | ts-18                |
| ts-20 | HU-20 | HU-20 Otorgar y revocar acceso del artista               | ts-epic-artist-access | S6     | R2      | 3   | ambas    | seguridad | ts-05, ts-08, ts-32  |
| ts-21 | HU-21 | HU-21 Vista restringida a producciones asignadas         | ts-epic-artist-access | S6     | R2      | 2   | ambas    | seguridad | ts-20, ts-04         |
| ts-22 | HU-22 | HU-22 Registrar, editar y cancelar sesiones              | ts-epic-sessions      | S6     | R2      | 3   | ambas    | datos     | ts-08, ts-38         |
| ts-23 | HU-23 | HU-23 Consultar calendario y solicitar sesiones          | ts-epic-sessions      | S6     | R2      | 3   | ambas    | datos     | ts-22, ts-21         |
| ts-24 | HU-24 | HU-24 Pruebas unitarias de componentes críticos          | ts-epic-quality       | S7     | R3      | 3   | ambas    | normal    | ts-02                |
| ts-25 | HU-25 | HU-25 Pruebas de integración de endpoints                | ts-epic-quality       | S7     | R3      | 3   | backend  | normal    | ts-02                |
| ts-26 | HU-26 | HU-26 Corregir defectos y verificar RNF                  | ts-epic-quality       | S7     | R3      | 2   | ambas    | normal    | ts-23                |
| ts-27 | HU-27 | HU-27 Desplegar a producción                             | ts-epic-infra         | S8     | R3      | 3   | infra    | infra     | ts-26, ts-33         |
| ts-28 | HU-28 | HU-28 Documentación final y pruebas de aceptación        | ts-epic-quality       | S8     | R3      | 2   | docs     | normal    | ts-27                |

La historia y los criterios de aceptación de cada Story se copian del Anexo C a la Description del ticket al construir el CSV. A partir de ahí, Jira es su fuente de verdad. Antes de importar, se corrige el criterio de HU-02 ("merge a main despliega a staging" → merge a `develop`), como indica el roadmap.

## Catálogo de Task

| ID    | Summary                                                            | Épica          | Sprint  | Release     | Capa  | Riesgo   | Bloqueado por | Dependencia externa                           |
| ----- | ------------------------------------------------------------------ | -------------- | ------- | ----------- | ----- | -------- | ------------- | --------------------------------------------- |
| ts-29 | Configurar staging (Railway desde `develop` + Vercel preview)       | ts-epic-infra  | S1      | R1          | infra | infra    | —             | Acceso a Railway y Vercel                     |
| ts-30 | Configurar dominio `trackstudio.site` y DNS                        | ts-epic-infra  | S2      | R1          | infra | infra    | —             | Registrador del dominio                       |
| ts-31 | Provisionar bucket S3 e IAM en us-east-1                           | ts-epic-infra  | S3      | R1          | infra | archivos | —             | D7.1-D7.7 decididas; cuenta AWS preparada en TS-50 |
| ts-32 | Configurar Resend con dominio verificado                           | ts-epic-infra  | S5      | R2          | infra | infra    | ts-30         | Cuenta Resend                                 |
| ts-33 | Configurar producción (Railway, Vercel, Auth0) y monitoreo de uptime | ts-epic-infra | S7      | R3          | infra | infra    | ts-30         | Accesos de producción; aprobación manual      |
| ts-34 | Tesis: Diseño de la solución (C4 niveles 2-4, ERD, persistencia)   | ts-epic-thesis | S4      | transversal | docs  | normal   | —             | —                                             |
| ts-35 | Tesis: Desarrollo de la solución (evidencia SCRUM por sprint)      | ts-epic-thesis | S2-S8   | transversal | docs  | normal   | —             | —                                             |
| ts-36 | Tesis: Pruebas y evaluación de la solución                         | ts-epic-thesis | S7      | transversal | docs  | normal   | ts-24, ts-25  | —                                             |
| ts-37 | Tesis: Resultados, ética, conclusiones, trabajo futuro y resumen   | ts-epic-thesis | S8      | transversal | docs  | normal   | ts-28         | —                                             |
| ts-38 | Diseñar y cerrar el ERD del modelo de datos                        | ts-epic-infra  | S1-S2   | R1          | docs  | datos    | —             | Hito mínimo S1 en TS-54; aprobación humana |

Las Task de infraestructura las ejecuta el equipo humano (`CLAUDE.md` regla 6). El agente las señala como dependencia y se detiene. ts-38 es documentación de diseño, no infraestructura: el agente puede redactar el ERD y el humano lo aprueba. Bloquea a las historias que necesitan tablas aún no diseñadas; `users` y `artists` se aprueban en `TS-54` para no frenar `TS-15`. Las Task no llevan SP; su esfuerzo consume la misma capacidad del sprint. ts-35 se actualiza en cada sprint y se cierra en S8.

## Sprint 1

| ID    | Summary                                       | Estado conocido (según git)                                                              |
| ----- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ts-01 | HU-01 Configurar entorno y repositorios       | Scaffolding Laravel 13 + Sail y React + Vite, ESLint/Prettier/Husky integrados (PR #1-#5). |
| ts-02 | HU-02 Pipeline CI/CD con despliegue a staging | CI de frontend y backend integradas (PR #7, #8); falta confirmar el despliegue a staging. |
| ts-03 | HU-03 Autenticación con Auth0                 | Login/logout con Auth0 integrado (PR #6).                                                |
| ts-04 | HU-04 Control de acceso basado en roles       | Specs de capa en `docs/specs/{backend,frontend}/HU-04.md`; implementación en curso.     |
| ts-29 | Configurar staging                            | Cerrada como `TS-40`; Railway, Vercel, Auth0 y smoke test verificados.                    |
| ts-38 | Diseñar y cerrar el ERD del modelo de datos   | Padre `TS-49`; hito mínimo de S1 separado en `TS-54`.                                    |

Estos tickets se importan en To Do. Pasan a Done a mano solo cuando se registra la evidencia (PR o ejecución de CI) y se cumplen sus criterios de aceptación. El desglose con checklist va en `sprints/sprint-01.md`.

## Gates vigentes

- **ADR bloque 7 CERRADO** desde 2026-08-18. D7.1-D7.7 ya no bloquean el backlog; los gates vivos son el ERD (`TS-49`/`TS-54`), el alcance de sprint y la infraestructura S3 (`TS-42`).
- **Discrepancias documentales:** el criterio de HU-02 ya se corrigió; la versión del SDK de Auth0 y ClickUp → Jira se arrastran a la tesis en `TS-53`. La estimación/RNF de HU-28 se confirma en su refinación.

## Capacidad y refinamiento progresivo

La capacidad, la estimación en SP y el flujo continuo entre sprints están definidos en el [roadmap](roadmap.md#supuestos-de-planificación) y no se repiten aquí.

S1 se desglosa primero. S2-S8 conservan su alcance y ventana objetivo con los tickets ya creados, y su checklist se escribe antes de iniciar cada sprint, a partir de la capacidad observada. La ausencia de una checklist o de un sprint activo no elimina un requisito.

## Registro histórico de preparación de la importación

- El proyecto `TS` de Jira Cloud estaba vacío al 2026-09-22; la importación ya se completó y el mapa vigente está en [jira-key-map.md](jira-key-map.md).
- Lote inicial único: **49 filas** (11 épicas + 28 Story + 10 Task). Las casillas de checklist no generan filas.
- Etiquetas por ticket: `local-<id>`, `release-rN`, `target-sN`, `capa-*`, `riesgo-*`, `backlog-oficial`.
- Enlaces Blocks: se generan desde la columna "Bloqueado por". Si el importador no los resuelve, se hace una segunda pasada con las claves reales.
- La tabla `local_id → import_id → TS-<n>` y el resultado de la importación se registran en `imports/`. El procedimiento completo está en [backlog-format.md](backlog-format.md#preparación-del-csv).

La preparación produjo `sprints/sprint-01.md` y el CSV del lote inicial. Este bloque se conserva como historial; no se debe volver a importar el lote.
