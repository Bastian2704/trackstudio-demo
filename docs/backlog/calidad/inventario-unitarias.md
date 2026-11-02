# Inventario de componentes críticos y sus pruebas (TS-35, HU-24)

**Corte:** 2026-11-02, sobre `develop` en `9d1a017`. **Cubre:** `ts-24.s2.01` (artistas y producciones) y `ts-24.s3.01` (canciones y subida).
**Cierre de la historia:** S6. Este inventario es evidencia parcial; los criterios de aceptación viven en Jira.

## Criterio de «crítico»

Un componente entra si su fallo produce al menos uno de estos efectos:

- Salta un control de acceso.
- Deja datos incoherentes o rompe una regla de negocio.
- Rompe la subida a S3.

Quedan fuera los componentes de presentación y los controladores que solo delegan. La autenticación (S1) aparece solo como base de la que dependen estos módulos.

**Tipo de prueba:** *Unit* prueba el componente aislado. *Feature* lo ejerce a través del endpoint, con base de datos real. *Componente* lo renderiza con RTL y la API simulada.

## Estado en el pipeline

| Capa | Resultado | Ejecución en `develop` | Cómo corre |
| --- | --- | --- | --- |
| Backend | 400 pasan, 1 omitido (2085 aserciones) | Run `40552425521`, 2026-10-27 | `php artisan test` en Backend CI, con PostgreSQL de servicio |
| Frontend | 261 pasan en 23 archivos | Run `40918138164`, 2026-10-29 | `npm test` en Frontend CI |

El test omitido es `tests/Feature/TokenVerificationTest.php:111`: solo corre si se define `AUTH0_TEST_ACCESS_TOKEN` con un token real (HU-03 §4, test 24). El pipeline no lo define.

## Backend

Rutas relativas a `backend/`.

### Artistas y producciones (S2)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `app/Policies/ArtistPolicy.php` | Acceso de cada rol a artistas | `tests/Feature/ArtistStoreTest.php`, `ArtistIndexTest.php`, `ArtistShowTest.php`, `ArtistUpdateTest.php`, `ArtistStatusTest.php` | Feature |
| `app/Services/ArtistService.php` | Alta, edición y estado del artista; auditoría del cambio de estado | Los mismos, en especial `ArtistStatusTest.php` (reactivación e idempotencia) | Feature |
| `app/Rules/UniqueArtistName.php` | Nombre duplicado sin distinguir mayúsculas, reutilizable tras el borrado | `ArtistStoreTest.php`, `ArtistUpdateTest.php` | Feature |
| `app/Policies/ProductionPolicy.php` | Acceso de cada rol a producciones | `ProductionStoreTest.php`, `ProductionShowTest.php`, `ProductionUpdateTest.php`, `ProductionDeleteTest.php` | Feature |
| `app/Services/ProductionService.php` | Artista inactivo y borrado en cascada transaccional | `ProductionStoreTest.php`, `ProductionUpdateTest.php`, `ProductionDeleteTest.php` (cascada y atomicidad) | Feature |
| `app/Rules/UniqueProductionName.php` | Nombre único dentro del mismo artista | `ProductionStoreTest.php`, `ProductionUpdateTest.php` | Feature |
| `app/Enums/ProductionFormat.php` | Máximo de canciones por formato | `tests/Unit/ProductionFormatTest.php`, `ProductionUpdateTest.php` | Unit y Feature |

### Canciones y subida (S3)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `app/Policies/SongPolicy.php` | Acceso de cada rol a canciones | `SongStoreTest.php`, `SongIndexTest.php`, `SongShowTest.php`, `SongUpdateTest.php`, `SongDeleteTest.php` | Feature |
| `app/Services/SongService.php` | Máximo por formato, compactación de posiciones y cascada a versiones | `SongStoreTest.php`, `SongDeleteTest.php` (cascada y atomicidad) | Feature |
| `app/Rules/UniqueSongName.php` | Nombre único dentro de la producción | `SongStoreTest.php`, `SongUpdateTest.php` | Feature |
| `app/Policies/VersionPolicy.php` | Solo la identidad autorizada pide la firma | `VersionStoreTest.php` | Feature |
| `app/Services/VersionService.php` | Numeración bajo bloqueo, fila `pendiente` y sin fila si la firma falla | `VersionStoreTest.php` | Feature |
| `app/Storage/S3AudioStorage.php` | Condiciones de la política firmada (D7.6, D7.7) | `tests/Unit/S3AudioStorageTest.php`, con el SDK real y sin red | Unit |
| `app/Enums/AudioContentType.php` | Tipos admitidos y extensión del key | `VersionStoreTest.php` | Feature |

