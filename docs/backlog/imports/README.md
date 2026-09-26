# Importación a Jira - Track Studio

**Estado:** preparado, sin importar. Proyecto `TS` (Jira Cloud) vacío al 2026-09-22.
**Archivo:** [ts-lote-inicial.csv](ts-lote-inicial.csv), el lote inicial único de 49 filas.
**Procedimiento:** [backlog-format.md](../backlog-format.md#preparación-del-csv). Este archivo registra el resultado y no repite el procedimiento.

## Contenido del lote

| Tipo  | Filas | Import ID           | Notas                                                                    |
| ----- | ----- | ------------------- | ------------------------------------------------------------------------ |
| Epic  | 11    | 1001-1011           | Solo el párrafo "Resultado y límites".                                   |
| Story | 28    | 1101-1128 (`ts-NN` → `11NN`) | HU-01..HU-28 con historia y AC del Anexo C; 92 SP.              |
| Task  | 10    | 1129-1138 (`ts-NN` → `11NN`) | ts-29..ts-38.                                                   |

- Checklists: solo los seis tickets de S1 (ts-01..ts-04, ts-29, ts-38) llevan checklist, con 53 casillas copiadas de [sprint-01.md](../sprints/sprint-01.md). Las demás historias reciben su checklist al refinar su sprint.
- Criterios de aceptación: copiados del Anexo C de `Documentacion.md`. Desde la importación, Jira es su fuente de verdad. HU-02 entra ya corregido: "el merge a `develop` despliega a staging".
- Codificación: UTF-8 sin BOM, separador coma, todas las celdas entre comillas dobles y saltos de línea LF dentro de Description.

## Columnas y mapeo

| Columna CSV            | Campo Jira           | Regla                                                                                     |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Work item ID           | Work item ID         | Numérico, solo para la importación.                                                       |
| Work type              | Work type            | Epic, Story o Task.                                                                       |
| Summary                | Summary              | En Story: `HU-NN <resultado>`.                                                            |
| Description            | Description          | Plantilla mínima de `backlog-format.md`.                                                  |
| Parent                 | Parent               | Import ID de la épica. Vacío en Epic.                                                     |
| Priority               | Priority             | `High` (P0) en las 28 Story y en ts-29 y ts-38. Vacío en las otras Task: sin prioridad acordada, Jira aplica su valor por defecto. |
| Story point estimate   | Story point estimate | Solo en Story. HU-28 lleva 2 SP **supuestos**, pendientes de planning poker.              |
| Labels ×7              | Labels               | Ver tabla siguiente.                                                                      |

| Etiqueta                          | Uso                                                              |
| --------------------------------- | ---------------------------------------------------------------- |
| `local-<id>`                      | Identificador estable (`local-ts-05`, `local-ts-epic-infra`).    |
| `lote-inicial`                    | Identifica este lote. Se conserva por trazabilidad.              |
| `backlog-oficial`                 | Baseline vigente; no equivale a Ready.                           |
| `release-r1..r3`, `release-transversal` | Release del roadmap.                                       |
| `target-s1..s8`                   | Sprint objetivo mientras no exista el sprint real en Jira. ts-35 (S2-S8) usa `target-s2`; ts-38 (S1-S2) usa `target-s1`. |
| `capa-*`                          | backend, frontend, ambas, infra o docs.                          |
| `riesgo-*`                        | normal, seguridad, datos, archivos o infra.                      |

## Antes de importar

- Confirmar que el proyecto `TS` tiene los tipos Epic, Story y Task, el campo Story point estimate y los valores de prioridad `High` y `Medium`.
- Usar el importador de sistemas externos (el CSV simple no conserva la jerarquía) y seleccionar exactamente `ts-lote-inicial.csv`.
- En la vista previa, comprobar 49 filas, 14 columnas y las 7 columnas Labels mapeadas. Detenerse si aparece una sola columna o un conteo distinto.
- Importar primero la muestra: `1001` (Epic infra) y `1101` (ts-01). La muestra forma parte del lote; al importar el resto, quitar esas dos filas.
- **No reimportar nunca el archivo completo.** Ante un éxito parcial, consultar Jira y preparar un archivo mínimo con lo que falte.

## Mapeo de claves

Rellenar la columna "Clave Jira" con las claves devueltas por el importador.

| Import ID | ID local | Tipo | Summary | Clave Jira |
| --- | --- | --- | --- | --- |
| 1001 | ts-epic-infra | Epic | Infraestructura y entornos | — |
| 1002 | ts-epic-identity | Epic | Identidad y control de acceso | — |
| 1003 | ts-epic-artists | Epic | Artistas | — |
| 1004 | ts-epic-productions | Epic | Producciones | — |
| 1005 | ts-epic-songs | Epic | Canciones | — |
| 1006 | ts-epic-audio | Epic | Versiones de audio | — |
| 1007 | ts-epic-comments | Epic | Comentarios con marca de tiempo | — |
| 1008 | ts-epic-artist-access | Epic | Acceso del artista | — |
| 1009 | ts-epic-sessions | Epic | Sesiones de estudio | — |
| 1010 | ts-epic-quality | Epic | Calidad y aceptación | — |
| 1011 | ts-epic-thesis | Epic | Documento de tesis | — |
| 1101 | ts-01 | Story | HU-01 Configurar entorno y repositorios | — |
| 1102 | ts-02 | Story | HU-02 Pipeline CI/CD con despliegue a staging | — |
| 1103 | ts-03 | Story | HU-03 Autenticación con Auth0 | — |
| 1104 | ts-04 | Story | HU-04 Control de acceso basado en roles | — |
| 1105 | ts-05 | Story | HU-05 Registrar y editar artistas | — |
| 1106 | ts-06 | Story | HU-06 Listar artistas con estado y producciones | — |
| 1107 | ts-07 | Story | HU-07 Cambiar el estado de un artista | — |
| 1108 | ts-08 | Story | HU-08 Registrar, editar y eliminar producciones | — |
| 1109 | ts-09 | Story | HU-09 Validar restricciones de formato | — |
| 1110 | ts-10 | Story | HU-10 Registrar, editar y eliminar canciones | — |
| 1111 | ts-11 | Story | HU-11 Listar canciones con estado y posición | — |
| 1112 | ts-12 | Story | HU-12 Eliminar canción con confirmación y cascada | — |
| 1113 | ts-13 | Story | HU-13 Subir archivos de audio a una versión | — |
| 1114 | ts-14 | Story | HU-14 Versionado secuencial automático | — |
| 1115 | ts-15 | Story | HU-15 Reproducir versiones desde la interfaz | — |
| 1116 | ts-16 | Story | HU-16 Servir audio mediante URLs firmadas | — |
| 1117 | ts-17 | Story | HU-17 Comentar sobre una marca de tiempo | — |
| 1118 | ts-18 | Story | HU-18 Ver comentarios en la línea de tiempo | — |
| 1119 | ts-19 | Story | HU-19 Navegar al comentario y eliminar los propios | — |
| 1120 | ts-20 | Story | HU-20 Otorgar y revocar acceso del artista | — |
| 1121 | ts-21 | Story | HU-21 Vista restringida a producciones asignadas | — |
| 1122 | ts-22 | Story | HU-22 Registrar, editar y cancelar sesiones | — |
| 1123 | ts-23 | Story | HU-23 Consultar calendario y solicitar sesiones | — |
| 1124 | ts-24 | Story | HU-24 Pruebas unitarias de componentes críticos | — |
| 1125 | ts-25 | Story | HU-25 Pruebas de integración de endpoints | — |
| 1126 | ts-26 | Story | HU-26 Corregir defectos y verificar RNF | — |
| 1127 | ts-27 | Story | HU-27 Desplegar a producción | — |
| 1128 | ts-28 | Story | HU-28 Documentación final y pruebas de aceptación | — |
| 1129 | ts-29 | Task | Configurar staging (Railway desde develop + Vercel preview) | — |
| 1130 | ts-30 | Task | Configurar dominio trackstudio.site y DNS | — |
| 1131 | ts-31 | Task | Provisionar bucket S3 e IAM en us-east-1 | — |
| 1132 | ts-32 | Task | Configurar Resend con dominio verificado | — |
| 1133 | ts-33 | Task | Configurar producción (Railway, Vercel, Auth0) y monitoreo de uptime | — |
| 1134 | ts-34 | Task | Tesis: Diseño de la solución (C4 niveles 2-4, ERD, persistencia) | — |
| 1135 | ts-35 | Task | Tesis: Desarrollo de la solución (evidencia SCRUM por sprint) | — |
| 1136 | ts-36 | Task | Tesis: Pruebas y evaluación de la solución | — |
| 1137 | ts-37 | Task | Tesis: Resultados, ética, conclusiones, trabajo futuro y resumen | — |
| 1138 | ts-38 | Task | Diseñar y cerrar el ERD del modelo de datos | — |

## Enlaces Blocks (segunda pasada)

El CSV no incluye enlaces. Se crean después de importar, con las claves reales. Cada fila se lee: el predecesor bloquea al sucesor. Son 46 enlaces, generados desde la columna "Bloqueado por" de [jira-backlog.md](../jira-backlog.md).

| Predecesor | Import ID | Sucesor | Import ID |
| --- | --- | --- | --- |
| ts-01 | 1101 | ts-02 | 1102 |
| ts-29 | 1129 | ts-02 | 1102 |
| ts-01 | 1101 | ts-03 | 1103 |
| ts-03 | 1103 | ts-04 | 1104 |
| ts-04 | 1104 | ts-05 | 1105 |
| ts-05 | 1105 | ts-06 | 1106 |
| ts-05 | 1105 | ts-07 | 1107 |
| ts-05 | 1105 | ts-08 | 1108 |
| ts-38 | 1138 | ts-08 | 1108 |
| ts-08 | 1108 | ts-09 | 1109 |
| ts-08 | 1108 | ts-10 | 1110 |
| ts-38 | 1138 | ts-10 | 1110 |
| ts-10 | 1110 | ts-11 | 1111 |
| ts-10 | 1110 | ts-12 | 1112 |
| ts-13 | 1113 | ts-12 | 1112 |
| ts-10 | 1110 | ts-13 | 1113 |
| ts-31 | 1131 | ts-13 | 1113 |
| ts-38 | 1138 | ts-13 | 1113 |
| ts-13 | 1113 | ts-14 | 1114 |
| ts-14 | 1114 | ts-15 | 1115 |
| ts-16 | 1116 | ts-15 | 1115 |
| ts-13 | 1113 | ts-16 | 1116 |
| ts-15 | 1115 | ts-17 | 1117 |
| ts-38 | 1138 | ts-17 | 1117 |
| ts-17 | 1117 | ts-18 | 1118 |
| ts-18 | 1118 | ts-19 | 1119 |
| ts-05 | 1105 | ts-20 | 1120 |
| ts-08 | 1108 | ts-20 | 1120 |
| ts-32 | 1132 | ts-20 | 1120 |
| ts-20 | 1120 | ts-21 | 1121 |
| ts-04 | 1104 | ts-21 | 1121 |
| ts-08 | 1108 | ts-22 | 1122 |
| ts-38 | 1138 | ts-22 | 1122 |
| ts-22 | 1122 | ts-23 | 1123 |
| ts-21 | 1121 | ts-23 | 1123 |
| ts-02 | 1102 | ts-24 | 1124 |
| ts-02 | 1102 | ts-25 | 1125 |
| ts-23 | 1123 | ts-26 | 1126 |
| ts-26 | 1126 | ts-27 | 1127 |
| ts-33 | 1133 | ts-27 | 1127 |
| ts-27 | 1127 | ts-28 | 1128 |
| ts-30 | 1130 | ts-32 | 1132 |
| ts-30 | 1130 | ts-33 | 1133 |
| ts-24 | 1124 | ts-36 | 1136 |
| ts-25 | 1125 | ts-36 | 1136 |
| ts-28 | 1128 | ts-37 | 1137 |

## Verificación posterior

- 49 elementos bajo `TS`: 11 Epic, 28 Story y 10 Task, todos en To Do y sin assignee.
- Cada Story y Task tiene su épica como Parent.
- Suma de Story point estimate igual a 92.
- 53 casillas en las descripciones de S1 y 46 enlaces Blocks con la dirección correcta.
- Las tildes y los saltos de línea se conservan.
- Los tickets con casillas `[x]` (ts-01, ts-02, ts-03) siguen en To Do. Pasan a Done a mano solo con evidencia y AC cumplidos.

## Consultas útiles

```text
project = TS AND labels = "lote-inicial" ORDER BY key ASC
project = TS AND labels = "target-s1" ORDER BY Rank ASC
project = TS AND labels = "riesgo-archivos" ORDER BY key ASC
```

## Después de importar

1. Registrar las claves en la tabla de mapeo y en la columna Jira del catálogo de épicas de `jira-backlog.md`.
2. Sustituir `TS-XXX` en `docs/specs/{backend,frontend}/HU-04.md` por la clave real de ts-04.
3. Crear el sprint S1 en Jira (2026-09-21 a 2026-10-02) con los seis tickets `target-s1`.
4. Usar las claves nuevas en ramas y commits. Las claves TS-01..TS-23 de commits antiguos son del tablero anterior.
