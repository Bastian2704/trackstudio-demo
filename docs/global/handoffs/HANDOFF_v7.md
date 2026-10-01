# Handoff v7 — normalización Jira/docs y estado real de Sprint 1

**Fecha:** 2026-09-30 · **Sprint:** 1 · **Capa(s):** global / backend / frontend / gestión
**Foco:** reconciliar Jira, GitHub y documentos después de los PR #18-#20 y de la configuración de Sentry.

## 1. Resumen ejecutivo

Jira de MediHealth (`TS`, board 3) vuelve a ser la fuente de verdad. El Sprint 1 tiene objetivo explícito, las unidades futuras dejaron de contarse como terminadas y el trabajo parcial quedó separado. Se crearon los 46 enlaces `Blocks` definidos por el backlog y el enlace adicional `TS-51` bloquea `TS-15`. En el repo se corrigieron el formato de los dos `.env.example`, referencias activas al tablero anterior, el gate obsoleto del bloque 7 y las specs HU-03/HU-04.

No se ejecutó ninguna escritura Git ni se tocó infraestructura. Los cambios locales están sobre `develop` y necesitan una rama/PR humano.

## 2. Jira normalizado

| Ticket | Resultado |
| --- | --- |
| `TS-12` | Pendiente de Verificación hasta integrar la corrección de `.env.example`. |
| `TS-13` | Permanece Pendiente de Verificación; faltan runs rojos deliberados y prueba de autodeploy de ambos servicios. |
| `TS-42` | Por hacer y en backlog; `TS-50` solo cubre la preparación de AWS. |
| `TS-43` | Pendiente de Verificación por falta de evidencia no secreta de Resend. |
| `TS-44` | Por hacer y en backlog; producción sigue pendiente. |
| `TS-46` | En curso y en backlog como padre transversal. |
| `TS-49` | Padre del ERD completo en backlog; bloque 7 corregido como cerrado. |
| `TS-50` | Título corregido; permanece Listo como subtarea histórica de `TS-42`, actualmente fuera del sprint junto con su padre. |

Unidades creadas:

- `TS-51` — manejador centralizado de errores + Sentry, retrospectivo, **Listo**.
- `TS-52` — health check y uptime en staging, Task relacionada con `TS-44`, **Listo**.
- `TS-53` — evidencia SCRUM de Sprint 1 en la tesis, Task relacionada con `TS-46`, **Por hacer**.
- `TS-54` — modelo mínimo `users`/`artists` y decisión sobre `production_access`, Task relacionada con `TS-49`, **Por hacer**.

El 2026-09-30 se normalizaron `TS-52`..`TS-54` de Subtask a Task para mantener esos entregables en S1 sin reintroducir padres futuros. Los tres quedaron en el Sprint 1 con prioridad Medium y relación `Relates` hacia `TS-44`, `TS-46` y `TS-49`, respectivamente. `TS-52` conserva Listo; `TS-53/54`, Por hacer.

Objetivo del sprint registrado en Jira:

> Demostrar en staging, desplegado desde develop, CI verde, autenticación Auth0, validación JWT y un endpoint protegido por RBAC que responda 401/403/2xx según identidad y rol.

## 3. Evidencia verificada

- PR #18 (`TS-12`), #19 y #20 (`TS-13`) mergeados y con CI verde.
- Rulesets `protect-main` y `protect-develop`: PR obligatorio, 1 aprobación, checks `lint`, `static-analysis`, `test` y `build`, sin bypass, force-push ni borrado.
- Staging: frontend y `/up` responden 200; `/api/v1/health` responde `status=ok` con base de datos disponible.
- Sentry: `sail artisan sentry:test` envió el evento `baecb23568ef4c9abfb3312f09b9e40a`, visible en el proyecto.
- `origin/feature/TS-14-auth0-auth` está 3 commits adelante de `develop`: spec HU-03 normalizada, tests en rojo y `auth0/login` ^7 instalado. La fase Green sigue pendiente.

## 4. Trampas vigentes

1. En el Jira actual, `TS-27`, `TS-28` y `TS-29` son HU-16, HU-17 y HU-18. En ramas/commits/handoffs antiguos eran errores, JWT y `/me`. No reescribir historia; usar `TS-51` y `TS-14` hacia adelante.
2. `TS-13` no se cierra solo porque los endpoints estén vivos: debe probarse que un merge nuevo despliega automáticamente Railway y Vercel.
3. `TS-43` no se cierra publicando una API key o un correo real. La evidencia debe ser no secreta y usar un buzón sintético.
4. El bloque 7 del ADR está cerrado. Los gates vigentes para audio son ERD, alcance de sprint y `TS-42`.
5. La versión normalizada de `docs/specs/backend/HU-03.md` se reutilizó literalmente desde la rama remota de `TS-14`; al integrar ramas se conserva esa versión, sin reescribirla de nuevo.

## 5. Próximo orden de trabajo

1. Integrar esta normalización por un PR pequeño; verificar que el merge dispara ambos deploys y usar ese merge como evidencia de `TS-13 ts-02.07`.
2. Crear dos PR temporales/no fusionables, uno por capa, con un test roto deliberadamente; enlazar los runs rojos a `TS-13 ts-02.05` y cerrar los PR sin mergear.
3. Cambiar a `origin/feature/TS-14-auth0-auth`; traer `develop` y resolver cualquier cruce documental conservando la versión de HU-03 de la rama TS-14.
4. El humano implementa Green de `TS-14`; el agente revisa el diff, C3 y los gates Pint → PHPStan → Pest / Prettier → ESLint → tests → build.
5. Completar `TS-54`; después aprobar specs y ejecutar `TS-15`.
6. Completar `TS-53`, asignar responsable a `TS-15` y cerrar el Sprint 1 solo con evidencia. `TS-53` y `TS-54` ya están asignadas a Sebastian Abad.
