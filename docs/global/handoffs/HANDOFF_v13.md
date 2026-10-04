# Handoff v13 — Track Studio

**Fecha:** 2026-10-04 · **Sprint:** 2 · **Capa(s):** backend / global
**Foco de la sesión:** arrancar `TS-16` (HU-05): spec backend aprobada (`ts-05.01`) y tests backend en rojo (`ts-05.02`).

> Continúa [`HANDOFF_v12.md`](HANDOFF_v12.md). Rama: `feature/TS-16-registrar-editar-artistas`, nacida de `develop` tras fusionar TS-60 (`3a8d7f8`). El agente no hizo escrituras de git ni tocó infraestructura ni Jira.

## 1. Resumen ejecutivo

La spec backend de HU-05 está aprobada y commiteada (`46c8804`). Los tests de `ts-05.02` están escritos y **vistos en rojo por la razón correcta**: 56 fallos, todos de rutas inexistentes, índices ausentes o inventario incompleto. Las otras 71 pruebas de la suite siguen en verde y hay 1 omitida preexistente (`TokenVerificationTest`). Pint está limpio sobre `tests/`. Lo siguiente es el Green humano (`ts-05.03`).

## 2. Qué se hizo

| Casilla | Estado | Evidencia |
|---|---|---|
| `ts-05.01` spec backend | Hecha | [`../../specs/backend/HU-05.md`](../../specs/backend/HU-05.md), aprobada el 2026-10-04. |
| `ts-05.02` tests en rojo | Hecha (falta commit) | `ArtistStoreTest`, `ArtistShowTest`, `ArtistUpdateTest`, `Datasets/Artistas.php`, helpers en `Pest.php`, ampliaciones en `MinimumSchemaTest` y `ApiRouteProtectionTest`. |
| `ts-05.03`–`ts-05.09` | Pendientes | Green humano, review C3, frontend, integración. |

Documentos tocados en `46c8804`:

- `docs/erd/modelo-sprint-2.md`: documento nuevo con los cambios de S2 sobre S1.
- `docs/erd/modelo-minimo-sprint-1.md`: queda cerrado; solo se le añadió un aviso que remite al de S2.
- ADR: D6.4 (nota del 2026-10-04), D6.7 y el «Estado del ERD».
- `backend/CLAUDE.md` §6: alineado con S2; ahora remite al raíz §5.
- `backend/docs/nomenclatura.md` §7.

## 3. Decisiones tomadas en esta sesión

- **Unicidad de `artists.name`/`artists.email`:** sin distinguir mayúsculas, solo entre artistas vigentes, y protegida con índices únicos parciales sobre `lower(...)`. Sustituye la afirmación de TS-54 de que el email «no se asume único». Dueño: `modelo-sprint-2.md` §2.1.
- **Duplicado → 422 `VALIDATION_ERROR`**, con `errors.<campo>`. No se añade código al catálogo D3.1.
- **El alta no emite invitación.** Los campos `invitation_*` quedan en NULL y la invitación nace en HU-20. Dueño: nota de D6.4.
- **`GET /api/v1/artists/{artist}` entra en HU-05, solo para el productor**, para precargar la edición. La vista del propio perfil del artista (D8.1) queda para su HU.
- **ERD por sprint:** el documento de S1 se congela y los cambios de S2 van a `modelo-sprint-2.md`, que prevalece donde lo modifica. El slice de `productions` (TS-49, `ts-08.10`) se añadirá ahí.
- **Provisión JIT del productor:** `firstOrCreate` por `auth0_sub`, solo en el alta y sin escribir email. Cierra lo que HU-04 §1 había diferido a «HU-05+».

## 4. Trampas y hallazgos

- **Los 404 nacían verdes.** Una ruta inexistente responde 404 `RESOURCE_NOT_FOUND`, igual que el route model binding. Por eso los tests #15/#22 llaman primero a `exigirRuta()` (en `tests/Pest.php`).
- **Id que no es UUID → 500.** Sin `whereUuid('artist')` en la ruta, PostgreSQL lanza `invalid input syntax for type uuid`. Lo cubre el caso «id que no es uuid».
- **Formato de fecha.** Laravel serializa `…000000Z` por defecto y la spec §3.5 exige `+00:00`, así que hay que usar `toIso8601String()` en el Resource.
- **Email > 255 verificado:** un local de 245 caracteres pasa la regla `email` (RFC con warnings) y solo `max:255` lo rechaza. Comprobado con tinker en Sail.
- **Kernel actualizado sin reiniciar.** Docker fallaba con `operation not supported` al crear los `veth` porque el sistema seguía en el kernel 7.2.8 y solo existían los módulos de 7.2.9. Se resolvió reiniciando.
- **Índices parciales en tests:** cada INSERT que debe fallar va dentro de `DB::transaction()`. Así se crea un savepoint y no se aborta la transacción de `RefreshDatabase`.

## 5. Drift detectado

- **Resuelto:** `backend/CLAUDE.md` §6 seguía con los vetos de S1 después de TS-60. Ahora remite al raíz §5.
- **Pendiente (no se tocó, para no salirse de la tarea):** `tests/Feature/MeEndpointTest.php` y `tests/Pest.php` todavía dicen en comentarios «RefreshDatabase sigue apagado» / «En Sprint 1 este endpoint NO toca la base de datos». Siguen siendo ciertos para `/me`, pero el de `Pest.php` ya no describe la suite completa.
- `graphify` sigue sin estar instalado (`graphify-out/` no existe). Se usó búsqueda dirigida.

## 6. Bloqueos y pendientes

- No hay ningún punto ABIERTO del ADR que bloquee TS-16. El 8.5 (rate limiting) es compatible y no bloquea.
- Marcar `ts-05.01` y `ts-05.02` en Jira. Es una acción humana, o la hace el agente si se le autoriza.

## 7. Próximos pasos

1. Commitear los tests de `ts-05.02`.
2. **Green humano (`ts-05.03`)**, siguiendo la spec §5:
   1. migración de los índices;
   2. `ArtistPolicy` y las rutas con `whereUuid`;
   3. `StoreArtistRequest` / `UpdateArtistRequest`;
   4. `ArtistService`;
   5. `ArtistResource` y `ArtistController`.

   La cadena de calidad, en este orden: `sail pint --test` → `sail php vendor/bin/phpstan analyse --memory-limit=2G` → `sail pest`.
3. Review del agente (`ts-05.04`) con las mutaciones C3 de la spec §4.
4. Spec frontend (`ts-05.05`). Solo depende de `ts-05.01`, así que puede ir en paralelo al Green.

## 8. Cómo retomar el entorno

Sin cambios respecto a v11. Si Docker falla al crear la red tras una actualización del kernel, reiniciar el equipo.

```bash
cd backend && ./vendor/bin/sail up -d && ./vendor/bin/sail pest
```

Referencia actual: 128 tests, 71 verdes, 56 rojos esperados y 1 omitido.
