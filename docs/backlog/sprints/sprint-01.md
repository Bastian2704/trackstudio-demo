# Sprint 1 - Backlog desglosado

**Estado:** baseline de planificación creada el 2026-09-22 y reconciliada con Jira el 2026-09-30. Jira manda sobre estado, checklist, sprint y criterios de aceptación; este archivo conserva el desglose y la trazabilidad.
**Ventana máxima:** 2026-09-21 a 2026-10-02. **Release:** R1 - Núcleo interno (MVP).
**Selección funcional:** `TS-12`..`TS-15` (16 SP) y `TS-40`. El hito mínimo del ERD está en `TS-54`; `TS-50`, `TS-51` y `TS-52` son trabajo completado trazado retrospectivamente; `TS-53` contiene la evidencia de tesis de S1.
**Formato:** [campos y reglas de expansión](../backlog-format.md) · catálogo en [jira-backlog.md](../jira-backlog.md) · secuencia en [roadmap.md](../roadmap.md).

## Objetivo y baseline aprobada

Demostrar en staging, desplegado desde `develop`: el monorepo con CI de frontend y backend en verde, login y logout con Auth0, una API que valida el JWT en cada solicitud y un endpoint protegido por RBAC que devuelve 403 al rol artista y 2xx al productor.

Las historias HU-01..04 son P0 para la demo. `TS-54` aporta el modelo mínimo de `users` y `artists` que necesita `TS-15`; el cierre completo del ERD permanece en `TS-49` y puede extenderse a S2. El bloque 7 del ADR está cerrado y no es el gate vigente. Los criterios de aceptación viven en Jira; este documento los referencia.

