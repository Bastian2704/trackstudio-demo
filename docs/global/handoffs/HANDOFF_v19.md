# Handoff v19 — Track Studio

**Fecha:** 2026-10-07 · **Sprint:** 2 · **Capa(s):** backend / documentación
**Foco de la sesión:** avanzar `ts-08.03` de TS-19 hasta dejar en verde la persistencia y las relaciones de `productions`.

> Continúa [`HANDOFF_v18.md`](HANDOFF_v18.md). Rama observada: `feature/TS-19-productions-crud`. El humano escribió el código de aplicación; el agente lo guio y auditó. El agente no ejecutó escrituras de Git.

## 1. Resumen ejecutivo

El primer bloque Green de TS-19 quedó funcional: enum, modelo, factory, relaciones y migración PostgreSQL de `productions`. Los tests focalizados de esquema y modelo pasan: **14 tests, 55 assertions**.

`ts-08.03` sigue en curso. Faltan Policy/rutas, Form Requests, Service, Resource/Controller y la cadena completa Pint → PHPStan → Pest antes de pasar a `ts-08.04`.

## 2. Qué se hizo

- Se creó `ProductionFormat`, backed enum con `sencillo`, `ep` y `album`.
- Se creó `Production` con `HasFactory`, `HasUuids`, `SoftDeletes`, fillable cerrado, cast de `format` y relación `artist()`.
- Se añadió `Artist::productions()`; el scope de `SoftDeletes` excluye por defecto las producciones borradas.
- Se creó `ProductionFactory` con Faker `es_ES`, artista relacionado, formato aleatorio y states `sencillo()`, `ep()` y `album()`.
- Se creó `2026_10_07_224548_create_productions_table.php` conforme a [`../../erd/modelo-sprint-2.md`](../../erd/modelo-sprint-2.md) §5:
  - UUID en PK/FK;
  - FK a `artists` sin cascada e índice explícito `productions_artist_id_index`;
  - `varchar(255)` para nombre y `varchar(10)` sin default para formato;
  - `timestamptz` no nullable para creación/actualización y soft delete nullable;
  - `CHECK` cerrado para los tres formatos;
  - índice único parcial `productions_artist_id_name_lower_unique`.

Archivos de aplicación actualmente modificados o sin seguimiento:

- `backend/app/Enums/ProductionFormat.php`
- `backend/app/Models/Production.php`
- `backend/app/Models/Artist.php`
- `backend/database/factories/ProductionFactory.php`
- `backend/database/migrations/2026_10_07_224548_create_productions_table.php`

## 3. Decisiones aplicadas en esta sesión

- `artist_id` usa `foreignUuid()`, no ULID, porque `artists.id` es PostgreSQL `uuid` (D6.1).
- La FK conserva la acción predeterminada `NO ACTION`; no hay cascada física (D4.5).
- El formato permanece como `varchar + CHECK`, no enum nativo de PostgreSQL (D4.6 y ERD §5.1.2).
- La unicidad del nombre se protege en base con `(artist_id, lower(name)) WHERE deleted_at IS NULL`; el recorte de espacios corresponde a la aplicación.
- Los timestamps se declararon individualmente con `timestampTz()` para cumplir `NOT NULL`; `deleted_at` usa `softDeletesTz()`.

No se abrió ni cerró una decisión del ADR.

## 4. Evidencia y estado de calidad

El humano reportó Pint y sintaxis PHP en verde para enum/modelos/factory. La migración pasó `php -l` y Pint; Pint corrigió una incidencia `new_with_parentheses`.

Comandos focalizados ejecutados con éxito:

```bash
sail pest tests/Feature/MinimumSchemaTest.php \
  --filter="crea productions con el contrato exacto aprobado"

sail pest \
  tests/Feature/MinimumSchemaTest.php \
  tests/Feature/ProductionModelTest.php
```

Resultado final focalizado: **14 passed, 55 assertions**. Esto demuestra columnas y nulabilidad exactas, FK sin cascada, `CHECK`, índices, unicidad parcial, cast y ambas relaciones.

Todavía no se ha ejecutado la cadena completa exigida para cerrar backend:

