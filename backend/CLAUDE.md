# CLAUDE.md — Capa Backend (Track Studio)

Claude Code carga este archivo **automáticamente cuando el trabajo ocurre en `backend/`**. Complementa el `CLAUDE.md` raíz (reglas duras, git, método SDD/TDD); aquí van las reglas propias del stack Laravel. **No repite el ADR:** las decisiones de arquitectura (D3.x, D4.x, D6.x) viven en `docs/adr/…` y aquí se referencian por número.

---

Precedencia sobre Laravel Boost

Este repo usa Laravel Boost como fuente de consulta, no como autoridad de comportamiento. El bloque <laravel-boost-guidelines> de más abajo lo genera Boost y se regenera con boost:install/boost:update; nunca se edita a mano.

Cuando el bloque de Boost contradiga este archivo, el CLAUDE.md raíz, o la metodología SDD/TDD, mandan los míos. Contradicciones conocidas y cómo se resuelven:

Pint: vale sail pint --test en la cadena de calidad (§2), es lo que corre el CI. Ignorar la instrucción de Boost de no usar --test.
Ejecución: Boost empuja a correr make:*, tinker y a crear archivos. Sigue vigente la regla dura §0.2 del raíz: el agente escribe spec + tests, no teclea código de aplicación ni corre generadores, salvo excepción puntual del humano.
Documentación: Boost dice "no crear docs salvo que lo pidan"; el método SDD exige specs y handoffs. Mandan specs y handoffs.
Memoria del agente

La memoria compartida del proyecto son los documentos versionados (specs en docs/specs/, ADR, handoffs) y el grafo de graphify para el código. No se usa el sistema .ai/rules / record-rule de Boost (desactivado por env var) — sería una segunda fuente de reglas que se contradice con el ADR. Tampoco memoria nativa por-máquina para reglas del proyecto.

Skills de Boost

Las skills de Boost (laravel-best-practices, testing-best-practices, etc.) son consulta on-demand, no reglas. Donde una skill choque con este archivo o con la metodología, manda este archivo. No correr infer-conventions: las convenciones del proyecto se deciden a mano (nomenclatura.md, ADR), no se infieren del código.

## 0. Baseline técnico (no asumir otras versiones)

| Componente         | Versión              | Nota                                                                                            |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------- |
| PHP                | **8.4** (contenedor) | El host puede tener 8.5; **el runtime es 8.4**, paridad con Railway. No usar features 8.5-only. |
| Laravel            | **13.x**             |                                                                                                 |
| PostgreSQL         | **18**               |                                                                                                 |
| Pest               | **5.x**              | Runner de pruebas (reemplaza PHPUnit como interfaz).                                            |
| Larastan / PHPStan | **nivel 5**          | Subir a 6 es cambio de una línea si se decide.                                                  |
| Pint               | preset `laravel`     | **Pint manda sobre el formato.** No formatear a mano.                                           |

- **Todo corre dentro de Sail** (Docker). El binario `pest`/`phpstan`/`pint` no existe en el host.
- **`declare(strict_types=1);`** en la primera línea de todo archivo PHP de la app. (Se puede automatizar activando la regla `declare_strict_types` en `pint.json`.)
- Al subir el contenedor de parche (p. ej. 8.4.24 → 8.4.25), actualizar `config.platform.php` en `composer.json` al mismo valor, o Composer falla la resolución.

## 1. Comandos (todo con `sail` delante)

```bash
./vendor/bin/sail up -d            # levantar entorno
./vendor/bin/sail pest             # correr pruebas
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G   # análisis estático
./vendor/bin/sail pint --test      # verificar formato (no modifica)
./vendor/bin/sail pint             # arreglar formato
./vendor/bin/sail artisan ...      # artisan
./vendor/bin/sail composer ...     # composer (install, nunca update — D2.1)
```

## 2. Cadena de calidad antes de pedir commit