Buena parte del sprint ya está integrada en `develop` (PR #1 a #9). Esas casillas se marcan `[x]` con su evidencia. El resto queda abierto aunque el ticket parezca casi terminado.

## Registros de nivel Story y Task

| ID local | Tipo  | Épica padre      | Prioridad | SP  | Título                                         | Bloqueado por  |
| -------- | ----- | ---------------- | --------- | --- | ---------------------------------------------- | -------------- |
| ts-01    | Story | ts-epic-infra    | P0        | 3   | HU-01 Configurar entorno y repositorios        | —              |
| ts-29    | Task  | ts-epic-infra    | P0        | —   | Configurar staging (Railway desde `develop` + Vercel preview) | —   |
| ts-02    | Story | ts-epic-infra    | P0        | 5   | HU-02 Pipeline CI/CD con despliegue a staging  | ts-01, ts-29   |
| ts-03    | Story | ts-epic-identity | P0        | 5   | HU-03 Autenticación con Auth0                  | ts-01          |
| ts-04    | Story | ts-epic-identity | P0        | 3   | HU-04 Control de acceso basado en roles        | ts-03          |
| ts-38    | Task  | ts-epic-infra    | P0        | —   | Diseñar y cerrar el ERD del modelo de datos    | —              |

Cada ID de la última columna bloquea la entrega del registro de la primera. ts-38 no bloquea a ningún ticket de S1: bloquea ts-08, ts-10, ts-13, ts-17 y ts-22 (ver catálogo), y dentro de S1 solo se relaciona con ts-04 por orden interno de casillas. Se permite adelantar specs y tests en rojo de un sucesor cuando la dependencia no afecta a esa actividad.

## Estado reconciliado (2026-09-30)

| Hecho                                                                                                                                     | Evidencia                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Monorepo `backend/` (Laravel 13 + Sail) y `frontend/` (React + Vite + TS); Husky, ESLint, Prettier; plantilla de PR                        | PR #1-#5; `.github/PULL_REQUEST_TEMPLATE.md`    |
| Ramas `main` y `develop` existen; modelo de ramas en `docs/global/reglas-git.md`                                                          | `git branch -a`                                 |
| CI frontend (format, lint, build) en verde                                                                                                | PR #7; run 34368239813                          |
| CI backend (Pint, Larastan, tests sobre **SQLite**) en verde                                                                              | PR #8; runs 34491523296 y 34863307630 (PR #9)   |
| CI backend contra PostgreSQL                                                                                                              | PR #10 mergeado; run 36505635906                |
| Frontend: `Auth0Provider` con token en memoria, login/logout, interceptor axios (Bearer + mapeo de `code`), `RequireAuth`, `RequireRole`, `useRole`, `Forbidden` | PR #6                         |
| Auth0 backend en fase Red: `auth0/login` instalado en `origin/feature/TS-14-auth0-auth`, guard y `/me` aún por implementar                 | TS-14; rama remota 3 commits adelante           |
| Vitest y variables de entorno documentadas; corrección menor de formato preparada en este cambio                                         | PR #18, PR #19                                  |
| Staging alcanzable; falta probar con un merge nuevo el autodeploy simultáneo de Railway y Vercel                                          | TS-13, `ts-02.07`                               |
| Specs `docs/specs/{backend,frontend}/HU-04.md` en **borrador**                                                                            | Cabecera de estado de cada spec                 |

## Condiciones externas y exclusiones

- Railway, Vercel y Auth0 los configura el equipo humano (`CLAUDE.md` regla 6). Las casillas que los tocan son trabajo humano; el agente las señala y se detiene.
- **ADR bloque 7 CERRADO.** En S1 no se toca S3, subida de archivos ni URLs prefirmadas por alcance; tampoco se crean migraciones de `productions`, `songs`, `versions`, `comments` ni `studio_sessions` (`CLAUDE.md` §5).
- No se repite el scaffolding existente. CI, ramas y configuración se verifican con evidencia vigente.
- Solo datos sintéticos. Ningún secreto, token ni dato real de Milenium Sound en el repo, en Jira ni en este documento (`D2.2`). Las variables de entorno se nombran, nunca se valoran.
- El proyecto `TS` de Jira está poblado. Las claves actuales están en [`../jira-key-map.md`](../jira-key-map.md); las claves de commits antiguos pertenecen al tablero anterior y no se reescriben.
- Fuera de S1: módulos funcionales (artistas, producciones…) más allá del endpoint de humo, dominio y DNS (ts-30, S2), producción (ts-33).

## Checklist y separación de tickets

El desglose original tenía 6 tickets. Jira ahora separa unidades con seguimiento propio en `TS-50`, `TS-52`, `TS-53` y `TS-54`; `TS-51` registra retrospectivamente el manejador de errores/Sentry.

- Las Story cross-capa (ts-03, ts-04) usan la plantilla estándar `.01`-`.09` de `backlog-format.md` y añaden casillas específicas desde `.10`. El número de una casilla no indica su orden; el orden lo da "Orden interno".
- Las historias de infraestructura (ts-01, ts-02) y las Task ts-29 y ts-38 usan casillas propias de su naturaleza.
- El ERD se dividió sin duplicar alcance: `TS-54` cubre el modelo mínimo de S1 y `TS-49` conserva el cierre completo.
- Los IDs con sufijo identifican casillas, no tickets. El orden interno no genera enlaces Blocks en Jira.
- Si la parte backend de HU-03 la lleva otra persona con plazo propio, puede promoverse a Sub-task (`ts-03-backend`), dejando las casillas como referencia. No se hace por defecto.

## Desglose por ticket

### ts-01 - HU-01 Configurar entorno y repositorios

Historia: Como equipo de desarrollo, quiero configurar el entorno y los repositorios, para tener una base de trabajo versionada y estandarizada.

Alcance: estructura del monorepo, estrategia de ramas, herramientas de calidad local y documentación de variables de entorno de ambas capas. Sin valores reales en ningún `.env.example`.

Criterios de aceptación: Anexo C, HU-01 → Jira.

Referencias: `docs/global/reglas-git.md`; `backend/docs/nomenclatura.md`; `backend/docs/Handoff backend sprint1.md`; ADR D2.1, D2.2.

Checklist de ejecución:

- [x] `ts-01.01` Estructura del monorepo. Hecho cuando: `backend/` y `frontend/` hermanos, cada uno con su `CLAUDE.md` y su stack arrancando. Evidencia: PR #1-#5. Orden interno: según dependencias del ticket.
- [x] `ts-01.02` Estrategia de ramas definida. Hecho cuando: `main`, `develop` y `feature/*` documentados en `reglas-git.md` y `develop` creada en el remoto. Evidencia: `origin/develop`. Orden interno: ts-01.01.
- [x] `ts-01.03` Calidad local en el frontend. Hecho cuando: Husky, ESLint (type-checked) y Prettier se ejecutan antes del commit. Evidencia: PR #3. Orden interno: ts-01.02.
- [x] `ts-01.04` Plantilla de PR. Hecho cuando: `.github/PULL_REQUEST_TEMPLATE.md` versionada. Evidencia: commit 342df30. Orden interno: ts-01.02.
- [ ] `ts-01.05` Documentar variables del frontend (humano). Hecho cuando: `frontend/.env.example` versionado con `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_AUTH0_ROLE_CLAIM` y `VITE_API_BASE_URL` sin valores reales; `.env` sigue en `.gitignore`. Orden interno: ts-01.04.
- [ ] `ts-01.06` Documentar variables del backend (humano). Hecho cuando: `backend/.env.example` incluye las variables de Auth0 (dominio, audience, clave del claim de roles) sin valores reales, alineadas con ts-03.01. Orden interno: ts-01.05.
- [ ] `ts-01.07` Registrar evidencia y cerrar. Hecho cuando: PRs enlazados en el ticket de Jira, los tres AC comprobados y ticket movido a Done a mano. Orden interno: ts-01.06.

### ts-29 - Configurar staging (Railway desde `develop` + Vercel preview)

Objetivo: disponer de un entorno de staging que se actualice con cada merge a `develop` y donde se demuestre el sprint.

Alcance: servicio backend en Railway, proyecto frontend en Vercel y su conexión con Auth0. Sin dominio propio (ts-30, S2) ni producción (ts-33, S7).

Hecho cuando: frontend y backend de staging alcanzables, desplegados desde `develop`, con login Auth0 funcionando y sin secretos en el repo.

Referencias: `docs/global/reglas-git.md` §2; ADR D2.2.

Dependencia externa: acceso de administración a Railway, Vercel y el tenant de Auth0 (equipo humano).

Checklist de ejecución:

- [x] `ts-29.01` Backend en Railway desde `develop`. Evidencia: TS-40, PR #13.
- [x] `ts-29.02` Variables de entorno en Railway sin secretos versionados. Evidencia: TS-40 y smoke test.
- [x] `ts-29.03` Frontend en Vercel desde `develop`. Evidencia: `https://trackstudio-staging.vercel.app`.
- [x] `ts-29.04` URLs de staging en Auth0. Evidencia: login redirige y vuelve sin callback mismatch.
- [x] `ts-29.05` CORS del backend. Evidencia: PR #13 y `HANDOFF_v5.md`.
- [x] `ts-29.06` Smoke test de staging. Evidencia: frontend y `/up` responden 200.
- [x] `ts-29.07` Entorno registrado sin credenciales. Evidencia: `TS-40` y `HANDOFF_v5.md`.

### ts-02 - HU-02 Pipeline CI/CD con despliegue a staging

Historia: Como equipo de desarrollo, quiero un pipeline CI/CD, para automatizar build, pruebas y despliegue a staging.

Alcance: CI de ambas capas con lint, build y pruebas; fallo del pipeline ante un test roto; despliegue automático a staging tras el merge a `develop`; protección de ramas. Sin despliegue a producción.

Criterios de aceptación: Anexo C, HU-02 → Jira, **con la corrección previa a la importación**: "el merge a `develop` despliega a staging" (no `main`).

Referencias: `.github/workflows/frontend-ci.yml`; `.github/workflows/backend-ci.yml`; `metodologia-sdd-tdd.md` §5 (C4) y §6; ADR D2.1.

Dependencia externa: permisos de administración del repositorio en GitHub para la protección de ramas.

Checklist de ejecución:

- [x] `ts-02.01` CI frontend. Hecho cuando: `npm ci`, `format:check`, `lint` y `build` corren en push y PR a `main`/`develop`. Evidencia: PR #7; run 34368239813. Orden interno: según dependencias del ticket.
- [x] `ts-02.02` CI backend. Hecho cuando: `composer install`, Pint, Larastan y tests corren en push y PR a `main`/`develop`. Evidencia: PR #8; run 34491523296. Orden interno: ts-02.01.
- [x] `ts-02.03` Tests del backend contra PostgreSQL (C4). Evidencia: PR #10; run 36505635906. Orden interno: ts-02.02.
- [x] `ts-02.04` Pruebas unitarias en la CI frontend. Evidencia: PR #19; run 36668531996. Orden interno: ts-02.03.
- [ ] `ts-02.05` El pipeline falla ante un test roto. Hecho cuando: un PR de prueba con un test roto a propósito en cada capa queda en rojo, y se registra el enlace del run. Orden interno: ts-02.04.
- [x] `ts-02.06` Protección de `main` y `develop`. Evidencia: rulesets `protect-main` y `protect-develop`, PR + 1 review y checks obligatorios. Orden interno: ts-02.05.
- [ ] `ts-02.07` Despliegue a staging tras merge a `develop`. Hecho cuando: un merge a `develop` actualiza Railway y Vercel sin pasos manuales. Orden interno: ts-02.06 y ts-29.06.
- [x] `ts-02.08` AC corregido: `develop` → staging. Evidencia: Jira y PR #20. El Anexo C queda en TS-53.
- [ ] `ts-02.09` Integración y cierre. Hecho cuando: los tres AC tienen evidencia (runs verde y rojo, despliegue), el handoff está actualizado y el ticket se mueve a Done. Orden interno: ts-02.07, ts-02.08.

### ts-03 - HU-03 Autenticación con Auth0

Historia: Como usuario, quiero autenticarme mediante Auth0, para acceder de forma segura al sistema.

Alcance: login y logout en el frontend (ya integrado), validación del JWT en cada solicitud de la API y endpoint de humo autenticado. El sistema no almacena credenciales propias. RBAC por rol queda en ts-04.

Criterios de aceptación: Anexo C, HU-03 → Jira.

Referencias: RNF-02; ADR D4.8 (claim `https://trackstudio.site/roles`) y D5.1 (token en memoria); `backend/docs/Handoff backend sprint1.md` (SDK `auth0/login` ^7).

Dependencia externa: configuración del tenant de Auth0 (equipo humano), casilla ts-03.10.

Checklist de ejecución:

- [x] `ts-03.10` Tenant de Auth0 preparado y token real verificado en jwt.io el 2026-09-30. Orden interno: antes de ts-03.02.
- [x] `ts-03.01` Spec backend aprobada en la rama `origin/feature/TS-14-auth0-auth`.
- [x] `ts-03.02` Tests backend vistos en rojo. Evidencia: 63 tests, 39 verdes, 23 rojos y 1 saltado tras instalar `auth0/login` ^7; el token real se ejecutó aparte y falló como se esperaba.
- [ ] `ts-03.03` Código backend hasta verde (humano). Hecho cuando: SDK instalado, middleware JWT, `routes/api.php` y `/api/v1/me` hacen pasar los tests; Larastan nivel 5 y Pint limpios. Orden interno: ts-03.02.
- [ ] `ts-03.04` Review backend. Hecho cuando: hallazgos con `archivo:línea` resueltos o justificados; cada test no trivial probado en rojo (C3). Orden interno: ts-03.03.
- [ ] `ts-03.05` Spec frontend. Hecho cuando: `docs/specs/frontend/HU-03.md` aprobada y enlazada a la backend; documenta el código ya integrado y no repite el test de token en memoria de HU-04 frontend. Orden interno: independiente.
- [ ] `ts-03.06` Tests frontend (agente). Hecho cuando: tests Vitest de login/logout y del interceptor que añade `Authorization: Bearer`. Como el código ya existe, el rojo se demuestra rompiendo la implementación (C3). Orden interno: ts-03.05, ts-02.04.
- [x] `ts-03.07` Código frontend. Hecho cuando: `Auth0Provider` con `cacheLocation="memory"`, botones de login/logout e interceptor con Bearer integrados. Evidencia: PR #6. Se reabre si ts-03.06 revela fallos. Orden interno: ts-03.06.
- [ ] `ts-03.08` Review frontend. Hecho cuando: igual que ts-03.04 para la capa frontend. Orden interno: ts-03.07.
- [ ] `ts-03.11` Sin credenciales propias. Hecho cuando: el backend solo persiste `auth0_sub` (sin contraseñas ni tokens) y los logs no contienen tokens ni cabeceras `Authorization`. Orden interno: ts-03.04.
- [ ] `ts-03.09` Integración y cierre. Hecho cuando: PR a `develop` con CI verde; login, logout y llamada autenticada a `/api/v1/me` comprobados en staging; RNF-02 verificado; handoff actualizado. Orden interno: ts-03.08, ts-03.11, ts-29.06.

### ts-04 - HU-04 Control de acceso basado en roles

Historia: Como sistema, quiero aplicar control de acceso basado en roles, para restringir cada operación al rol correspondiente.

Alcance: roles productor y artista desde el claim de Auth0, middleware RBAC en todas las rutas de la API, errores 401/403 en formato D3.1, endpoint de escritura de prueba y guardas de ruta en el frontend. Las vistas funcionales y la vista restringida completa del artista quedan en sus HU (HU-05+, HU-21).

Criterios de aceptación: Anexo C, HU-04 → Jira.

Referencias: RNF-01; ADR D3.1, D4.1, D4.2, D4.4, D4.8, D5.1, D6.1, D6.6, D6.7; [spec backend](../../specs/backend/HU-04.md); [spec frontend](../../specs/frontend/HU-04.md).

Dependencia externa: usuarios sintéticos con rol en Auth0 (equipo humano), casilla ts-04.10.

Checklist de ejecución:

- [ ] `ts-04.01` Aprobar la spec backend. Hecho cuando: la spec normalizada se aprueba y aplica la decisión de `TS-54` sobre `production_access`, cuya FK apunta a `productions`, tabla fuera del alcance del Sprint 1. Orden interno: TS-54.
- [ ] `ts-04.02` Tests backend en rojo (agente). Hecho cuando: `RbacTest` (401 sin token, 403 al artista, 2xx al productor), `ErrorShapeTest` (forma D3.1 y `code`) y un test que recorre las rutas `/api/v1` y exige middleware de autenticación y rol en el 100 %, todos vistos fallar. Orden interno: ts-04.01, ts-03.03.
- [ ] `ts-04.03` Código backend hasta verde (humano). Hecho cuando: manejador centralizado D3.1, `unauthenticated()` sobrescrito, Policy, endpoint de escritura de prueba y solo las migraciones permitidas, conforme al ERD aprobado en ts-38.06; tests en verde; Larastan y Pint limpios. Orden interno: ts-04.02, ts-38.06.
- [ ] `ts-04.04` Review backend. Hecho cuando: hallazgos resueltos o justificados; cada test probado en rojo según la columna C3 de la spec. Orden interno: ts-04.03.
- [ ] `ts-04.05` Aprobar la spec frontend. Hecho cuando: la spec pasa a aprobada con referencias `T-xx` sustituidas y enlace coherente con la backend. Orden interno: independiente.
- [ ] `ts-04.06` Tests frontend (agente). Hecho cuando: tests Vitest del interceptor (despacha por `code`, ignora `message`), de `RequireRole` (el artista no accede a rutas del productor) y del token fuera de `localStorage`/`sessionStorage`. Como el código ya existe en parte, el rojo se demuestra rompiéndolo (C3). Orden interno: ts-04.05, ts-02.04.
- [ ] `ts-04.07` Código frontend hasta verde (humano). Hecho cuando: `RequireRole`, `useRole`, `Forbidden` e interceptor (ya presentes desde PR #6) completan lo que pidan los tests; `tsc --noEmit`, ESLint y Prettier limpios. Orden interno: ts-04.06.
- [ ] `ts-04.08` Review frontend. Hecho cuando: igual que ts-04.04 para la capa frontend. Orden interno: ts-04.07.
- [x] `ts-04.10` Usuarios sintéticos con rol (humano). Hecho cuando: un usuario productor y uno artista de prueba en Auth0, con el rol presente en el claim del token; sin datos reales. Verificado el 2026-10-02 con tokens reales: productor → `["productor"]`, artista → `["artista"]` en `https://trackstudio.site/roles`. Orden interno: ts-03.10.
- [ ] `ts-04.09` Integración y demo del sprint. Hecho cuando: PR a `develop` con CI verde; en staging el artista recibe 403 `FORBIDDEN` y ve la pantalla sin permiso, el productor recibe 2xx y sin token hay 401; RNF-01 verificado; handoff actualizado. Orden interno: ts-04.04, ts-04.08, ts-04.10, ts-02.07.

### ts-38 - Diseñar y cerrar el ERD del modelo de datos

Objetivo: fijar el modelo de datos de Track Studio antes de migrar, para que las migraciones de cada historia salgan de un diseño aprobado y no se inventen tabla a tabla.

Alcance: entidades, atributos, claves, relaciones, cardinalidades, restricciones e índices de todas las tablas que respaldan RF-01..RF-07. Incluye `users`, `artists`, `productions`, `songs`, `versions`, `comments`, `production_access` y `studio_sessions`, más las que resulten del inventario. No crea migraciones ni toca código de aplicación. No incorpora elementos de los prototipos sin respaldo en un RF (roadmap, "Pendientes de decisión").

Hecho cuando: ERD versionado en `docs/erd/`, trazado a RF/HU, anclado a D6.x y aprobado por el humano. La aprobación de `users` y `artists` llega en S1 mediante `TS-54`; el cierre completo queda en `TS-49`.

Referencias: RF-01..RF-07; ADR D6.1 (UUID), D6.6 (nombres), D6.7 (índices); `backend/docs/nomenclatura.md`; `backend/docs/Handoff backend sprint1.md` (`auth0_sub` único e indexado); [spec backend HU-04](../../specs/backend/HU-04.md) §3.

Dependencia externa: aprobación humana del diseño. El bloque 7 está cerrado desde el 2026-08-18.

Checklist de ejecución:

- [ ] `ts-38.01` Inventariar entidades. Hecho cuando: cada tabla candidata tiene su RF y sus HU de origen; lo que venga solo de los prototipos queda fuera y anotado. Orden interno: según dependencias del ticket.
- [ ] `ts-38.02` Definir atributos y restricciones. Hecho cuando: cada tabla tiene columnas, tipos, nulabilidad y unicidad, con PK/FK en UUID (D6.1) y nombres según D6.6. Cubre `auth0_sub` único, unicidad de artista (HU-05), estados del artista (HU-07), formato de producción (HU-09), posición de canción (HU-11) y número de versión secuencial (HU-14). Orden interno: ts-38.01.
- [ ] `ts-38.03` Definir relaciones, cardinalidades y borrados. Hecho cuando: cada FK declara su cardinalidad y su comportamiento al borrar, incluida la cascada canción → versiones → comentarios (HU-12). Orden interno: ts-38.02.
- [ ] `ts-38.04` Decidir `production_access` para S1. Hecho cuando: queda decidido si ts-04 crea `production_access` ahora (su FK apunta a `productions`, vetada por §5) o la difiere a HU-20. La decisión se registra y se aplica en ts-04.01. Orden interno: ts-38.03.
- [ ] `ts-38.05` Definir índices y reglas de integridad. Hecho cuando: índices según D6.7, incluido el único parcial `(production_id, user_id) WHERE revoked_at IS NULL`, y la regla de no solapamiento de sesiones (HU-22) indica dónde se garantiza (BD o servicio). Orden interno: ts-38.03.
- [ ] `ts-38.06` Aprobar `users` y `artists` en `TS-54`. Hecho cuando: el humano aprueba esas tablas y `TS-15` puede migrarlas desde este diseño. Orden interno: ts-38.04, ts-38.05.
- [ ] `ts-38.07` Aplicar D7.x a `versions`. Hecho cuando: los atributos de almacenamiento e integridad (clave del objeto, tamaño, tipo MIME y hash) quedan trazados a D7.1-D7.7, sin valores inventados. Orden interno: ts-38.06.
- [ ] `ts-38.08` Versionar el diagrama. Hecho cuando: el ERD vive en `docs/erd/` en un formato de texto que se revisa por diff (por ejemplo Mermaid `erDiagram`) y cada tabla enlaza sus RF/HU. Orden interno: ts-38.07.
- [ ] `ts-38.09` Cerrar el ERD. Hecho cuando: todas las entidades están completas, el humano aprueba el ERD entero, se desbloquean las historias dependientes y el handoff lo registra. Puede cerrarse en S2. Orden interno: ts-38.08.

## Cierre y capacidad

El objetivo se cumple cuando ts-01..ts-04 y ts-29 cumplen Done y ts-38 llega al menos a ts-38.06. Done significa: código en `develop` por PR con CI verde, tests pasando, AC verificados en staging y revisión en el Sprint Review. Un pipeline fallido, una spec sin aprobar o una casilla de AC abierta impiden declarar cumplido el objetivo, aunque el sprint cierre por calendario.

El inventario contiene 6 tickets y 53 casillas: ts-01 (7), ts-29 (7), ts-02 (9), ts-03 (11), ts-04 (10) y ts-38 (9). Hay 7 casillas ya cumplidas con evidencia. No es una estimación en horas.

Capacidad nominal: 2 desarrolladores × 80 h = 160 h para 16 SP. Specs, tests, reviews, integración y correcciones consumen esa misma capacidad. Las esperas de infraestructura humana (Auth0, Railway, Vercel, GitHub) se registran aparte, sin horas ficticias.

Camino crítico: `TS-14 ts-03.03` → review backend/frontend → `TS-54` → `TS-15` → demo. La validación JWT bloquea RBAC; en paralelo, `TS-54` debe aprobar el modelo mínimo antes de las migraciones de `TS-15`.

## Pendientes y discrepancias

- **Bloque 7 cerrado.** No necesita ticket adicional. La preparación de AWS está en `TS-50`; el bucket/IAM de aplicación continúa en `TS-42` para S3.
- **Estado de ts-03 en `jira-backlog.md`.** Dice "Login/logout con Auth0 integrado (PR #6)", pero la validación del JWT en la API no está hecha. Hay que corregir esa fila.
- **Documentos ausentes.** El repo no contiene `docs/adr/decisiones-tecnicas-track-studio.md` ni `docs/global/handoffs/`, aunque `CLAUDE.md` y la metodología los citan. Las referencias `Dx.y` de este documento no se pueden verificar hasta que estén versionados.
- **SDK de Auth0.** Se instala `auth0/login` ^7, no v4.x: corregir D2.1 y el documento de tesis (roadmap, discrepancias).
- **HU-02.** Corregir el AC antes de importar (casilla ts-02.08).
- **S2.** ts-30 (dominio y DNS) y la primera actualización de ts-35 (tesis, evidencia del sprint).

Siguiente paso: cerrar las evidencias pendientes de `TS-12`/`TS-13` y continuar `TS-14`; después completar `TS-54` antes de `TS-15`.
