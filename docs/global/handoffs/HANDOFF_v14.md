# Handoff v14 — Track Studio

**Fecha:** 2026-10-05 · **Sprint:** 2 · **Capa(s):** backend
**Foco de la sesión:** Green guiado de `TS-16` (HU-05, `ts-05.03`), archivo por archivo, y review con mutaciones C3 (`ts-05.04`). El backend de TS-16 queda cerrado.

> Continúa [`HANDOFF_v13.md`](HANDOFF_v13.md). Rama: `feature/TS-16-registrar-editar-artistas`. Este handoff se **amplió en la misma fecha** con la segunda mitad de la sesión (pasos 4–7, cierre de Green y review). El humano hizo todas las escrituras de git.

## 1. Resumen ejecutivo

El backend de `TS-16` (`ts-05.01` a `ts-05.04`) está **terminado**. La spec está aprobada, los tests salieron en rojo, el Green está completo y la cadena de calidad pasa: `pint --test` PASS, PHPStan nivel 5 `[OK]` y `pest` **128 tests, 127 verdes y 1 omitido** (el de `AUTH0_TEST_ACCESS_TOKEN`, que ya existía). En el review, las **26 mutaciones C3 pusieron en rojo el test que les tocaba**. Queda un hallazgo esperando decisión del humano (A4, mensajes en inglés). Lo siguiente es la spec del frontend (`ts-05.05`).

## 2. Qué se hizo

**Commits de la rama** (los hizo el humano):

| Commit | Contenido |
|---|---|
| `3b1b6e7` | `test(backend)`: los tests de TS-16 en rojo (`ts-05.02`). |
| `ea75a43` | Green parcial: migración de índices, `ArtistPolicy`, rutas, `UniqueArtistName`, Form Requests, esqueleto del controlador y la primera versión de este handoff. |
| `73f062f` | Green final: `ArtistService`, `ArtistResource`, cuerpo de `ArtistController` y PHPDoc `@property ArtistStatus $status` en `Artist`. |
| `6822d22` | `test(backend)`: comentario de `RefreshDatabase` en `tests/Pest.php` (hallazgo A5). |

**Green (orden de la spec §5), todo ✅:**

| # | Archivo(s) | Evidencia |
|---|---|---|
| 1 | `database/migrations/2026_10_04_230629_add_unique_name_and_email_indexes_to_artists_table.php` | `MinimumSchemaTest` 8/8 |
| 2 | `ArtistPolicy`, `routes/api.php`, esqueleto de `ArtistController` | Inventario de rutas + 401/403/404 |
| 3 | `UniqueArtistName`, `StoreArtistRequest` | 16 verdes / 9 rojos esperados (200 en lugar de 201) |
| 4 | `UpdateArtistRequest` (hereda de `StoreArtistRequest` y sobrescribe `ignoredArtistId()`) | 10 rojos / 35 verdes, todos por el motivo esperado |
| 5 | `app/Services/ArtistService.php` | PHPStan `[OK]` |
| 6 | `app/Http/Resources/ArtistResource.php` | PHPStan `[OK]` (después de arreglar el PHPDoc del modelo, §4) |
| 7 | Cuerpo de `ArtistController` (`store` → 201, `show`/`update` → 200) | 60/60 en los archivos de artistas; suite completa 127 + 1 omitido |

**Review `ts-05.04`, mutaciones C3:** cada mutación se aplicó sola, se corrió Pest con `--log-junit` y el archivo se restauró desde una copia, sin usar git. Al terminar, `git diff` solo mostraba el cambio de A5. Relación entre mutaciones y tests de la spec §4:

