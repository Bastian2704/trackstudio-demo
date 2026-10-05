# Modelo de datos del Sprint 2 — ampliaciones

> **Jira:** `TS-16` (HU-05) · slice de `productions` de `TS-49` cuando se apruebe (`ts-08.10`)
> **Base:** [`modelo-minimo-sprint-1.md`](modelo-minimo-sprint-1.md) (`TS-54`, cerrado)
> **Estado:** ampliación de `artists` en borrador, se aprueba junto con [`../specs/backend/HU-05.md`](../specs/backend/HU-05.md).

## 1. Alcance

Este documento es un **delta**: recoge solo lo que el Sprint 2 cambia o añade sobre el modelo de S1. Lo que no aparece aquí sigue exactamente como lo define `modelo-minimo-sprint-1.md`. Cuando ambos documentos difieren, prevalece este.

Hoy cubre:

- `artists`: unicidad de negocio de `name` y `email` (`TS-16`).

Queda reservado, sin contenido todavía:

- `productions`: su slice lo aprueba `TS-49` (`ts-08.10`) antes de `TS-19`. **No se inventa aquí.** Cuando esté aprobado se añade como sección propia.

Siguen fuera de S2: `songs`, `versions`, `comments`, `studio_sessions` y `production_access` (`CLAUDE.md` raíz §5).

## 2. Decisiones

### 2.1 `artists.name` y `artists.email` son únicos entre los artistas vigentes (`TS-16`, 2026-10-04)

El criterio de aceptación de HU-05 exige unicidad de nombre y email. Sustituye la afirmación de S1 de que `artists.email` «no se asume único».

- **Sin distinguir mayúsculas:** `Ana@Correo.com` y `ana@correo.com` son el mismo correo; `J Balvin` y `j balvin`, el mismo nombre. La comparación se hace tras recortar espacios.
- **Solo entre filas vigentes** (`deleted_at IS NULL`): un artista con soft delete (D4.5) libera su nombre y su correo. Un artista `inactivo` sigue vigente y los conserva.
- **La base de datos es la última barrera:** índices únicos parciales `artists_name_lower_unique` sobre `lower(name)` y `artists_email_lower_unique` sobre `lower(email)`, ambos con `WHERE deleted_at IS NULL`. La validación amigable (422) vive en la capa de aplicación; el índice impide el duplicado aunque dos altas compitan.

### 2.2 El registro no emite invitación (`TS-16`, 2026-10-04)

`invitation_token`, `invited_at` e `invitation_expires_at` siguen siendo nullable y quedan en `NULL` al registrar un artista. La invitación la emite el flujo de acceso del artista (HU-20), con Resend disponible en S5. Ver la nota de 2026-10-04 en D6.4.

## 3. Cambios al diccionario de `artists`

Solo se listan las filas que cambian respecto a S1.

| Columna | Tipo PostgreSQL | Nulabilidad | Restricciones e índices | Propósito |
| --- | --- | --- | --- | --- |
| `name` | `varchar(255)` | `NOT NULL` | Único parcial `artists_name_lower_unique` sobre `lower(name)` `WHERE deleted_at IS NULL` (§2.1) | Nombre de catálogo del artista. |
| `email` | `varchar(255)` | `NOT NULL` | Único parcial `artists_email_lower_unique` sobre `lower(email)` `WHERE deleted_at IS NULL` (§2.1) | Dirección de contacto e invitación. No es identidad de autenticación. |
| `invitation_token` | `varchar(255)` | `NULL` | `UNIQUE` (sin cambios) | Token de invitación definido por D6.4; nace en HU-20, no en el registro (§2.2). |

## 4. Migración

`add_unique_name_and_email_indexes_to_artists_table`, con una sola intención: crea los dos índices de §2.1 y no toca columnas ni otras tablas. Su `down()` elimina exactamente esos dos índices.

## 5. Trazabilidad

- `TS-16`: consumidor de §2.1 y §2.2, responsable de la migración de §4 después de Red.
- `TS-49`: dueño del ERD completo; aportará aquí el slice de `productions`.
- ADR: D4.5 (soft delete), D6.4 (nota del 2026-10-04) y D6.7 (únicos de negocio).
