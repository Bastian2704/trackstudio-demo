# Mapa vigente de claves Jira

**Fuente de verdad:** Jira de MediHealth, proyecto `TS`, board 3.  
**Última verificación:** 2026-09-30.

Este mapa evita confundir los IDs locales del backlog y las claves del tablero anterior con las claves actuales. Jira manda; si una fila difiere del tablero, se corrige aquí después de corregir Jira.

## Baseline importada

| Alcance | ID local | Jira actual |
| --- | --- | --- |
| Épicas | `ts-epic-infra` … `ts-epic-thesis` | `TS-1` … `TS-11` |
| HU-01 … HU-28 | `ts-01` … `ts-28` | `TS-12` … `TS-39` |
| Tasks del backlog | `ts-29` … `ts-38` | `TS-40` … `TS-49` |

La correspondencia dentro de cada rango es consecutiva: HU-01 = `TS-12`, HU-02 = `TS-13`, HU-03 = `TS-14`, HU-04 = `TS-15`; ts-29 = `TS-40` y ts-38 = `TS-49`.

## Trabajo creado después de la importación

| Jira | Tipo | Alcance | Estado al 2026-09-30 |
| --- | --- | --- | --- |
| `TS-50` | Subtask de `TS-42` | Preparar cuenta AWS; no provisiona bucket/IAM de la aplicación | Listo |
| `TS-51` | Task de `TS-2` | Manejador centralizado D3.1 y correlación con Sentry; trazabilidad retrospectiva | Listo |
| `TS-52` | Task relacionada con `TS-44` | Health check, runbook y uptime en staging | Listo |
| `TS-53` | Task relacionada con `TS-46` | Evidencia SCRUM del Sprint 1 en la tesis | Por hacer |
| `TS-54` | Task relacionada con `TS-49` | Modelo mínimo `users`/`artists` y decisión sobre `production_access` | Por hacer |

## Claves históricas

Las referencias `TS-27`, `TS-28` y `TS-29` en commits, ramas y handoffs v1-v3 pertenecen al tablero anterior y significaban, respectivamente, manejador de errores, JWT y `/me`. En el Jira actual esas claves son HU-16, HU-17 y HU-18. No se reescribe el historial Git ni los handoffs históricos; las specs activas usan `TS-51` y `TS-14`.