| Mutación | Rojo | Spec |
|---|---|---|
| Alta devuelve 200 | 9 tests del alta | #1 |
| `created_by` en el Resource | alta, consulta y edición | #1, #14 |
| `$request->all()` + spread en el Service (alta) | `ignora los campos…` | #3 |
| `$request->all()` + `update($datos)` (edición) | `no modifica estado…` | #21 |
| El Service fija `invitation_token` | `no emite invitación` | #4 |
| `create` en vez de `firstOrCreate` | `reutiliza la fila…` ×2 | #6 |
| `created_by` de otro usuario | `enlaza created_by…` | #5 |
| La edición no guarda | `edita nombre y email…` | #17 |
| Sin `->refresh()` | 9 tests del alta | (trampa §4) |
| Sin `ignore` del propio artista | `permite conservar…` ×2 (+12) | #18 |
| Sin pasar el email a minúsculas | `guarda en minúsculas`, email duplicado, email ajeno | #9, #10 |
| Nombre comparado de forma literal | nombre duplicado, nombre ajeno | #8, #19 |
| Contar los borrados (`withoutTrashed` / `withTrashed`) | `permite reutilizar… borrado` | #11 |
| Quitar `max:255` / `required` | ese caso del dataset, en alta y edición | #7, #20 |
| Quitar la unicidad del email | email duplicado, email ajeno | #9, #19 |
| Quitar `whereUuid` (consulta / edición) | `id que no es uuid` | #15, #22 |
| La Policy permite cualquier rol | los tres 403 | #13, #16, #23 |
| Quitar `auth:auth0-api` / `can:create` del alta | 401/403 + inventario | #12, #13, #25 |
| Índice sin `WHERE` / sin `lower(email)` | `MinimumSchemaTest` | #24 |
| `forceCreate` con el `id` del cliente | `genera el identificador UUID…` | #2 |

**Sin mutar por separado (justificado):** el 401 de consulta y edición, y la variante `withTrashed()` del #15. Usan el mismo patrón de middleware y binding que sí se mutó, y `ApiRouteProtectionTest` vigila el inventario de las tres rutas.

## 3. Decisiones tomadas en esta sesión

- **Tipo de `status` para Larastan:** se resolvió con `@property ArtistStatus $status` en el modelo y no con un `instanceof` en el Resource. `status` es NOT NULL con default, así que una rama defensiva quedaría muerta y sin test.
- **Acotar el usuario en `store`:** `$request->user()` se acota con `instanceof StatelessUserContract`. Si no lo es, se lanza `AuthenticationException`, que el manejador central convierte en 401 D3.1. Se descartó el `@var`.
- **`updateArtist` elige `name` y `email` explícitamente**, aunque reciba `validated()`. Así hay dos defensas contra el mass assignment, y las mutaciones C3 #3/#21 tienen que tumbar las dos.
- **Hallazgos aceptados con justificación (A1, A3, A6):**
  - A1: `registerArtist` no usa transacción. El JIT es idempotente.
  - A3: `UniqueArtistName` usa `lower(?)` en SQL, la misma función que el índice.
  - A6: el `$artist` de la Policy no se usa, pero Laravel lo necesita en la firma de `can:view,artist`.
- **A5 arreglado:** `tests/Pest.php:31` ya no dice que `RefreshDatabase` sigue apagado. Ahora lo declara cada archivo con `uses()`.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`make:migration … --no-interaction` en fish** deja `--no-interaction` pegado al nombre del archivo. Pon las flags **antes** del nombre.
- **El stub de `make:request` trae `authorize()` en `false`**, lo que da 403 a todo. Se cambió a `true` porque la autorización vive en el `can:` de la ruta.
- **Un `use` olvidado en el controlador** da `Class "App\Http\Controllers\StoreArtistRequest" does not exist` (500). Parece un problema de rutas, pero no lo es.
- **Las rutas necesitan que el controlador exista** (con `Artist $artist` tipado) para que funcionen el inventario y el route model binding.
- **`StoreArtistRequest` dejó de ser `final`** para que `UpdateArtistRequest` herede sus reglas.
- **El default de `status` solo existe en la base de datos.** Después de `Artist::create()`, la instancia en memoria no tiene `status` y `->status->value` revienta. Hay que devolver `->refresh()`. La mutación sin `refresh()` lo confirmó: 9 rojos con 500.
- **Larastan tipa `$status` como `string`**, porque toma el tipo de la columna de la migración y no aplica el cast `ArtistStatus`. Da `Cannot access property $value on string`. Se arregla con `@property ArtistStatus $status` en el modelo.
- **PHPDoc y atributos:** el docblock de clase se coloca **encima** de `#[Fillable]`, no entre el atributo y `class`. No se comprobó si la otra posición falla, pero se movió por precaución y por convención antes del análisis que dio `[OK]`.
- **Caché de PHPStan con dueño `root`:** `Internal error: Could not write data to cache file /tmp/phpstan/…`. Una carpeta de la caché, creada el 2026-10-02, era de `root`. Arreglo, ejecutado desde `backend/`:
  ```fish
  docker compose exec -u root laravel.test rm -rf /tmp/phpstan
  ```
  Los avisos `WWWGROUP`/`WWWUSER` de `docker compose` directo son inofensivos con `exec`.
