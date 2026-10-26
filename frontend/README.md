# Track Studio — Frontend

SPA en React 19 + TypeScript + Vite. Usa TanStack Query para el estado del servidor, React Hook Form + Zod para los formularios y Tailwind + shadcn/ui (estilo `base-nova`). La autenticación va con `@auth0/auth0-react`.

Las versiones exactas están en D2.1 del [ADR](../docs/adr/decisiones-tecnicas-track-studio.md) y en `package-lock.json`. Las reglas de la capa están en [`CLAUDE.md`](CLAUDE.md).

## Requisitos

- **Node 24.22.1**, fijado en [`.nvmrc`](../.nvmrc) en la raíz. `engines` exige `>=24.22.1 <25`.
- npm (el lockfile manda: `npm ci`).
- El backend levantado en local: ver [`backend/README.md`](../backend/README.md).

## Primer arranque

```bash
nvm install && nvm use          # lee .nvmrc
cd frontend
npm ci
cp .env.example .env            # rellenar los valores de Auth0
npm run dev                     # http://localhost:5173
```

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm test               # Vitest
npm run lint           # ESLint
npm run format:check   # Prettier, sin modificar
npm run format         # Prettier, arregla
npm run build          # tsc -b + vite build
```

Antes de pedir un commit tiene que pasar la cadena de calidad: `format:check`, `lint`, `test` y `build` en verde.

## Variables de entorno

[`.env.example`](.env.example) tiene todos los nombres:

| Variable                                     | Para qué                                                |
| -------------------------------------------- | ------------------------------------------------------- |
| `VITE_AUTH0_DOMAIN` · `VITE_AUTH0_CLIENT_ID` | Tenant y aplicación SPA de Auth0                        |
| `VITE_AUTH0_AUDIENCE`                        | API de Auth0 (la misma que valida el backend)           |
| `VITE_AUTH0_ROLE_CLAIM`                      | Claim de roles: `https://trackstudio.site/roles`        |
| `VITE_API_BASE_URL`                          | URL de la API (`http://localhost` contra Sail en local) |

Todo lo que lleva el prefijo `VITE_` acaba dentro del bundle público. Nunca pongas secretos ahí.

## CI y despliegue

- CI: [`.github/workflows/frontend-ci.yml`](../.github/workflows/frontend-ci.yml) corre Prettier, ESLint, Vitest y el build con la versión de `.nvmrc`.
- Despliegue: Vercel (staging en `trackstudio-staging.vercel.app`). El rollback está en el [runbook](../docs/global/runbook-mantenimiento.md).
