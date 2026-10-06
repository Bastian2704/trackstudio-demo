# Handoff v15 — Track Studio

**Fecha:** 2026-10-06 · **Sprint:** 2 · **Capa(s):** global (datos)
**Foco de la sesión:** `TS-49`, diseñar, aprobar y cerrar el ERD completo en tres cortes.

> Continúa [`HANDOFF_v14.md`](HANDOFF_v14.md). Rama: `feature/TS-49-cerrar-erd`, creada desde `develop` después de integrar el PR #30 (TS-16). El humano hizo todas las escrituras de git.

## 1. Resumen ejecutivo

El ERD de las ocho entidades está **aprobado** y el ADR lo marca **CERRADO**. El slice de `productions` se aprobó el 2026-10-05, así que `TS-19` está desbloqueada, y el modelo completo se aprobó el 2026-10-06. No se creó ninguna migración: cada tabla la materializa su historia (`modelo-completo.md` §7). Quedan pendientes los cambios en Jira de TS-18, TS-20 y las notas obsoletas del bloque 7, el PR y cerrar TS-49.

## 2. Qué se hizo

| Corte | Entregable | Estado |
|---|---|---|
| 1 | `docs/erd/modelo-sprint-2.md` §5: slice de `productions` | Aprobado 2026-10-05, commit `9e66de6`. Comentarios publicados en TS-49 y TS-19 en Jira. |
| 2 | `docs/erd/modelo-completo.md`: 8 entidades, invariantes I1–I9, Mermaid, trazabilidad RF/HU, inventario de restricciones y plan de materialización | Aprobado 2026-10-06, commit `6407b12` (más la marca de aprobación en este corte). |
| 3 | ADR: D4.6 (enums nuevos), D6.5 (enmienda a `artist_id`), D6.7 (únicos, índice de comments, exclusión), «Estado del ERD» → CERRADO, D8.1 y resumen de abiertos; `sprint-02.md` (casillas TS-49, `ts-08.10`, `ts-09.10`); `CLAUDE.md` §1 | En el árbol de trabajo, pendiente de commit. |

**Verificación:** el DDL completo se ejecutó en el PostgreSQL de Sail dentro de `BEGIN … ROLLBACK`. Las 12 operaciones que debían fallar fallaron por la restricción esperada y las 5 que debían pasar pasaron (`modelo-completo.md` §8). La base quedó vacía.

## 3. Decisiones tomadas en esta sesión

Todas las tomó el humano:

- **Formato por número de canciones:** sencillo 1, EP 2–6, álbum ≥ 7. **Solo bloquean los máximos.** Sustituye «EP ≤ 30 min» de HU-09. Por qué: la duración no existe hasta S4 y castiga a los EP con canciones largas.
- **Estados del artista:** se queda `invitado`/`activo`/`inactivo` (D6.3). Hay que corregir los AC de TS-18.
- **`production_access` contra `artist_id`** (enmienda de D6.5 y D6.7), porque la invitación se hace antes de que exista la cuenta. Solo recibe acceso el **artista dueño**, como regla del Service de HU-20.
- **Duración del audio** solo en `versions.duration_ms`, la reporta el frontend y solo acota el timestamp de los comentarios.
- **`versions.label`** es opcional; si falta, se muestra «v{n}».
- **`studio_sessions`:** `production_id NOT NULL` y exclusión GiST de solapes entre las `confirmada` (sin `btree_gist`).
- Decisiones de diseño aceptadas dentro del documento:
  - `versions` nace en `pendiente` al firmar y su único `(song_id, version_number)` es total (hay huecos y nunca se reutiliza un número).
  - `comments` no se pueden editar y se borran físicamente.
  - `songs.position` no tiene único en BD.
  - `productions` no tiene `created_by`.

## 4. Trampas y hallazgos

- **La base de desarrollo de Sail está vacía** (los tests usan `RefreshDatabase`). Para probar DDL contra `artists`/`users` hay que crear sus esquemas dentro de la misma transacción revertida. El script está en el scratchpad de la sesión y se reconstruye a partir de `modelo-completo.md` §3.
- **Sail estaba apagado** y se levantó con `./vendor/bin/sail up -d` para la verificación.
- **Las restricciones sin nombre** las nombra PostgreSQL de forma automática (p. ej., `studio_sessions_check1`). Para traducir errores a 422 de forma estable, las migraciones de S3–S6 deberían nombrar sus `CHECK` de forma explícita.
- **`EXCLUDE … WHERE`** no se puede expresar con el Schema Builder de Laravel: va con `DB::statement` (anotado en §3.8).

## 5. Drift detectado

- **`docs/rbac-matrix.md` no existe**, aunque `CLAUDE.md` §3 lo lista en la estructura. La matriz vive en D8.1 del ADR. Dueño: `CLAUDE.md`. Hay que quitar la entrada o crear el archivo.
- **AC de Jira desactualizados:** TS-18 (estados suspendido/bloqueado), TS-20 (EP ≤ 30 min) y TS-21..TS-28 y TS-33 (dicen que el bloque 7 está ABIERTO). Dueño: Jira. Los cambios están propuestos y pendientes de confirmación.
- **Tesis:** la RF-02 sigue con el límite de 30 minutos. Se arrastra junto con la corrección del SDK de Auth0 (`TS-46`, `ts-35.s2.03`).

## 6. Bloqueos y pendientes

- Jira: checklist de TS-49 (`ts-38.01`..`ts-38.09`), AC de TS-18/TS-20 y notas del bloque 7. Requiere confirmación del humano antes de publicar.
- D8.1: faltan las filas de `productions`/`songs`/`versions`/`comments`/`studio_sessions`. El insumo es la sección «Autorización» de cada entidad.
- Siguen abiertos en el ADR, sin bloquear esto: 9.2, 9.4, 11.5 y 8.5.

## 7. Próximos pasos

1. Commit del corte 3 y PR de `feature/TS-49-cerrar-erd` → `develop`.
2. Publicar los cambios de Jira y cerrar TS-49 cuando el PR esté integrado.
3. Spec backend de HU-08 (`TS-19`, `ts-08.01`) sobre `modelo-sprint-2.md` §5. Decidir ahí si se permite crear producciones para un artista `inactivo`.
4. En paralelo: spec frontend de HU-05 (`ts-05.05`), pendiente desde v14.

## 8. Cómo retomar el entorno

Sin cambios respecto a v13 y v14. Sail: `cd backend && ./vendor/bin/sail up -d`.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
