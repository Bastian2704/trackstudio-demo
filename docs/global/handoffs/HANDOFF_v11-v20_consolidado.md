# Handoff consolidado v11–v20 — Track Studio

**Periodo:** 2026-10-02 → 2026-10-07 · **Sprint:** 1 → 2 · **Capa(s):** backend / frontend / global / planificación
**Qué es:** la unificación de `HANDOFF_v11.md` a `HANDOFF_v20.md` que pide la regla 9 de `PLANTILLA-HANDOFF.md`. Contiene **solo** lo de esos diez. El estado posterior está en `HANDOFF_v21.md` y siguientes.

> Escrito el 2026-10-26 (`TS-79`), con retraso: la regla tocaba al cerrar v20. `HANDOFF_v20.md` se tituló «Consolidado v11–v20», pero era un resumen corto que además registraba el cierre del backend de TS-19. Este documento lo sustituye como consolidado, y lo de v20 se integra aquí como una sesión más. Los originales se archivaron en [`trackstudio-documentacion/Handoffs`](https://github.com/Cheboy04/trackstudio-documentacion/tree/main/Handoffs). Cuando un dato de aquí choque con un handoff posterior, **manda el posterior**.

---

## 1. Resumen ejecutivo

En estos diez handoffs se cerró el Sprint 1 y arrancó el Sprint 2:

- Frontend de HU-04 (RBAC, `TS-15`): guards, `/productor` y `/403`, 21 tests.
- Replanificación de 14 a **12 semanas** (`TS-60`): seis sprints, 92 SP, ninguna HU eliminada.
- HU-05 (`TS-16`, artistas) completa en backend y frontend, con los 422 en español.
- ERD completo aprobado y CERRADO en el ADR (`TS-49`).
- Backend de HU-08 (`TS-19`, producciones) terminado y con C3: 34 mutaciones.

Al cerrar v20 quedaban pendientes:

- Los PR de `TS-16` (frontend), `TS-49` y `TS-19`.
- La integración de HU-04 en staging (`ts-04.09` y `ts-04.10`).
- La decisión 9.2 (migraciones en el deploy).
- El frontend de HU-08.

## 2. Qué se hizo (cronología)

| v | Fecha | Foco | Resultado |
|---|---|---|---|
| v11 | 10-02 | TS-15: frontend de HU-04 | `/productor` exclusiva del productor; un error `FORBIDDEN` lleva a `/403`. El interceptor decide por `code`. 21 tests y 7 mutaciones C3. `ts-04.05`..`08` hechas. |
| v12 | 10-02 | TS-60: replanificación | Paso a 12 semanas (2026-09-21 → 2026-12-11). Se crea `TS Sprint 2` (id 37) con HU-05..HU-09 (13 SP) y una reserva de 2 SP para HU-24..HU-26. |
| v13 | 10-04 | TS-16: spec y Red del backend | Spec HU-05 aprobada (`46c8804`). 56 tests en rojo por la razón correcta. Se crea `modelo-sprint-2.md`. |
| v14 | 10-05 | TS-16: Green y review del backend | 127 verdes y 1 omitido. 26 mutaciones C3. Se crea el consolidado de v1–v10. |
| v15 | 10-06 | TS-49: ERD completo | Slice de `productions` (10-05) y `modelo-completo.md` (10-06) aprobados. DDL comprobado dentro de `BEGIN … ROLLBACK`. AC de Jira corregidos. |
| v16 | 10-07 | TS-16: español y frontend | `APP_LOCALE=es` y `lang/es/validation.php` (`042d9e9`). Alta y edición de artistas en el frontend (`17639ba`), Vitest 40/40. |
| v17 | 10-07 | Orden del S2 y spec de TS-19 | TS-19 pasa por delante de TS-17. Borrador de la spec HU-08. |
| v18 | 10-07 | TS-19: spec aprobada y Red | 69 fallos esperados (faltan la tabla, el modelo y las rutas). |
| v19 | 10-07 | TS-19: Green de persistencia | Enum, modelo, factory, relaciones y migración de `productions`. 14 tests y 55 aserciones. |
| v20 | 10-07 | TS-19: cierre del backend | CRUD completo. 77 tests de TS-19 y suite de 205 tests (1 omitido). 34 mutaciones C3. |

## 3. Decisiones vigentes (con su documento dueño)

**Planificación (`roadmap.md`, `sprint-02.md`)**
- Seis sprints de dos semanas. Termina el **2026-12-11**. El alcance no cambia: 28 HU y 92 SP.
- R1 cierra en S4, R2 es un gate interno de S6 y R3 cierra en S6, en producción.
- HU-24..HU-26 tienen una reserva de 2 SP equivalentes por sprint (S2–S5) y cierran en S6. Los SP se cuentan una sola vez.
- Si dos cortes seguidos quedan por debajo de la meta (15,2 SP), se ajusta la capacidad, las esperas o la fecha. **El alcance no se toca.**
- TS-19 se ejecuta antes que TS-17, porque HU-06 necesita producciones reales (v17).

**Frontend de HU-04 (spec frontend HU-04)**
- `/me` sigue abierta a los dos roles. `/productor` queda bajo `RequireAuth` + `RequireRole(['productor'])`.
- Un 403 del backend y una denegación del guard llegan a la misma pantalla `/403`, pero se prueban por separado.
- Vitest fija `cacheLocation="memory"`. Que no haya tokens en el storage se comprueba en staging, después de un login real (C4).

**Artistas, HU-05 (`modelo-sprint-2.md` §2.1, spec HU-05)**
- `artists.name` y `artists.email` son únicos sin distinguir mayúsculas y solo entre artistas vigentes, con índices parciales sobre `lower(...)`. Un duplicado da **422 `VALIDATION_ERROR`**.
- El alta no envía invitación: los campos `invitation_*` quedan en NULL hasta HU-20 (nota de D6.4).
- `GET /artists/{artist}` es solo para el productor y sirve para precargar la edición.
- Provisión JIT del productor con `firstOrCreate` por `auth0_sub`, solo en el alta.
- ERD por sprint: el de S1 queda congelado y `modelo-sprint-2.md` prevalece donde lo modifica.
- Los mensajes de validación salen en español: `APP_LOCALE=es` y `lang/es/` (enmienda §3.8, v16; con ella se resolvió el hallazgo A4).
- El formulario del frontend se tipa con `z.infer` del esquema Zod. Las respuestas de la API **no** se validan en ejecución. Los errores de envío se tratan en `ArtistForm`.
- Aceptado con justificación (v14):
  - A1: el alta no usa transacción, porque el JIT es idempotente.
  - A3: la unicidad del nombre usa `lower(?)` en SQL.
  - A6: la Policy recibe `$artist` aunque no lo use.
- **A2, carrera entre validar e insertar:** si dos altas simultáneas chocan, la segunda da 500 en vez de 422. Se acepta porque hoy hay un solo productor (D8.1).

**ERD completo, TS-49 (`modelo-completo.md`; ADR D4.6, D6.5 y D6.7)**
- Formato por número de canciones: sencillo 1, EP 2–6, álbum ≥ 7. **Solo bloquean los máximos.** Sustituye a «EP ≤ 30 min».
- Estados del artista: `invitado`, `activo` e `inactivo` (D6.3).
- `production_access` apunta a `artist_id` (enmienda de D6.5). Solo el artista dueño recibe acceso.
- La duración del audio va solo en `versions.duration_ms`, la reporta el frontend.
- `versions` nace `pendiente` al firmar, y `(song_id, version_number)` es único en toda la tabla: puede haber huecos y los números no se reutilizan.
- `versions.label` es opcional (por defecto «v{n}»).
- Los `comments` no se editan y se borran físicamente.
- `songs.position` no tiene restricción de unicidad.
- `productions` no tiene `created_by`.
- `studio_sessions`: `production_id NOT NULL` y exclusión GiST de solapes entre las `confirmada`.
- Cada tabla la crea su propia historia (§7 del ERD). TS-49 no añadió migraciones.

**Producciones, HU-08 (spec HU-08, `modelo-sprint-2.md` §5)**
- El alta admite artistas `invitado` y `activo`. Uno `inactivo` da 422 en `errors.artist_id`, pero solo en el alta.
- `artist_id` no cambia después del alta. El borrado es lógico y responde 204 sin cuerpo.
- Rutas `POST /productions` y `GET|PUT|DELETE /productions/{production}` con `whereUuid`.
- Esquema: `foreignUuid()` sin cascada (D4.5), `varchar + CHECK` para el formato (D4.6) y único parcial `(artist_id, lower(name)) WHERE deleted_at IS NULL`.

## 4. Trampas y hallazgos (las que siguen siendo útiles)

**Tests**
- **Los 404 pueden nacer verdes:** una ruta que no existe da el mismo 404 que el route model binding. Llama primero a `exigirRuta()` (`tests/Pest.php`).
- **Un id que no es UUID da 500** si la ruta no lleva `whereUuid`. PostgreSQL lanza `invalid input syntax for type uuid`.
- **Índices parciales:** cada INSERT que debe fallar va dentro de `DB::transaction()`. Así se crea un savepoint y no se aborta la transacción de `RefreshDatabase`.
- **Para que una mutación C3 de mass assignment se ponga roja hay que mutar dos capas**, porque el Service vuelve a filtrar lo que deja pasar el controlador.
- **Pest en modo agente no muestra los nombres de los tests rojos.** Usa `--log-junit storage/framework/testing/c3-junit.xml`, que ya está ignorado.
- **El `.env` local manda en el locale:** `phpunit.xml` no fija `APP_LOCALE`. Si tu `.env` local está en inglés, corre la suite con `sail exec -e APP_LOCALE=es laravel.test php vendor/bin/pest`.
- **El email de más de 255 caracteres lo rechaza `max:255`**, no la regla `email`.

**Laravel, Larastan y migraciones**
- **El default de `status` solo existe en la base de datos.** Después de `create()`, devuelve `->refresh()` o `->status->value` falla.
- **Larastan tipa una columna enum como `string`.** Añade `@property ArtistStatus $status` en el modelo.
- **Las fechas se serializan con `…000000Z` por defecto.** Usa `toIso8601String()` en el Resource para obtener el offset `+00:00`.
- **`foreignUlid()` pasa Pint y `php -l`**, pero PostgreSQL rechaza la FK contra un `uuid`. Usa `foreignUuid()`.
- **`make:request` crea `authorize()` devolviendo `false`**, lo que da 403 a todo. Aquí la autorización vive en `can:` de la ruta.
- **`make:migration … --no-interaction` en fish** pega la flag al nombre del archivo. Pon las flags delante.
- **Un `use` olvidado en el controlador** da un 500 `Class "App\Http\Controllers\…" does not exist` que parece un problema de rutas.
- **`lang/es/validation.php` con una línea en blanco antes de `<?php`** da un error fatal de `strict_types`.
- **Las restricciones sin nombre** las nombra PostgreSQL (`…_check1`). Ponles nombre explícito para poder traducirlas a 422 de forma estable.
- **`EXCLUDE … WHERE`** no se puede escribir con el Schema Builder: va con `DB::statement`.

**Entorno**
- **Caché de PHPStan con dueño root:** se arregla con `docker compose exec -u root laravel.test rm -rf /tmp/phpstan`.
- **El aviso `fopen(.../pest/.temp/test-run-history)` es inofensivo.**
- **Docker falla con `operation not supported` al crear los `veth`** si el kernel se actualizó sin reiniciar. Reinicia.
- **Sail ocupa el puerto 5173** (`VITE_PORT`). En local, pon `VITE_PORT=5175` en `backend/.env`.
- **La API local escucha en el puerto 80**, no en el 8000 de `APP_URL`. El frontend local necesita `VITE_API_BASE_URL=http://localhost`.
- **`frontend/.env` puede apuntar a staging.** Revísalo antes de probar en local.
- **La base de datos de desarrollo de Sail está vacía** (los tests usan `RefreshDatabase`). Para probar DDL hay que crear los esquemas dentro de la transacción revertida.
- **`.php-cs-fixer.cache`** se regenera solo y no se commitea.

**Git, GitHub y CI**
- **El workflow del backend no corre con un push a una rama feature.** Para tener evidencia de CI en rojo, abre un PR en draft hacia `develop`.
- **Token de `gh` inválido:** `gh auth login --web` y después `gh auth setup-git`.
- **No reutilices `origin/feature/TS-19-backend-ci`.** Es una rama antigua de CI, no la de HU-08.

## 5. Drift: estado al cerrar v20

| Drift | Dueño | Estado en v20 |
|---|---|---|
| `backend/CLAUDE.md` §6 con los vetos de S1 | El raíz manda | Resuelto en v13 (remite al raíz §5) |
| `tests/Pest.php` decía que `RefreshDatabase` estaba apagado | Tests | Resuelto en v14 (A5) |
| `MeEndpointTest.php` con un comentario de S1 sobre la base de datos | Tests | Pendiente (v13); sigue siendo cierto para `/me` |
| Spec HU-05 §5 sugiere `mb_strtolower`, el código usa `lower(?)` | Spec HU-05 | Pendiente (v14), no rompe el contrato |
| `PLANTILLA-HANDOFF.md`: «no se sobrescribe» frente a ampliar v14 | Plantilla | Pendiente (v14) |
| `docs/rbac-matrix.md` aparece en `CLAUDE.md` §3 pero no existe; la matriz vive en D8.1 | `CLAUDE.md` raíz | Pendiente (v15) |
| La tesis mantiene el límite de 30 min en RF-02 | Tesis (`TS-46`) | Pendiente (v15) |
| Casilla `ts-08.10` sin marcar en Jira | Jira | Pendiente (v17, v18) |
| `ts-04.03` en Jira pide sobrescribir `unauthenticated()` | Jira | Pendiente (v11, heredado de v1–v10) |
| `artistSchema` (de la respuesta) existe pero no se ejecuta | Frontend HU-05 | Observación sin resolver (v16) |
| Falta `graphify-out/graph.json` | Herramientas | Pendiente (v11, v13, v17) |

El drift pendiente de v1–v10 sigue registrado en [`HANDOFF_v1-v10_consolidado.md`](HANDOFF_v1-v10_consolidado.md) §5.

## 6. Bloqueos y pendientes al cerrar v20

- **Siguen ABIERTOS en el ADR:** 8.5 rate limiting, **9.2 migraciones en el deploy**, 9.4 rollback y 11.5 medición de RNF. El 9.2 no bloquea el Green en local, pero sí la evidencia de las migraciones en staging. No se sabe si la de `artists` llegó a ejecutarse en staging (v16).
- **PR e integración:**
  - Frontend de `TS-16` hacia `develop`.
  - `TS-49` (corte 3 del ADR y cierre de `ts-38.09`).
  - Backend de `TS-19`.
- **TS-15:** `ts-04.10` (usuarios sintéticos en Auth0, lo hace el equipo) y `ts-04.09` (integración y comprobación en staging).
- **TS-19:** `ts-08.05` en adelante (frontend). Marcar `ts-08.01`..`ts-08.04` en Jira.
- **D8.1:** faltan las filas de `productions`, `songs`, `versions`, `comments` y `studio_sessions`. Salen de la sección «Autorización» de cada entidad del ERD.
- **Dependencias:** `npm ci` avisaba de 11 problemas (`TS-55`).
- **Opcional:** rotar `AUTH0_CLIENT_SECRET`, que apareció en una salida local (no en el repo, v16).
- **Staging:** comprobar que el 422 sale en español. Railway no define `APP_LOCALE`, así que vale el valor por defecto.

## 7. Próximos pasos (tal como quedaron en v20)

1. Commits atómicos de TS-19, push y PR hacia `develop` con CI en verde.
2. Actualizar Jira: `ts-08.03` y `ts-08.04` completos; TS-19 sigue en curso.
3. Decidir 9.2 antes de demostrar la migración en staging. Después, probar el CRUD con el productor y el rechazo con el rol artista.
4. `ts-08.05` (spec frontend de HU-08), o TS-17 donde no dependa de producciones.

## 8. Cómo retomar el entorno (referencia de v11–v20)

```fish
cd backend
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate                 # la base local puede estar vacía
./vendor/bin/sail pint --test
./vendor/bin/sail php vendor/bin/phpstan analyse --no-progress --memory-limit=2G
./vendor/bin/sail exec -e APP_LOCALE=es laravel.test php vendor/bin/pest
```

- **Frontend contra el backend local:** `VITE_API_BASE_URL=http://localhost` en `frontend/.env` y `VITE_PORT=5175` en `backend/.env`. Después, `npm run dev`.
- **Verificación del frontend:** `npm test; npx tsc -b; npm run lint; npm run format:check`.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. **La próxima consolidación toca al cerrar v30 y cubre v21–v30.**