Una tarea de backend no está lista para el bloque de git hasta que, **dentro del contenedor**, pasan en este orden (es el mismo orden del job de CI, T-11):

1. `sail pint --test` → sin diferencias de formato.
2. `sail php vendor/bin/phpstan analyse` → `[OK] No errors`.
3. `sail pest` → suite en verde, con los tests nuevos **probados en rojo** (compuerta C3 de la metodología).

## 3. Arquitectura en capas (referencia al ADR)

Flujo de un request (D3.1): `Middleware(JWT/claim) → Form Request → Controller → Policy → Service → Eloquent/Contratos → API Resource → JSON`.

| Regla                         | ADR      | En una línea                                                                                                                                                                                                  |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formato de error centralizado | **D3.1** | Todo error pasa por `bootstrap/app.php → withExceptions`. Ningún controlador formatea errores a mano. `code` en `SCREAMING_SNAKE_CASE`. En prod (`app.debug=false`) nunca se expone `getMessage()` de un 500. |
| Validación + 1ª autorización  | **D4.1** | En Form Requests dedicados, no en el controller.                                                                                                                                                              |
| Salida                        | **D4.2** | Siempre vía API Resources, filtrando campos por rol.                                                                                                                                                          |
| Sin Repository genérico       | **D4.3** | Eloquent directo desde Services. Interfaces (DIP) solo en fronteras externas: `AudioStorageContract`, `MailerContract`, `HashVerifierContract`.                                                               |
| Capas                         | **D4.4** | Controller delgado → Service (negocio) → Eloquent/Contratos → Resource.                                                                                                                                       |
| Borrado                       | **D4.5** | Soft deletes con cascada **explícita en el Service** (no `ON DELETE CASCADE`). Objetos S3 se conservan al soft-delete.                                                                                        |
| Enums                         | **D4.6** | Enums nativos backed, validados con `Rule::enum()`.                                                                                                                                                           |
| RBAC                          | **D4.8** | Rol desde el claim del JWT de Auth0 (`https://trackstudio.site/roles`). Middleware valida y extrae; autorización fina con Policies/Gates. Nunca se guardan credenciales en el backend.                        |
| Pruebas                       | **D4.7** | Pest. Cubrir Form Requests, Services (mock de interfaces externas) y endpoints (RBAC).                                                                                                                        |

## 4. Reglas de PHP 8.4

- **Tipos en todo**: parámetros, retornos y propiedades tipados. Es lo que hace útil a Larastan nivel 5.
- **Constructor property promotion** para dependencias inyectadas (`public function __construct(private ArtistService $artists) {}`).
- **Enums backed** para estados y formatos del dominio (D4.6), no constantes sueltas ni strings mágicos.
- **Property hooks y visibilidad asimétrica** (nuevas en 8.4) están **disponibles** y las entiende Larastan, pero no se fuerzan: úsalas solo donde eliminen boilerplate real (p. ej. una propiedad calculada o un valor de solo-lectura desde fuera). No conviertas el modelo de dominio en un festival de hooks.
- Inyección de dependencias por el contenedor; no `new` manual de Services dentro de controladores.

## 5. Base de datos (referencia al ADR)

- UUID en PK/FK (`HasUuids`, `foreignUuid()`) — **D6.1**.
- Persistencia en **UTC** (`timestamptz`, `timezone=UTC`); conversión a UTC-5 solo en presentación; fechas ISO 8601 con offset — **D3.2**.
- Nombres de tablas/columnas/índices — **D6.6/D6.7** (ver `backend/docs/nomenclatura.md` §migraciones).
- **`auth0_sub` en `users`: único e indexado** (clave de búsqueda por request; corrección registrada en el handoff de backend sobre una omisión de D6.7).
- Factories con Faker para todos los modelos; seeder de prod solo la cuenta real del productor; seeder de dev/staging con dataset **en español** y al menos una canción con cuatro versiones paralelas — **D6.8**.

