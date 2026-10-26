# Track Studio

Plataforma web para gestionar producciones musicales: artistas, producciones, canciones y versiones de audio. Las versiones se suben directamente a S3. Es el proyecto de titulación del equipo, desarrollado con SCRUM y un ciclo SDD/TDD.

## Stack

| Capa        | Tecnología                                                       | Despliegue |
| ----------- | ---------------------------------------------------------------- | ---------- |
| `backend/`  | Laravel 13 · PHP 8.4 · PostgreSQL 18 · Pest · Sail (Docker)      | Railway    |
| `frontend/` | React 19 · TypeScript · Vite · TanStack Query · Tailwind/shadcn  | Vercel     |
| Servicios   | Auth0 (autenticación y roles) · AWS S3 `us-east-1` (audio)       | —          |

Las versiones exactas están fijadas en la decisión **D2.1** del [ADR](docs/adr/decisiones-tecnicas-track-studio.md).

## Estructura

```
/
├── backend/     API REST en Laravel (ver backend/README.md)
├── frontend/    SPA en React (ver frontend/README.md)
├── docs/        ADR, specs por historia, ERD, backlog, metodología y handoffs
└── .github/     CI por capa (backend-ci.yml, frontend-ci.yml)
```

Es un monorepo sin herramienta de workspaces: cada capa se instala y se prueba por separado.

## Arranque rápido

1. Backend: [`backend/README.md`](backend/README.md). Levanta la API en `http://localhost` (puerto 80, `APP_PORT`).
2. Frontend: [`frontend/README.md`](frontend/README.md). Levanta la SPA en `http://localhost:5173`.

Cada capa tiene su `.env.example`, con los nombres de las variables y sin valores reales.

## Cómo se trabaja

- **Metodología:** [`docs/global/metodologia-sdd-tdd.md`](docs/global/metodologia-sdd-tdd.md). Por cada historia se escribe la spec, después los tests en rojo, después el código hasta verde y al final se revisa.
- **Git:** [`docs/global/reglas-git.md`](docs/global/reglas-git.md). Ramas `feature/TS-<id>-<slug>` con base en `develop` y PR hacia `develop`.
- **Backlog:** las historias y sus criterios de aceptación viven en Jira (`TS-<id>`). La planificación por sprint está en [`docs/backlog/`](docs/backlog/).
- **Agentes de IA:** [`CLAUDE.md`](CLAUDE.md), más un `CLAUDE.md` por capa.

## Documentación

| Dónde                                                                                | Qué                                                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`docs/`](docs/) (este repo)                                                         | Lo que el código necesita cerca: ADR, specs, ERD, metodología y handoffs recientes |
| [`trackstudio-documentacion`](https://github.com/Cheboy04/trackstudio-documentacion) | Documentación de proyecto: tesis, revisiones y handoffs históricos                 |

## Seguridad

El repositorio es **público** (D2.2). Nunca se versionan secretos ni datos reales del cliente. `.env` está ignorado.
