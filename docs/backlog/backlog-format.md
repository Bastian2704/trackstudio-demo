# Formato común del backlog

**Estado:** convención oficial de granularidad y trazabilidad desde 2026-09-21. La oficialidad del backlog no autoriza implementación ni sustituye a Ready (`docs/global/metodologia-sdd-tdd.md` §9).

## Archivos y autoridad

- [Roadmap](roadmap.md): 8 sprints, 3 releases y 92 SP; horizonte, no capacidad comprometida.
- [Backlog de Jira](jira-backlog.md): catálogo de épicas, Story y Task, y cobertura HU ↔ RF/RNF.
- `sprints/sprint-NN.md` (pendientes): desglose por sprint con tickets, checklists y dependencias.
- [imports/](imports/README.md): CSV de cada lote y tabla `local_id → clave TS-<n>`.
- [Metodología SDD/TDD](../global/metodologia-sdd-tdd.md): ciclo, roles, compuertas C1-C5, Ready y Done.
- [Reglas de git](../global/reglas-git.md): ramas, commits y entrega de comandos.
- ADR (`docs/adr/decisiones-tecnicas-track-studio.md`): decisiones técnicas por número (`Dx.y`) y bloques ABIERTOS.
- Specs de capa (`docs/specs/{backend,frontend}/HU-NN.md`): contrato técnico y tests de cada historia.

Este formato no reemplaza a las specs ni al ADR. **Regla anti-drift:** los criterios de aceptación de una historia se escriben una sola vez, en Jira. Las specs y los documentos de sprint los referencian, no los copian.

## Jerarquía

```text
Epic
  Story (una HU del Anexo C) o Task (técnica, infraestructura, decisión o documentación)
    Checklist detallada dentro de la Description
    Sub-task solo si necesita seguimiento propio
Bug enlazado a la entrega afectada
```

Release y sprint son atributos de planificación, no padres. Una épica puede abarcar varios sprints. Una Task es hermana de las Story bajo la épica; nunca se anida una Task bajo una Story.

Cada HU cross-capa es **una sola Story**. El trabajo de backend y frontend se refleja en su checklist, no en tickets separados.

## Identificadores

| Elemento            | local_id          | Ejemplo                  |
| ------------------- | ----------------- | ------------------------ |
| Epic                | `ts-<slug>`  | `ts-epic-artists`        |
| Story (HU)          | `ts-<NN>`       | `ts-05` ↔ HU-05        |
| Task                | `ts-<NN>`        | `ts-29`                 |
| Bug                 | `ts-<NN>`      | `ts-38`               |

Contador único: `ts-01`..`ts-28` son HU-01..HU-28; las Task y los Bug toman el siguiente número libre desde `ts-29`. El catálogo vigente está en [jira-backlog.md](jira-backlog.md).

- Los IDs son estables y nunca se reutilizan. Mover una historia a otro sprint no cambia su ID.
- Las casillas no tienen clave Jira, tipo, estado ni fila CSV. Un Sub-task excepcional se declara expresamente como ticket

## Description mínima en Jira

Una Epic contiene un único párrafo:

```text
Resultado y límites: <resultado acotado>. La épica agrupa alcance aprobado; cada entrega requiere spec de capa y tests en rojo antes de implementar.
```

Una Story o Task contiene:

```text
Historia: Como <rol>, quiero <funcionalidad>, para <beneficio>.   # Solo Story.

Alcance: <incluido y exclusiones relevantes>.

Criterios de aceptación:
- <criterio verificable del resultado completo>

Referencias: <RF/RNF, ADR Dx.y, docs/specs/…/HU-NN.md, roadmap>.

Dependencia externa: <infraestructura humana, bloque ABIERTO del ADR o persona>.   # Solo si aplica.

Checklist de ejecución:
<casillas con ID, trabajo, Hecho cuando y orden interno>
```

- No se dejan secciones vacías; si algo no aplica, se omite.
- Tipo, padre, prioridad, story points, sprint, release, assignee, etiquetas y enlaces van en sus campos nativos. No se duplican en la Description.
- La sección de criterios de aceptación es la fuente de verdad de los AC (`metodologia-sdd-tdd.md` §0). Si el código debe diferir, primero se actualiza el ticket.
- Nunca se incluyen secretos, tokens ni datos reales de Milenium Sound o sus artistas (el repo y el tablero pueden exponerse; `D2.2`).

