# Handoff v14 — Track Studio

**Fecha:** 2026-10-05 · **Sprint:** 2 · **Capa(s):** backend
**Foco de la sesión:** Green guiado de `TS-16` (HU-05), `ts-05.03`, archivo por archivo. El humano teclea y el agente guía y revisa.

> Continúa [`HANDOFF_v13.md`](HANDOFF_v13.md). Rama: `feature/TS-16-registrar-editar-artistas`. Último commit: `3b1b6e7` (los tests en rojo). El código de Green **todavía no está commiteado**. El agente no hizo escrituras de git.

## 1. Resumen ejecutivo

El Green de `ts-05.03` va por el **paso 4 de 7**. Los pasos 1–3 están verdes y revisados por el agente, sin hallazgos. El código del paso 4 (`UpdateArtistRequest`) ya está escrito, pero **está pendiente que el humano mande al agente la salida de los tests del paso 4** para validarlo antes del paso 5.

## 2. Estado del Green (orden de la spec §5)

| # | Archivo(s) | Estado | Evidencia |
|---|---|---|---|
| 1 | `database/migrations/2026_10_04_230629_add_unique_name_and_email_indexes_to_artists_table.php` | ✅ Verde | `MinimumSchemaTest`: 8/8. |
| 2 | `app/Policies/ArtistPolicy.php`, `routes/api.php`, esqueleto de `app/Http/Controllers/ArtistController.php` | ✅ Verde | Inventario de rutas + 401/403/404 de alta, consulta y edición: 25/25 con el filtro. |
| 3 | `app/Rules/UniqueArtistName.php`, `app/Http/Requests/StoreArtistRequest.php`, `store` usa `StoreArtistRequest` | ✅ Verde | `ArtistStoreTest`: 16 verdes y 9 rojos esperados (reciben 200 en vez de 201, porque `store` todavía no crea nada). |
| 4 | `app/Http/Requests/UpdateArtistRequest.php` (extiende `StoreArtistRequest` y sobrescribe `ignoredArtistId()`), `update` usa `UpdateArtistRequest` | ⏳ **Escrito, sin verificar** | **Pendiente:** que el humano corra `./vendor/bin/sail pest --filter="ArtistUpdateTest\|ArtistStoreTest"` y pegue la salida. |
| 5 | `app/Services/ArtistService.php` | Pendiente | — |
| 6 | `app/Http/Resources/ArtistResource.php` | Pendiente | — |
| 7 | Cuerpo de `ArtistController` (`store` → 201, `show` → 200, `update` → 200) | Pendiente | Pone en verde los 201/200 restantes. |

**Esperado al verificar el paso 4:**
- **`ArtistUpdateTest`, en verde:** los 9 casos de validación, los 2 de nombre/email ajeno, y los 404/401/403.
- **`ArtistUpdateTest`, en rojo:** `edita nombre y email y responde 200…`.
- **Verdes antes de tiempo:** `permite conservar el propio nombre y email` y `no modifica estado, creador…`. Solo comprueban el 200 y que la fila no cambie, así que un controlador vacío ya los cumple. No es una alarma: en el review (`ts-05.04`) se demuestra con C3 que sí detectan el fallo (quitando el `ignore` o pasando `$request->all()`).
- **`ArtistStoreTest`:** los mismos 16 verdes de antes. Si cae alguno, el cambio que hizo `StoreArtistRequest` heredable rompió el alta.

## 3. Guía de los pasos que faltan (resumen; el detalle está en la spec §3–§5)

- **Paso 5 — `ArtistService`:**
  - `registerArtist(StatelessUserContract|Authenticatable $productor, array $datos): Artist`:
    - resuelve el productor con `User::firstOrCreate(['auth0_sub' => $productor->getAuthIdentifier()])`, sin email;
    - crea el artista con `name`, `email` y `created_by`;
    - **no** fija `status` ni los campos de invitación.
  - `updateArtist(Artist $artista, array $datos): Artist` cambia solo `name` y `email`.
  - El servicio recibe **siempre** `validated()`, nunca `$request->all()`.
- **Paso 6 — `ArtistResource`:**
  - Expone exactamente `id`, `name`, `email`, `status` (su `->value`), `created_at` y `updated_at`.
  - Las fechas con `toIso8601String()`, porque el formato por defecto de Laravel (`…000000Z`) no cumple la spec.
  - Nunca expone `invitation_token`, `user_id` ni `created_by`.
- **Paso 7 — `ArtistController`:**
  - Inyecta `ArtistService` por constructor (constructor promotion).
  - `store` devuelve el Resource con `->response()->setStatusCode(201)`; `show` y `update` devuelven el Resource (200).
  - Al terminar, quita los `: void` y pon los tipos de retorno reales.
- **Cierre de Green:**
  1. `sail pint --test`
  2. `sail php vendor/bin/phpstan analyse --memory-limit=2G`
  3. `sail pest` completo

  Referencia: 128 tests, 127 verdes y 1 omitido preexistente.

## 4. Trampas de esta sesión

- **`make:migration … --no-interaction` en fish** dejó `--no-interaction` pegado al nombre del archivo. Se corrigió con `mv`. Para no repetirlo, poner las flags **antes** del nombre, o no usarlas en `make:*`.
- **El stub de `make:request` trae `authorize()` en `false`**, lo que daba 403 a todo. Se cambió a `true` con un comentario: la autorización vive en el `can:` de la ruta.
- **Un `use` olvidado en el controlador** dio `Class "App\Http\Controllers\StoreArtistRequest" does not exist` (500). El síntoma confunde porque parece un problema de rutas.
- **Las rutas necesitan que el controlador exista** (con `Artist $artist` tipado) para que el inventario y el route model binding funcionen. Por eso el paso 2 creó el esqueleto.
- **`StoreArtistRequest` dejó de ser `final`** para que la edición herede sus reglas sin duplicarlas. Lo único que cambia es `ignoredArtistId()`.
- **`PHP Warning: fopen(.../pestphp/pest/.temp/test-run-history): Permission denied`** sale en cada corrida y es inocuo: son permisos de `vendor` dentro del contenedor. No afecta a los resultados.

## 5. Hallazgos para el review (`ts-05.04`), aún no resueltos

1. **Los mensajes de validación salen en inglés**: `APP_LOCALE=en` y no existe `lang/`. Choca con `nomenclatura.md` §1, que pide textos de cara al usuario en español. **Fuera del alcance de la spec HU-05**: decidir si se abre una tarea aparte o se acepta por ahora. El mensaje propio de `UniqueArtistName` ya está en español.
2. **Pint en `ArtistPolicy`**: los parámetros partidos en varias líneas pueden reformatearse. Se comprueba con `pint --test` al cerrar Green.
3. **Comentario desactualizado en `tests/Pest.php`** («RefreshDatabase sigue apagado»), heredado de v13. Fuera de la tarea.

## 6. Próximos pasos (nuevo chat)

1. **El humano pega la salida de los tests del paso 4**, y el agente la valida contra lo esperado en §2.
2. Guiar los pasos 5 → 6 → 7, uno por turno, verificando cada uno con su filtro de Pest.
3. Cerrar Green con la cadena de calidad completa y entregar el bloque de commit de `ts-05.03`.
4. Review del agente con las mutaciones C3 de la spec §4 (`ts-05.04`).
5. Spec frontend (`ts-05.05`).

## 7. Entorno

Sin cambios respecto a v13. Sail arriba con `cd backend && ./vendor/bin/sail up -d`.