```bash
sail pint --test
sail php vendor/bin/phpstan analyse --no-progress --memory-limit=2G
APP_LOCALE=es sail pest
```

## 5. Trampas y hallazgos

### `foreignUlid()` era sintácticamente válido pero incompatible

La primera versión de la migración usó accidentalmente `foreignUlid('artist_id')`. Pint y `php -l` pasaron porque el método existe y el PHP era válido, pero PostgreSQL rechazó la FK: `artist_id` era `character` y `artists.id` era `uuid`.

`RefreshDatabase` sí estaba funcionando. Los 14 casos fallaban durante la migración, antes de entrar en los tests (`0 assertions`). Cambiar a `foreignUuid()` resolvió la causa.

### Ruido local que no debe entrar al commit

Hay un `.php-cs-fixer.cache` sin seguimiento en la raíz. Es regenerable y no debe añadirse al commit de TS-19.

### Push del RED todavía puede registrarse antes del commit Green

En el diagnóstico de esta sesión, `gh auth status` reportó inválido el token de `Cheboy04`, la rama no tenía upstream y no existía en remoto. El `HEAD` continúa en el commit RED `f9e79da`; los cambios Green están solo en el working tree. Por tanto, todavía es posible autenticar GitHub y subir ese `HEAD` antes de commitear el Green.

El workflow backend no corre por un `push` directo a una feature: escucha pushes a `main`/`develop` y pull requests hacia esas ramas. Para conservar evidencia CI roja hace falta un draft PR hacia `develop` mientras el remoto apunte a `f9e79da`.

## 6. Drift detectado

No se detectó drift entre la spec, el ERD, los tests y la implementación de persistencia.

El locale local sigue siendo una condición conocida de v18: para la suite completa usar `APP_LOCALE=es` mientras `.env` conserve inglés. No se modificó `.env`.

## 7. Bloqueos y pendientes

- `ts-08.03` no está terminado: solo están verdes persistencia y relaciones.
- D9.2 no bloquea el Green local, pero sí la demostración posterior de la migración en staging.
- Falta resolver la autenticación de GitHub si se quiere publicar el commit RED y abrir el draft PR.
- Antes del review final conviene comprobar el callback de `Schema::create` contra la convención de tipado del proyecto; actualmente no declara `: void`.

## 8. Próximos pasos

La siguiente sesión debe leer `CLAUDE.md`, `backend/CLAUDE.md`, la metodología, este handoff y [`../../specs/backend/HU-08.md`](../../specs/backend/HU-08.md), y continuar así:

1. Auditar brevemente el diff actual y no rehacer persistencia.
2. Implementar `ProductionPolicy` copiando el contrato de `ArtistPolicy`: `create`, `view`, `update` y `delete` solo para `Role::Productor`; el estado del artista no participa.
3. Registrar las cuatro rutas de §3.1 bajo `api/v1`, con middleware `auth:auth0-api`, `can:` exacto y `whereUuid('production')` en GET/PUT/DELETE.
4. Ejecutar primero `ApiRouteProtectionTest`; todavía se esperan fallos de controller/request si las rutas apuntan a clases aún ausentes, pero el inventario y middleware deben quedar correctos.
5. Continuar después con Form Requests → Service → Resource/Controller → suite completa.

## 9. Cómo retomar Git/GitHub

Estado al cerrar:

```text
branch: feature/TS-19-productions-crud
HEAD: f9e79da feat(backend): TS-19 Add backend Tests for production creation and artist connection
upstream: no configurado al diagnosticar
working tree: Green de persistencia sin commit + HANDOFF_v19.md + .php-cs-fixer.cache regenerable
```

Para publicar primero el RED, el humano puede ejecutar, antes de commitear el Green:

```bash
gh auth logout -h github.com -u Cheboy04
gh auth login -h github.com --git-protocol https --web
gh auth setup-git
gh auth status
git push -u origin feature/TS-19-productions-crud
gh pr create --draft --base develop --head feature/TS-19-productions-crud \
  --title "TS-19: Registrar, editar y eliminar producciones"
```

## 10. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
