# Matriz de integración de endpoints (TS-36, HU-25)

**Corte:** 2026-11-02, sobre `develop` en `682c2e0`. **Cubre:** `ts-25.s2.01` (artistas y producciones) y `ts-25.s3.01` (canciones y versiones).
**Cierre de la historia:** S6. Esta matriz es evidencia parcial; los criterios de aceptación viven en Jira.

## Cómo leerla

Cada fila es un endpoint de `/api/v1`. Los tests están en `backend/tests/Feature/` y corren en Backend CI contra PostgreSQL de servicio.

| Columna | Qué comprueba |
| --- | --- |
| 401 | Petición sin token: `UNAUTHENTICATED` |
| 403 | Identidad sin rol productor: `FORBIDDEN` |
| Éxito | Respuesta 2xx con su forma |
| 422 | Datos inválidos: `VALIDATION_ERROR` |
| 404 | Recurso inexistente o no disponible: `RESOURCE_NOT_FOUND` |
| Conflicto | Choque con el estado actual: unicidad o regla de negocio |

- **✔:** existe al menos un test para ese caso.
- **n/a:** el caso no aplica a ese endpoint.
- **Sin 409:** el catálogo D3.1 no tiene código de conflicto, así que los conflictos responden 422 `VALIDATION_ERROR`.

## S2: artistas y producciones

| Endpoint | Test | 401 | 403 | Éxito | 422 | 404 | Conflicto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /artists` | `ArtistStoreTest.php` | ✔ | ✔ | ✔ 201 | ✔ | n/a | ✔ nombre o email duplicado |
| `GET /artists` | `ArtistIndexTest.php` | ✔ | ✔ | ✔ 200 | n/a | n/a | n/a |
| `GET /artists/{artist}` | `ArtistShowTest.php` | ✔ | ✔ | ✔ 200 | n/a | ✔ | n/a |
| `PUT /artists/{artist}` | `ArtistUpdateTest.php` | ✔ | ✔ | ✔ 200 | ✔ | ✔ | ✔ nombre o email de otro artista |
| `PUT /artists/{artist}/status` | `ArtistStatusTest.php` | ✔ | ✔ | ✔ 200 | ✔ | ✔ | n/a: es idempotente |
| `POST /productions` | `ProductionStoreTest.php` | ✔ | ✔ | ✔ 201 | ✔ | n/a: artista inexistente da 422 | ✔ nombre duplicado, artista inactivo |
| `GET /productions/{production}` | `ProductionShowTest.php` | ✔ | ✔ | ✔ 200 | n/a | ✔ | n/a |
| `PUT /productions/{production}` | `ProductionUpdateTest.php` | ✔ | ✔ | ✔ 200 | ✔ | ✔ | ✔ nombre duplicado, formato que no admite las canciones vigentes |
| `DELETE /productions/{production}` | `ProductionDeleteTest.php` | ✔ | ✔ | ✔ 204 | n/a | ✔ | n/a |

## S3: canciones y versiones

| Endpoint | Test | 401 | 403 | Éxito | 422 | 404 | Conflicto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /productions/{production}/songs` | `SongStoreTest.php` | ✔ | ✔ | ✔ 201 | ✔ | ✔ | ✔ nombre duplicado, máximo del formato, artista inactivo |
| `GET /productions/{production}/songs` | `SongIndexTest.php` | ✔ | ✔ | ✔ 200 | n/a | ✔ | n/a |
| `GET /songs/{song}` | `SongShowTest.php` | ✔ | ✔ | ✔ 200 | n/a | ✔ | n/a |
| `PUT /songs/{song}` | `SongUpdateTest.php` | ✔ | ✔ | ✔ 200 | ✔ | ✔ | ✔ nombre duplicado |
| `DELETE /songs/{song}` | `SongDeleteTest.php` | ✔ | ✔ | ✔ 204 | n/a | ✔ | n/a |
| `POST /songs/{song}/versions` | `VersionStoreTest.php` | ✔ | ✔ | ✔ 201 | ✔ tipo y tamaño | ✔ | ✔ artista inactivo |

En `POST /songs/{song}/versions`, tipo y tamaño inválidos responden 422 y no 415/413 por decisión del equipo (`docs/specs/backend/HU-13.md` §3.3).

**Resultado:** los 15 endpoints tienen cubiertos todos los casos que les aplican.

## Control común de rutas

`ApiRouteProtectionTest.php` compara el inventario completo de rutas con sus controles `auth:` y `can:`, y falla si aparece una ruta sin clasificar. También exige UUID en las rutas parametrizadas de producciones y canciones.

## Fronteras reales

| Frontera | Qué se usa en los tests de la matriz | Dónde se prueba la frontera real |
| --- | --- | --- |
| PostgreSQL | Real, con las migraciones ejecutadas en CI | Backend CI |
| Auth0 | Identidad simulada con `impersonarToken()` | `TokenVerificationTest.php` verifica tokens firmados en local. El test con un token real de Auth0 está omitido en CI |
| S3 | Doble de `AudioStorageContract` | `tests/Unit/S3AudioStorageTest.php` firma con el SDK real, sin red. La subida real queda en `ts-13.09` |

## Brechas

| # | Brecha | Efecto | Qué hacer |
| --- | --- | --- | --- |
| 1 | No hay una prueba de flujo completo entre endpoints: cada archivo ejerce uno | El segundo criterio de aceptación de HU-25 sigue abierto. Las cascadas se prueban, pero dentro de un solo endpoint | Previsto para S5 en el checklist de TS-36 |
| 2 | El test con un token real de Auth0 no corre en CI | Solo se ejecuta si el equipo define `AUTH0_TEST_ACCESS_TOKEN` | Mantener la comprobación manual; no se versiona ningún token |
| 3 | Ningún test automático sube a S3 de verdad | Una política o un CORS incorrectos no se detectan en CI | Lo cubre `ts-13.09`, pendiente del equipo |

Fuera de esta matriz:

- Los endpoints de S1 (`/health`, `/me`, `/rbac-check`), que tienen sus propios tests.
- El `429`, porque el rate limiting sigue `ABIERTO` (ADR 8.5).
- El 405 que sale como 500, que corresponde al registro de defectos de `TS-37`.

## Siguientes cortes

S4 añade los endpoints y las URLs firmadas. S5 añade los flujos completos. Este archivo se amplía en cada corte, sin reescribir los anteriores.