## Checklist estándar por capa

Cada Story parte de esta plantilla y la ajusta a su historia: se eliminan las casillas de la capa que no aplique y se añaden casillas específicas (reglas de negocio, RNF concretos). Las casillas siguen el reparto de roles de la metodología (§2): el agente escribe la spec y los tests en rojo y audita; el humano escribe el código de aplicación y hace git.

| Casilla | Trabajo                                     | Hecho cuando                                                                                           |
| ------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.01`   | Spec backend                                | `docs/specs/backend/HU-NN.md` aprobada por el humano, anclada al ADR, sin copiar AC.                    |
| `.02`   | Tests backend en rojo (agente)              | Tests Pest de feature/unit escritos y vistos fallar por la razón correcta (C2).                         |
| `.03`   | Código backend hasta verde (humano)         | Tests en verde; Larastan nivel 5 y Pint limpios.                                                       |
| `.04`   | Review backend                              | Hallazgos con `archivo:línea` resueltos o justificados; cada test no trivial probado en rojo (C3).     |
| `.05`   | Spec frontend                               | `docs/specs/frontend/HU-NN.md` aprobada; enlazada a la spec backend sin repetir contrato.               |
| `.06`   | Tests frontend en rojo (agente)             | Tests Vitest escritos y vistos fallar.                                                                 |
| `.07`   | Código frontend hasta verde (humano)        | Tests en verde; `tsc --noEmit`, ESLint y Prettier limpios.                                             |
| `.08`   | Review frontend                             | Igual que `.04` para la capa frontend.                                                                 |
| `.09`   | Integración y cierre                        | PR a `develop` con CI verde; AC verificados en staging; RNF aplicables comprobados; handoff actualizado. |

Formato de cada casilla en la Description:

```text
- [ ] `ts-05.03` Código backend hasta verde. Hecho cuando: tests de alta/edición de artista en verde; Larastan y Pint limpios. Orden interno: ts-05.02.
```

Las Task usan casillas propias de su naturaleza (decisión, infraestructura, documentación), con el mismo formato. Marcar una casilla no cierra el ticket ni satisface sus gates.

## Cuándo separar trabajo en otro ticket

| Necesidad                                                                                                   | Representación                                                         |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Spec, test, implementación o comprobación dentro del mismo resultado.                                       | Casilla de la checklist.                                               |
| Una capa de la historia que lleva otra persona con estado, plazo o bloqueo propios.                         | Sub-task bajo esa Story (p. ej. `ts-13-frontend`).                  |
| Decisión o infraestructura que bloquea varias historias (cerrar bloque 7 del ADR, ERD, bucket S3, Resend). | Task independiente bajo la épica, con enlaces Blocks.                  |
| Dos resultados aceptables por separado o una historia que no cabe en un sprint.                             | Dos Story bajo la misma épica, cada una con alcance y criterios propios. |
| Defecto descubierto en pruebas, review o staging que necesita seguimiento.                                  | Bug enlazado a la entrega afectada.                                    |

No hay un número fijo de tickets por historia. No se separa automáticamente backend y frontend, ni se crea un ticket por test o por paso.

Al dividir una historia, se reparten sus criterios y casillas sin omitir ni duplicar alcance; ambas partes enlazan la misma HU/RF y se actualizan dependencias, SP y sprint objetivo. Si ya existía un ticket, se conserva su trazabilidad y se registra dónde continúa cada parte. Al promover una casilla a ticket, la casilla queda como referencia al nuevo local_id y no se ejecuta dos veces.

## Campos del ticket

| Campo local        | Contenido y regla                                                                                         | Destino en Jira                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `local_id`         | Único, estable, sin reutilización.                                                                        | Etiqueta `local-<local_id>`.                                         |
| `issue_type`       | Epic, Story, Task, Bug o Sub-task justificado.                                                            | Work type.                                                           |
| `summary`          | Título específico con acción o resultado. En Story: `HU-NN <resultado>`.                                  | Summary.                                                             |
| `parent_id`        | Epic para Story/Task; Story/Task para Sub-task; vacío para Epic.                                          | Parent.                                                              |
| `description`      | Historia, alcance y exclusiones.                                                                          | Description.                                                         |
| `acceptance`       | Criterios de aceptación del resultado completo (fuente de verdad).                                        | Sección de la Description.                                           |
| `checklist`        | ID, trabajo, Hecho cuando y orden interno de cada casilla.                                                | Sección de la Description; ninguna fila CSV adicional.               |
| `release`          | R1, R2 o R3 según el roadmap; transversal si aplica a todos.                                              | Etiqueta `release-r1`… (o Fix version si está habilitada).           |
| `target_sprint`    | S1..S8; puede quedar pendiente.                                                                           | Sprint real si está seleccionado; si no, etiqueta `target-s3`…       |
| `story_points`     | Fibonacci 1, 2, 3 o 5 por planning poker. Solo en Story; en Task, vacío salvo acuerdo del equipo.         | Story point estimate.                                                |
| `priority`         | P0 necesaria para el objetivo del sprint; P1 capacidad adicional.                                         | Prioridad Jira (P0 → High, P1 → Medium), sin crear valores nuevos.  |
| `layer`            | backend, frontend, ambas, infra o docs.                                                                   | Etiqueta `capa-backend`, `capa-frontend`, `capa-ambas`…              |
| `risk`             | normal, seguridad (auth, RBAC, acceso), datos (migraciones, integridad), archivos (S3, audio, URLs firmadas) o infra. | Etiqueta `riesgo-seguridad`…                              |
| `adr_gate`         | Bloques del ADR de los que depende y su estado.                                                           | Sección Dependencia externa mientras esté ABIERTO.                   |
| `definition_state` | backlog oficial, pendiente de decisión o ready.                                                           | Etiqueta `backlog-oficial`, `pendiente-decision` o `ready`.          |
| `status`           | To Do al importar.                                                                                         | Workflow real (To Do → In Progress → In Review → Done).              |
| `owner`            | Adrián o Sebastian, solo cuando esté confirmado.                                                           | Assignee; no se duplica en la Description.                           |
| `references`       | HU-NN, RF/RNF, ADR `Dx.y`, spec de capa.                                                                   | Sección Referencias.                                                 |
| `blocked_by`       | local_ids predecesores y motivo.                                                                           | Enlace Blocks: el predecesor bloquea al sucesor.                     |
| `external_blocker` | Infraestructura humana, decisión o persona externa, con la siguiente acción.                              | Sección Dependencia externa; si afecta a varios tickets, Task + enlaces. |
| `split_reason`     | Motivo para crear un Sub-task o dividir una historia.                                                     | Description del nuevo ticket y referencia desde el original.         |
| `evidence`         | PR, run de CI, captura de staging. Vacío hasta ejecutar.                                                  | Comentario o Description posterior, sin datos sensibles.             |

Todos los tickets entran al backlog oficial sin assignee ni evidencia. Siguen sin estar Ready hasta cumplir la definición de Ready.

## Dependencias y gates

- `blocked_by` contiene dependencias de entrega: el sucesor no se da por terminado antes que el predecesor. Se permiten specs y tests en rojo aislados cuando la dependencia no afecta a esa actividad.
- El orden entre casillas se conserva en la Description; no se exporta como enlaces Blocks.
- Parent expresa pertenencia; no crea un bloqueo. No se crean ciclos entre un ticket y sus hijos.
- **Gate del ADR:** una historia que depende de un bloque ABIERTO no es Ready. Hoy el bloque 7 (subida de audio a S3) bloquea HU-13..16 y las migraciones de `productions`, `songs`, `versions`, `comments` y `studio_sessions` (`CLAUDE.md` §5). Mientras siga así, tampoco se escriben su spec de implementación ni sus tests.
- **Infraestructura manual:** Railway, Vercel, Auth0, S3, DNS y Resend los configura el equipo humano. Se registran como Dependencia externa o como Task enlazada; el agente no los toca.
- **Compuertas del método:** C1 (sin spec aprobada no hay tests), C2 (sin test en rojo no hay código), C3 (todo test se prueba rompiéndolo), C4 (frontera real para contratos externos) y C5 (sin tests no hay tarea terminada). Marcar casillas no las sustituye.
- **Done:** código integrado en `develop` por PR con pipeline verde, tests pasando, AC cumplidos, RNF aplicables verificados y revisión en el Sprint Review. El release se libera cuando todas sus historias cumplen Done.
- Un bloqueo documentado sigue siendo un bloqueo. El sprint puede cerrar por calendario, pero su objetivo no se declara cumplido si faltan criterios.
- Las correcciones que descubren pruebas o reviews se resuelven antes de la entrega; si necesitan seguimiento propio, se crean como Bug enlazado.

## Estimación, capacidad y Ready

- Las historias se estiman en story points (1, 2, 3, 5) por planning poker, considerando complejidad, incertidumbre y volumen, sin traducción directa a horas. El backlog de la tesis suma 92 SP; HU-28 queda con 2 SP supuestos hasta confirmarlo.
- Una historia de más de 5 SP se divide.
- Capacidad nominal: dos desarrolladores × 80 h por sprint de dos semanas (160 h); 80 h en S7 y S8, que duran una semana. Specs, tests, reviews, integración y correcciones consumen esa misma capacidad. Las esperas externas se registran aparte y no se les asignan horas ficticias.
- Flujo continuo (roadmap): si un sprint termina antes, se toman historias Ready del siguiente, nunca una bloqueada por el ADR.
- **Ready:** AC escritos en el ticket, bloques del ADR de los que depende en estado DECIDIDO y fuera de "Qué NO hacer todavía". La spec de capa se escribe al entrar al ciclo, no antes de importar.

## Trabajo ya realizado antes del tablero

El scaffolding (Laravel 13 + Sail, React + Vite), ESLint/Prettier/Husky, la CI de frontend y backend, la autenticación con Auth0 y la configuración de Railway ya están integrados en `develop` (PR #1 a #9).

- Sus tickets se crean en el primer lote igual que los demás: en To Do. Después se mueven a Done a mano, registrando como evidencia el PR o la ejecución de CI. No se importan como Done sin evidencia.
- Las casillas pendientes (por ejemplo, la spec de HU-04 o el despliegue a staging) quedan abiertas.
- Las claves TS-01..TS-23 que aparecen en commits antiguos pertenecen a un tablero anterior. Quedan como historial y no se reescriben; a partir de la importación, ramas y commits usan las claves nuevas.

## Preparación del CSV

1. Confirmar Jira Cloud, proyecto `TS` (team-managed), tipos Epic/Story/Task/Bug disponibles, campo Story point estimate y permisos de importación.
2. Generar una fila por ticket explícito: épicas, Story, Task y los Sub-task o Bug justificados. Las casillas no generan filas.
3. Asignar un `Work item ID` numérico solo para la importación y mantener en `imports/` la tabla `local_id → import_id → clave TS-<n>`.
4. Incluir cada checklist completa en la Description, con IDs, casillas, Hecho cuando y orden. Serializar en UTF-8, con separador coma y comillas dobles, y verificar que no se pierdan saltos de línea ni caracteres con tilde.
5. Mapear Work item ID, Work type, Summary, Description, Parent, Priority, Story point estimate y todas las columnas Labels.
6. Importar primero una muestra (una Epic y una Story con un enlace Blocks), registrar las claves devueltas y comprobar padre, casillas y dirección del bloqueo. La muestra forma parte del lote; no se vuelve a crear.
7. Importar el resto del lote. Si el importador no resuelve los enlaces Blocks entre IDs locales, hacer una segunda pasada con las claves reales.
8. Verificar conteos de tickets y casillas, padres, etiquetas, SP, sprint y ausencia de duplicados. **Nunca se reimporta un CSV de creación**: ante un éxito parcial, se consulta Jira y se prepara un archivo mínimo con lo que falta.

El importador conserva los pasos como texto. No se asume que convierta Markdown en casillas nativas. Si se convierten después (a mano o con un conector), se verifica leyendo el ticket.

En Jira Cloud, el importador CSV simple de creación masiva no conserva la jerarquía completa; Atlassian remite al importador de sistemas externos. [Importador CSV](https://support.atlassian.com/jira-software-cloud/docs/create-issues-using-the-csv-importer/), [importación de sistemas externos](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/), [errores de enlaces y jerarquía](https://support.atlassian.com/jira/kb/resolve-csv-import-errors-in-jira-cloud/).

## Siguiente paso

1. `sprints/sprint-01.md`: desglose de S1 con las casillas ya cumplidas marcadas con su evidencia.
2. `imports/`: CSV del lote inicial (las 49 filas del catálogo de [jira-backlog.md](jira-backlog.md)) y su registro de claves.