### Base transversal (S1)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `app/Auth/UserRepository.php` | Rol leído del claim del token | `tests/Unit/UserRepositoryTest.php` | Unit |
| `app/Enums/ErrorCode.php` | Catálogo de errores D3.1 | `tests/Unit/ErrorCodeTest.php`, `tests/Feature/ErrorShapeTest.php` | Unit y Feature |

## Frontend

Rutas relativas a `frontend/src/`.

### Artistas y producciones (S2)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `routes/artists/artistSchema.ts` | Validación del formulario de artista | `routes/artists/ArtistCreatePage.test.tsx`, `ArtistEditPage.test.tsx` | Componente |
| `routes/artists/ArtistEditPage.tsx` | Cambio de estado y errores de la API | `ArtistEditPage.test.tsx` | Componente |
| `routes/productions/productionSchema.ts` | Validación del formulario de producción | `routes/productions/ProductionCreatePage.test.tsx`, `ProductionEditPage.test.tsx` | Componente |
| `routes/productions/ProductionFormatNotice.tsx` | Aviso de mínimos y máximos por formato | `ProductionFormatNotice.test.tsx` | Componente |
| `routes/productions/ProductionEditPage.tsx` | Edición y borrado con confirmación | `ProductionEditPage.test.tsx` | Componente |

### Canciones y subida (S3)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `routes/songs/songSchema.ts` | Validación del formulario de canción | `routes/songs/SongCreatePage.test.tsx`, `SongEditPage.test.tsx` | Componente |
| `routes/songs/SongList.tsx` | Orden del servidor, borrado con confirmación y sin doble envío | `SongList.test.tsx` | Componente |
| `routes/versions/versionApi.ts` | POST a S3 sin el token y con los campos firmados | `routes/versions/VersionUpload.test.tsx`, con doble de `XMLHttpRequest` | Componente |
| `routes/versions/versionSchema.ts` | Tipo y tamaño antes de pedir la firma | `VersionUpload.test.tsx` | Componente |
| `routes/versions/VersionUpload.tsx` | Progreso, reintento con firma nueva y sin doble firma | `VersionUpload.test.tsx` | Componente |

### Base transversal (S1)

| Componente | Riesgo que cubre | Pruebas | Tipo |
| --- | --- | --- | --- |
| `lib/api.ts` | Token en cada petición y despacho de errores por `code` | `lib/api.test.ts` | Unit |
| `routes/RequireAuth.tsx` | Ruta privada sin sesión | `routes/RequireAuth.test.tsx` | Componente |
| `routes/RequireRole.tsx`, `hooks/useRole.ts` | Ruta de productor con otro rol | `routes/RequireRole.test.tsx` | Componente |

## Brechas

Ningún componente crítico quedó sin pruebas. Estas son las limitaciones de la cobertura actual:

| # | Brecha | Efecto | Qué hacer |
| --- | --- | --- | --- |
| 1 | No se mide la cobertura: Backend CI usa `coverage: none` y Frontend CI corre `npm test` sin cobertura | Este inventario relaciona componentes y pruebas, pero no da un porcentaje. El primer criterio de aceptación de HU-24 no tiene número | Decisión del equipo antes de S6: fijar si hace falta un umbral. Va en la línea de 11.5 |
| 2 | Policies y Services no tienen pruebas aisladas; se ejercen por Feature | Cubren el comportamiento real, pero un fallo señala el endpoint y no el componente | Aceptado: no se duplica lo que ya prueba cada Story. Se revisa en S6 |
| 3 | Los esquemas Zod del frontend no tienen pruebas directas | Se ejercen a través de los formularios | Aceptado por el mismo motivo |
| 4 | `S3AudioStorageTest.php` firma de forma local y `VersionStoreTest.php` usa un doble del contrato | Ningún test automático sube a S3 de verdad | Lo cubre `ts-13.09`, la comprobación en staging del equipo, que sigue pendiente |

## Siguientes cortes

S4 añade verificación e integridad de versiones. S5 y S6 completan la superficie. Este archivo se amplía en cada corte, sin reescribir los anteriores.
