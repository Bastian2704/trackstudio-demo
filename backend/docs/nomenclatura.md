# Nomenclatura — Backend (Track Studio)

Convenciones de **nombres y estructura** del código Laravel. Extiende D6.6 (que solo cubría objetos de base de datos) a clases, métodos, variables, constantes, enums, migraciones y tests.

---

## 0. Quién manda sobre qué (para no duplicar herramientas)

- **Pint** (preset `laravel`) manda sobre el **formato**: sangría, llaves, espacios, orden de imports, comas finales. **No se formatea a mano**; se corre `sail pint`.
- **Larastan** (nivel 5) manda sobre los **tipos**.
- **Este documento** manda sobre los **nombres y la estructura**: cómo se llama una clase, un método, una variable, un archivo de migración, un test.

Base normativa: **PER Coding Style** (php-fig; reemplaza a PSR-12) + el estilo opinado de Laravel que aplica Pint. PHP **8.4**.

---

## 1. Idioma de los identificadores

**Código en inglés. Contenido de cara al usuario en español.**

- **Inglés:** nombres de clases, métodos, variables, propiedades, columnas y tablas. Es coherente con el ERD del proyecto, que ya está en inglés (`songs`, `versions`, `production_access`, `song_id`, `version_number` — D6.7). Mezclar `ArtistaController` con la tabla `artists` sería inconsistente.
- **Español:** cadenas de cara al usuario, mensajes de validación visibles, **datos del seeder de dev/staging** (D6.8), y **descripciones de los tests** (el string de `it()`/`test()`), que sirven de documentación viva para la Sprint Review.
- **Comentarios/PHPDoc:** español, para que el equipo y el tribunal los lean con naturalidad. El *identificador* sigue en inglés; el *comentario* explica en español.

> Dominio ES↔EN para tener a mano: artista→`Artist`, producción→`Production`, canción→`Song`, versión→`Version`, comentario→`Comment`, sesión de estudio→`StudioSession`, acceso a producción→`ProductionAccess`, productor→`producer`/rol `productor`, artista (rol)→`artist`/rol `artista`.
> Nota: los **valores de los roles** en Auth0 son `productor` y `artista` (D4.8) — esos son datos, no identificadores de código, y se quedan como están.

---

## 2. Tabla de casing

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo de clase | `PascalCase.php`, una clase por archivo, nombre = clase | `ArtistService.php` |
| Clase / Interface / Enum / Trait | `PascalCase` | `StoreArtistRequest`, `AudioStorageContract` |
| Método | `camelCase` | `assignAccess()` |
| Variable / propiedad / parámetro | `camelCase` | `$productionAccess` |
| Constante de clase | `UPPER_SNAKE_CASE` | `const MAX_VERSIONS = 4;` |
| Caso de enum | `PascalCase` (PER-CS) | `case Album;` |
| Tabla / columna (BD) | `snake_case` (D6.6) | `production_access`, `version_number` |
| Ruta / URI | `kebab-case`, plural | `/api/v1/production-access` |
| Clave de config / `.env` | config `snake_case` · env `UPPER_SNAKE` | `config('auth0.roles_claim')` · `AUTH0_ROLES_CLAIM` |

---

## 3. Clases por tipo (sufijos de Laravel)

Una responsabilidad, un sufijo. El sufijo dice qué capa es (D4.4).

| Tipo | Convención | Ejemplo (dominio real) |
|---|---|---|
| Modelo Eloquent | singular, `PascalCase` | `Artist`, `Production`, `Song`, `Version`, `Comment`, `StudioSession`, `ProductionAccess` |
| Controller | `{Recurso}Controller` (recurso singular) | `ArtistController` |
| Form Request | `{Verbo}{Recurso}Request` | `StoreArtistRequest`, `UpdateProductionRequest` |
| API Resource | `{Recurso}Resource` | `ArtistResource` |
| Colección de Resource | `{Recurso}Collection` | `ArtistCollection` |
| Service | `{Recurso}Service` | `ArtistService` |
| Policy | `{Recurso}Policy` | `ProductionPolicy` |
| Middleware | `PascalCase` describiendo la acción | `EnsureTokenIsValid` |
| Enum | `{Concepto}` singular | `ProductionFormat`, `AccessStatus` |
| Contrato de frontera (D4.3) | `{Capacidad}Contract` | `AudioStorageContract`, `MailerContract`, `HashVerifierContract` |
| Excepción | `{Problema}Exception` | `AccessRevokedException` |

## 4. Métodos