- **`PHP Warning: fopen(.../pestphp/pest/.temp/test-run-history): Permission denied`** sale en cada corrida y es inofensivo (permisos de `vendor` en el contenedor).
- **Una mutación C3 de mass assignment no se pone roja si solo cambias el controlador**, porque el Service vuelve a filtrar. Hay que mutar las dos capas.
- **Pest en modo agente** devuelve un JSON resumido que no trae los nombres de los tests rojos. Para el review se usó `--log-junit storage/framework/testing/c3-junit.xml`, una ruta que ya ignora `.gitignore`.

## 5. Drift detectado

- **Spec HU-05 §5** sugiere `mb_strtolower` en PHP para la unicidad del nombre, y la implementación usa `lower(?)` en SQL. **No es drift de contrato**, porque §5 dice «por ejemplo». Si se quiere una sola versión, conviene actualizar la nota de §5 para que mencione `lower(?)` (dueño: la spec).
- **`PLANTILLA-HANDOFF.md`:** la línea 3 dice que el handoff anterior «no se sobrescribe», pero en esta sesión el humano pidió ampliar v14 en lugar de crear v15. Además, la regla 9 (consolidar cada 10 handoffs) no se había cumplido. Ver §6.

## 6. Bloqueos y pendientes

- **A4, pendiente de decisión del humano:** los mensajes de validación salen en inglés (`APP_LOCALE=en`, no existe `lang/`) y chocan con `nomenclatura.md` §1. Propuesta: una tarea aparte en Jira para `lang/es` y `APP_LOCALE=es`. Está fuera del alcance de HU-05.
- **A2, aceptado y vigilado:** hay una carrera entre validar e insertar. Dos altas simultáneas con el mismo nombre o email: el índice rechaza la segunda con `QueryException` y sale un **500**, no un 422. Hoy hay un solo productor (D8.1). Si HU-06/07 abren escrituras concurrentes, hay que traducir la violación única a 422.
- **Regla 9 de la plantilla, cumplida con retraso:** se creó [`HANDOFF_v1-v10_consolidado.md`](HANDOFF_v1-v10_consolidado.md). Los originales v1–v10 se conservan. La próxima consolidación toca al cerrar v20 (v11–v20).
- Los puntos abiertos del ADR siguen igual (ver `CLAUDE.md` §1): 9.2, 9.4, 11.5 y 8.5. Ninguno bloquea TS-16.

## 7. Próximos pasos

1. El humano decide A4.
2. Spec del frontend de HU-05 (`ts-05.05`) en `docs/specs/frontend/HU-05.md`.
3. Tests del frontend en rojo y luego el Green guiado, con el mismo ritual.
4. Antes del PR de TS-16, revisar si la nota de la spec §5 se ajusta (drift §5) y mover la HU en Jira.

## 8. Cómo retomar el entorno

Sin cambios respecto a v13. Sail se levanta con `cd backend && ./vendor/bin/sail up -d`. Si PHPStan falla al escribir la caché, mira §4.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