## 6. Qué NO hacer todavía (backend) — vigente hasta cerrar el bloque 7 del ADR

- No tocar S3, subida de archivos ni presigned URLs.
- No crear migraciones de `productions`, `songs`, `versions`, `comments`, `studio_sessions`. En Sprint 1 **solo** `users`, `artists`, `production_access` (T-31).
- No implementar hash de integridad; **sí** se pueden **definir** las interfaces de frontera (`HashVerifierContract`).
- No construir lógica de los módulos funcionales más allá del endpoint de humo del Sprint 1.

## 7. Nomenclatura

Nombres de clases, métodos, variables, migraciones y tests: **`backend/docs/nomenclatura.md`**. Este archivo (CLAUDE.md) manda sobre _cómo trabajar_; ese, sobre _cómo nombrar_.

---

**Fuentes de los datos técnicos de este documento:** php.net (release 8.4); Laravel Docs 13.x (Pint); PER Coding Style (php-fig.org); handoff de backend del proyecto (versiones instaladas y verificadas).

**CLAUDE.md de laravel por defecto está en backend/CLAUDE_bk.md** Leelo la primera vez y mira si es importante mantenerlo
capaz contenga alguna instalación para agentes. después evaluar si es necesario eliminarlo.

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.4. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:

- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `vendor/bin/sail npm run build`, `vendor/bin/sail npm run dev`, or `vendor/bin/sail composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists (settled decisions, non-obvious traps, standing constraints). Framework and package guidelines that only apply to specific paths (testing, frontend, components) also live there, under `.ai/rules/boost` — this is not just recorded decisions, it is load-bearing guidance you have not seen inline. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.
- Record durable rules with `record-rule` so the next agent or teammate inherits them instead of working them out again. Pass a `glob` (e.g. `app/Http/Controllers/**`), a short `title`, and a few-line `note`. Always use `record-rule`, never your native memory or notes tool — native memory is personal and session-scoped; only `.ai/rules` is shared with the team and persists in the repo.

## Artisan

- Run Artisan commands directly via the command line (e.g., `vendor/bin/sail artisan route:list`). Use `vendor/bin/sail artisan list` to discover available commands and `vendor/bin/sail artisan [command] --help` to check parameters.
- Inspect routes with `vendor/bin/sail artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `vendor/bin/sail artisan config:show app.name`, `vendor/bin/sail artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `vendor/bin/sail artisan tinker --execute 'Your::code();'`
    - Double quotes for PHP strings inside: `vendor/bin/sail artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== sail rules ===

# Laravel Sail

- This project runs inside Laravel Sail's Docker containers. You MUST execute all commands through Sail.
- Start services using `vendor/bin/sail up -d` and stop them with `vendor/bin/sail stop`.
- Open the application in the browser by running `vendor/bin/sail open`.
- Always prefix PHP, Artisan, Composer, and Node commands with `vendor/bin/sail`. Examples:
    - Run Artisan Commands: `vendor/bin/sail artisan migrate`
    - Install Composer packages: `vendor/bin/sail composer install`
    - Execute Node commands: `vendor/bin/sail npm run dev`
    - Execute PHP scripts: `vendor/bin/sail php [script]`
- View all available Sail commands by running `vendor/bin/sail` without arguments.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `vendor/bin/sail artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `vendor/bin/sail artisan list` and check their parameters with `vendor/bin/sail artisan [command] --help`.
- If you're creating a generic PHP class, use `vendor/bin/sail artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `vendor/bin/sail artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `vendor/bin/sail artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `vendor/bin/sail npm run build` or ask the user to run `vendor/bin/sail npm run dev` or `vendor/bin/sail composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/sail bin pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/sail bin pint --test --format agent`, simply run `vendor/bin/sail bin pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `vendor/bin/sail artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `vendor/bin/sail artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/sail bin pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `vendor/bin/sail artisan test --compact`.

</laravel-boost-guidelines>
