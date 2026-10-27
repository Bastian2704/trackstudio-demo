# Track Studio — Backend

API REST en Laravel 13 sobre PHP 8.4 y PostgreSQL 18. Todo corre dentro de **Sail** (Docker): `pest`, `pint` y `phpstan` no se ejecutan en el host.

Las versiones exactas están en D2.1 del [ADR](../docs/adr/decisiones-tecnicas-track-studio.md). Las reglas de la capa están en [`CLAUDE.md`](CLAUDE.md).

## Requisitos

- Docker con Compose.
- No hace falta PHP ni Composer en el host.

## Primer arranque

```bash
cd backend
cp .env.example .env            # rellenar los valores (ver «Variables de entorno»)

# Instalar vendor/ sin PHP en el host
docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html \
  laravelsail/php84-composer:latest composer install --ignore-platform-reqs

./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
```

La API queda en `http://localhost` (`GET /api/v1/health`). Sail publica el puerto `APP_PORT`, que por defecto es 80, no el 8000 de `APP_URL`. También ocupa el 5173 (`VITE_PORT`), que choca con `npm run dev` del frontend. En local, pon `VITE_PORT=5175` en `backend/.env`.

Después de cambiar el runtime (`sail build --no-cache`), basta con `sail up -d` y `sail composer install`.

## Comandos

```bash
./vendor/bin/sail up -d                                              # levantar
./vendor/bin/sail pest                                               # tests
./vendor/bin/sail pint --test                                        # formato (lo que corre el CI)
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G   # Larastan
./vendor/bin/sail artisan <comando>
./vendor/bin/sail composer install                                   # nunca `update` sin tarea
```

Antes de pedir un commit tiene que pasar la cadena de calidad: Pint, Larastan y Pest en verde.

## Variables de entorno

[`.env.example`](.env.example) tiene todos los nombres sin valores reales. Las propias del proyecto son:

| Variable                                                                            | Para qué                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| `AUTH0_DOMAIN` · `AUTH0_AUDIENCE` · `AUTH0_ROLES_CLAIM`                             | Validación del JWT de Auth0 y claim de roles (D4.8) |
| `AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · `AWS_DEFAULT_REGION` · `AWS_BUCKET` | Firma de subidas de audio a S3 (D7.x)               |
| `CORS_ALLOWED_ORIGINS`                                                              | Orígenes del frontend permitidos                    |
| `SENTRY_LARAVEL_DSN`                                                                | Reporte de errores                                  |

Los valores reales viven solo en el `.env` local y en Railway. Nunca en el repo.

## CI y despliegue

- CI: [`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml) corre Pint, Larastan y Pest contra PostgreSQL.
- Despliegue: Railway. Cada despliegue migra con `migrate --force`. El rollback está en el [runbook](../docs/global/runbook-mantenimiento.md).