- **camelCase**, verbo primero: `create()`, `assignAccess()`, `revokeAccess()`.
- **Controllers de recurso**: los verbos estándar de Laravel — `index`, `store`, `show`, `update`, `destroy`. No inventar `getArtists()` para un index.
- **Form Requests**: `authorize()` y `rules()` (nombres fijos del framework).
- **Services**: verbos de negocio del dominio (`grantProductionAccess()`, `addVersion()`), no CRUD anémico que solo reenvía a Eloquent.
- **Booleanos**: prefijo `is`/`has`/`can` — `isRevoked()`, `hasActiveAccess()`, `canComment()`.

## 5. Variables y propiedades

- `camelCase`, descriptivas; nada de `$a`, `$tmp`, `$data` a secas.
- Colecciones en **plural** (`$versions`), entidad única en **singular** (`$version`).
- Evitar abreviaturas salvo las universales del dominio (`url`, `id`).
- Propiedades inyectadas por constructor promotion: `private ArtistService $artists`.

## 6. Constantes y enums

- **Enums backed** para estados/formatos del dominio (D4.6), no strings mágicos ni constantes sueltas. Casos en `PascalCase`:

```php
enum ProductionFormat: string
{
    case Album = 'album';
    case Ep = 'ep';
    case Single = 'single';
}
```

- El **valor** backed (lo que va a la BD) en `snake_case`/minúscula; el **caso** en `PascalCase`.
- Constantes de clase en `UPPER_SNAKE_CASE`, solo para valores que no son un enum (`const MAX_VERSIONS = 4;`).

## 7. Migraciones

- **Nombre del archivo** = acción en `snake_case`, en inglés, verbo al inicio. Artisan antepone el timestamp:
  - Crear: `create_artists_table`, `create_production_access_table`.
  - Alterar: `add_auth0_sub_to_users_table`, `add_revoked_at_to_production_access_table`.
- **Una intención por migración.** No mezclar crear tabla A y alterar tabla B en el mismo archivo.
- **Nombres de objetos de BD** (tablas, columnas, FKs, índices, únicos): gobernados por **D6.6/D6.7**, no aquí. Recordatorio de lo que aplica ya en Sprint 1:
  - Tablas plural `snake_case`; pivotes en singular y orden alfabético (`production_access`); columnas `snake_case`; FK `{singular}_id`; booleanos `is_`/`has_`.
  - PK/FK en UUID (`$table->uuid('id')->primary()` / `foreignUuid()`).
  - Índice explícito en cada FK. Únicos de negocio y el único parcial de `production_access` según D6.7.
- **Nada de `ON DELETE CASCADE`**: la cascada es explícita en el Service (D4.5). En la migración, las FKs no llevan cascada de borrado.

## 8. Tests (Pest)

- **Ubicación**: `tests/Feature/` (endpoints, RBAC, integración) y `tests/Unit/` (Services, Form Requests aislados). Colocar el test junto a lo que prueba conceptualmente.
- **Archivo**: `{SujetoDePrueba}Test.php` en `PascalCase` — `RbacTest.php`, `ErrorShapeTest.php`, `ArtistServiceTest.php`.
- **Descripción del caso** (el string de `it()`/`test()`): **en español**, una frase que describe el comportamiento observable, no la implementación. Es documentación viva para el review.

```php
it('rechaza con 403 FORBIDDEN cuando un artista intenta escribir', function () { /* ... */ });
it('conserva el objeto S3 al hacer soft-delete de una versión', function () { /* ... */ });
```

- **Un comportamiento por test.** Si el nombre necesita un "y", probablemente son dos tests.
- **`describe()`** para agrupar por sujeto o escenario cuando un archivo crece.
- **Datasets** con clave descriptiva en español (`'sin token' => [...]`, `'rol artista' => [...]`), no índices numéricos.
- El test afirma la **forma** del resultado (JSON, campos, `code`), no solo el status — y se prueba en rojo (C3).

## 9. Interfaces de frontera (DIP, D4.3)

Solo en los límites externos del sistema. Sufijo `Contract`, con su implementación concreta nombrada por la tecnología:

- `AudioStorageContract` → `S3AudioStorage`
- `MailerContract` → `ResendMailer`
- `HashVerifierContract` → `Md5HashVerifier` / `Sha256HashVerifier`

No crear interfaces para el dominio propio (nada de `ArtistServiceInterface`): Eloquent directo desde los Services (D4.3).

---

## Fuentes

- **PER Coding Style** — php-fig.org/per/coding-style (estándar de estilo vigente; reemplaza PSR-12).
- **PHP 8.4** — php.net/releases/8.4 (enums backed, tipos, property hooks).
- **Laravel 13.x Docs** — convenciones de Eloquent, Form Requests, API Resources, Policies, Pint.
- **Pest Docs** — estructura de `it()`/`test()`, `describe()`, datasets.
- **ADR del proyecto** (`docs/adr/decisiones-tecnicas-track-studio.md`) — D3.2, D4.x, D6.6, D6.7, D6.8.
