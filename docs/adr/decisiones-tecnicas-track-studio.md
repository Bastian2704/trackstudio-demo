# Track Studio — Registro de Decisiones Técnicas (ADR)

**Proyecto:** Track Studio — Gestión de proyectos musicales para Milenium Sound
**Equipo:** Sebastian Abad (SM + Dev), Adrián Cornejo (Dev)
**Product Owner:** Efraín Abad (Milenium Sound)
**Última actualización:** 2026-09-17

**Leyenda de estado:**
`DECIDIDO` decisión cerrada · `ABIERTO` requiere definición · `PENDIENTE` depende de otro bloque · `PARCIAL` decisión tomada pero con partes que dependen de otro punto todavía abierto

---

## 1. Proceso y equipo (SCRUM)

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 1.1 | Duración de sprint | DECIDIDO | 2 semanas |
| 1.2 | Roles | DECIDIDO | PO: Efraín Abad · SM: Sebastian Abad · Devs: ambos |
| 1.3 | Cadencia de ceremonias | DECIDIDO | 1 daily sincrónica + 1 asíncrona; varianza de un día |
| 1.4 | Reporte al director | DECIDIDO | Sprint Review al cierre de cada sprint |
| 1.5 | Historia ancla | DECIDIDO | HU-05 = 3 SP |
| 1.6 | Definition of Ready | **PARCIAL** | Aprobada como criterios (ver abajo); dos de los siete no se pueden aplicar en su totalidad todavía |

**Definition of Done (vigente):** código integrado en rama principal sin fallos en el pipeline, pruebas pasando, criterios de aceptación cumplidos, RNF verificados, revisado en Sprint Review.

**Definition of Ready (aprobada parcialmente, 2026-08-18):** se adoptan los siete criterios propuestos en `sprint-01-guia-arranque.md` §1-bis (formato de historia, criterios de aceptación verificables, estimación contra la historia ancla, sin dependencias abiertas en el ADR, entidades ya en el ERD, pantalla ya en Figma, instrumento de medición definido si evidencia un RNF). **Por qué "parcial" y no `DECIDIDO`:** dos criterios no se pueden verificar todavía en la práctica —

- **Criterio 6 (pantalla en Figma):** el prototipo de alta fidelidad existe para practicamente todas las pantallas en caso de ser necesario crear una nueva se confirmará.
- **Criterio 7 (instrumento de medición de RNF):** depende de que 11.5 (plan de medición por RNF) deje de estar `ABIERTO` — hoy no hay instrumento definido para varios RNF, así que ninguna historia que los evidencie puede certificarse Ready con este criterio todavía.

El criterio 4 sigue siendo el que más protege el cronograma, y es dinámico: mejora automáticamente a medida que se cierran los puntos `ABIERTO`/`PARCIAL` de este documento — con el cierre del bloque 7, las historias de audio (HU-13 a HU-16) ya dejaron de estar bloqueadas por ese criterio específico (aunque sigan bloqueadas por el ERD, deliberadamente diferido).

---

## 2. Repositorio, ramas y convenciones

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 2.1 | Estructura | DECIDIDO | Monorepo |
| 2.2 | Ramas | DECIDIDO | `main` / `develop` / `feature/TS-XX-nombre` / `fix/*` / `hotfix/*` |
| 2.3 | Releases | DECIDIDO | Tags semánticos (`v1.0.0`) |
| 2.4 | Branch protection | DECIDIDO | PR obligatorio + CI verde + 1 review |
| 2.5 | Commits | DECIDIDO | Conventional Commits con ID: `TS-XX: Description` |
| 2.6 | Linters | DECIDIDO | ESLint + Prettier (front) · Pint + Larastan (back) |
| 2.7 | Versionado de herramientas | DECIDIDO | Ver D2.1 |
| 2.8 | Gestor de paquetes JS | DECIDIDO | npm |

### D2.1 — Versiones pinneadas de linters y analizadores

Las herramientas de análisis estático se fijan por **versión exacta** (sin `^`), no por rango. El pin real lo garantizan los **lockfiles versionados en el repositorio** (`package-lock.json` o equivalente, `composer.lock`).

- CI instala con `npm ci` y `composer install` (nunca `npm install` / `composer update`).
- Se fija también el runtime: versión de Node (`.nvmrc` o `engines`) y de PHP en el workflow.
- Las actualizaciones se realizan de forma deliberada en una rama dedicada, nunca de forma accidental durante un sprint.

**Versiones verificadas del stack** (instaladas y comprobadas en el contenedor, 31-ago-2026; añadidas aquí el 2026-09-17 para que este punto deje de remitir a una tabla que vivía solo en el documento de tesis):

| Componente | Versión | Nota |
|---|---|---|
| PHP | **8.4.24** | Runtime real (contenedor Sail). Paridad con Railway. `config.platform.php` de `composer.json` pinneado al mismo valor |
| Laravel Framework | **13.29.0** | Esqueleto `laravel/laravel` 13.10.1 |
| PostgreSQL | **18-alpine** | Contenedor Sail |
| Laravel Sail | 1.67.0 | |
| Composer | 2.10.3 | |
| Pest | **5.1.3** | + `pest-plugin-laravel` 5.0.1 |
| PHPUnit | 13.3.1 | Transitivo, lo exige Pest 5 |
| Larastan | 3.10 | Nivel 5, sobre PHPStan 2.x |
| Pint | 1.30.5 | Preset `laravel` |
| `auth0/login` | **^7** | Ver D4.8 |

> **Trampa registrada:** cuando el contenedor suba de parche de PHP (8.4.24 → 8.4.25), hay que actualizar `config.platform.php` al mismo valor o Composer falla la resolución.

**Justificación:** garantiza reproducibilidad del pipeline a lo largo de los 8 sprints y evita el desfase "pasa en local, falla en CI".
→ *ISO 25010: fiabilidad (madurez), mantenibilidad. Cubre: DoD (pipeline verde), RNF-04.*

### D2.2 — Repositorio público, con controles compensatorios obligatorios

Se decide **público** en GitHub (2026-07-21), decisión intencional del equipo que revierte la recomendación original de mantenerlo privado durante el desarrollo. El repositorio contendrá código de un cliente real (Milenium Sound), por lo que la visibilidad pública eleva la superficie de exposición si algún secreto o dato real llega a un commit.

**Controles compensatorios, obligatorios sin excepción por ser público:**
- Ningún `.env` real se versiona, en ningún momento del proyecto (ya exigido por D2.1/D8.4, aquí es innegociable).
- Ningún secreto (claves de Auth0, AWS, Resend, credenciales de BD) en código, configuración versionada o historial de commits.
- Seeder de producción sin datos reales del cliente ni de prueba (coherente con D6.8); el dataset realista en español vive solo en seeders de desarrollo/staging, nunca expuesto como parte del repo público de forma que identifique a personas o datos comerciales reales.
- Revisión de cada PR antes de merge por si arrastra datos reales o secretos, además del review obligatorio de D2.4.

**Cuenta:** el repositorio se aloja en la cuenta personal de GitHub `Bastian2704` (Sebastian), no en una organización. Mitigación para el handoff: GitHub permite transferir un repositorio a otra cuenta u organización conservando el historial completo, por lo que la transferencia a Milenium Sound al cierre del proyecto no se pierde por esta decisión.

→ *ISO 25010: seguridad (confidencialidad) — riesgo aceptado y mitigado, no eliminado. Cubre: RNF-01, RNF-02.*

---

## 3. Arquitectura general

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 3.1 | Versionado de API | DECIDIDO | Prefijo `/api/v1` aunque sea interna |
| 3.2 | Formato de error | DECIDIDO | Ver D3.1 |
| 3.3 | Paginación y filtros | DECIDIDO | Paginación estándar de Laravel |
| 3.4 | Clave primaria | DECIDIDO | UUID (ver D6.1) |
| 3.5 | Zona horaria | DECIDIDO | Ver D3.2 |
| 3.6 | Nivel de adhesión a RFC 9457 | **DECIDIDO** (2026-09-17) | **Completo**, con `type` e `instance`. Ver D3.1 |
| 3.7 | Origen del `trace_id` | **ABIERTO** | Frontend (`X-Trace-Id`) vs solo backend — **no bloquea**, ver D3.1 |

### D3.1 — Formato estándar de error JSON

Se adopta una variante de **RFC 9457 (Problem Details for HTTP APIs)**, adaptada al formato nativo de validación de Laravel.

Las respuestas construidas por el manejador usan el media type **`application/problem+json`**. `code`, `errors` y `trace_id` son miembros de extensión del Problem Details.

```json
{
  "type": "https://trackstudio.site/errors/validation-error",
  "title": "Los datos proporcionados no son válidos",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "El archivo debe ser WAV o MP3 y no superar 500 MB.",
  "instance": "/api/v1/songs/{uuid}/versions",
  "errors": { "audio_file": ["El formato debe ser WAV o MP3."] },
  "trace_id": "01JD2K8V7Q..."
}
```

**Campos clave:**
- `code` — identificador estable en `SCREAMING_SNAKE_CASE`; es el campo sobre el que el frontend hace lógica. No cambia aunque cambien los textos.
- `errors` — solo en 422; conserva la forma nativa de Laravel (`campo → [mensajes]`).
- `trace_id` — correlación con Sentry para diagnóstico.

**Catálogo de códigos:**

| Situación | HTTP | `code` |
|---|---|---|
| Validación de datos / archivo | 422 | `VALIDATION_ERROR` |
| Token ausente o inválido | 401 | `UNAUTHENTICATED` |
| Rol sin permiso (RBAC) | 403 | `FORBIDDEN` |
| Recurso inexistente | 404 | `RESOURCE_NOT_FOUND` |
| Formato de audio no soportado | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Archivo > 500 MB | 413 | `PAYLOAD_TOO_LARGE` |
| Hash no coincide | 422 | `AUDIO_HASH_MISMATCH` |
| Presigned URL expirada | 410 | `PRESIGNED_URL_EXPIRED` |
| Demasiadas peticiones | 429 | `RATE_LIMITED` |
| Error interno | 500 | `INTERNAL_ERROR` |

**Nivel de adhesión a RFC 9457 (cierra 3.6, 2026-09-17):** **completo**. Se emiten `type` e `instance` en toda respuesta de error, no solo los campos pragmáticos. El motivo original para diferirlos —que la URL de `type` apuntaba a un dominio no comprado— desapareció al confirmarse `trackstudio.site` (bloque 10). El `type` **se deriva del `code`**, no se escribe a mano: `https://trackstudio.site/errors/{code en kebab-case}` (`FORBIDDEN` → `.../errors/forbidden`). El `instance` es la ruta pedida.

> Correcciones: el 2026-09-17 se cambió `trackstudio.app` por el dominio confirmado **`trackstudio.site`**; el 2026-09-23 se alineó el slug del ejemplo (`validation` → `validation-error`) con la regla que deriva `type` desde `VALIDATION_ERROR`.

**`trace_id` mientras 3.7 siga abierto:** lo genera el **backend** como ULID en cada respuesta de error. Es el comportamiento compatible con las dos salidas posibles de 3.7 —si se decide que el frontend mande `X-Trace-Id`, el backend lo respeta y solo genera cuando falta—, así que **3.7 no bloquea** la implementación del manejador ni la Definition of Ready de las historias que dependen de D3.1.

**Implementación:** centralizada en el manejador de excepciones (`bootstrap/app.php` → `withExceptions`). Ningún controlador formatea errores. El catálogo vive en un enum backed (D4.6) cuyo **valor** es el `code` en `SCREAMING_SNAKE_CASE` — excepción deliberada a la regla de valores en minúscula de D4.6, porque ese valor es el contrato que viaja al frontend.

**Regla de seguridad:** en producción (`app.debug = false`) nunca se expone `getMessage()` de un error 500 al cliente; el detalle real va solo a Sentry, ligado al `trace_id`.

**Distinción 401 vs 403:** 401 = identidad no verificada; 403 = identidad válida sin permiso. El 403 del artista al intentar escribir es la evidencia auditable del RBAC.

→ *ISO 25010: mantenibilidad, seguridad (confidencialidad). Cubre: RNF-01, RNF-02.*

### D3.2 — Zona horaria: UTC en persistencia, UTC-5 en presentación

Todos los timestamps se persisten en **UTC** (`timestamptz` de PostgreSQL, `timezone = UTC` en Laravel). La conversión a **UTC-5 (America/Guayaquil)** ocurre exclusivamente en la capa de presentación del cliente. Las fechas se transmiten en **ISO 8601 con offset explícito** (`2026-03-15T15:00:00-05:00`).

**Justificación:** un instante es un hecho absoluto; la zona horaria es solo su representación. Persistir en hora local genera ambigüedad irrecuperable (no se sabe si el offset ya fue aplicado), rompe comparaciones y ordenamientos, y no resiste el horario de verano. Aunque Ecuador no aplica DST, la persistencia en UTC es la práctica documentada por Laravel y PostgreSQL, y soporta el caso del artista conectándose desde otra zona.

→ *ISO 25010: fiabilidad (corrección funcional). Cubre: RF-07.*

**Abierto:** ¿el frontend muestra siempre UTC-5 fijo, o la zona local del navegador?

---

## 4. Backend (Laravel) — CERRADO

### D4.1 — Form Requests: SÍ
Toda validación y primera autorización de entrada vive en clases Form Request dedicadas. La regla de RF-04 (WAV/MP3 ≤ 500 MB) se valida en backend aquí, no solo en el front.
→ *SOLID: SRP. ISO 25010: mantenibilidad (modularidad). Cubre: RF-04.*

### D4.2 — API Resources: SÍ
Toda salida se transforma con API Resources, filtrando campos por rol para garantizar que el artista nunca reciba datos que no le corresponden.
→ *SOLID: SRP + ISP. ISO 25010: seguridad (confidencialidad). Cubre: RF-06, RNF-01.*

### D4.3 — Eloquent directo para el dominio; interfaces (DIP) solo para servicios externos
Sin patrón Repository genérico (sobre-ingeniería para el alcance). Eloquent invocado desde los Services para artistas, producciones, canciones y versiones. Se definen contratos solo para las fronteras del sistema: `AudioStorageContract` (S3), `MailerContract` (Resend), `HashVerifierContract` (RNF-05).
→ *SOLID: DIP selectivo. ISO 25010: mantenibilidad, testeabilidad. Cubre: RNF-05, restricción "dependencias externas sin SLA".*

### D4.4 — Capas: Controllers → Services
Controladores delgados (reciben Form Request, llaman al Service, devuelven Resource). Toda la lógica de negocio (subida S3, versionado secuencial, hash, correo) vive en los Services.
→ *SOLID: SRP + OCP. ISO 25010: mantenibilidad (analizabilidad). Cubre: HU-14.*

### D4.5 — Soft delete con cascada explícita y purga diferida en S3
`SoftDeletes` en artista, producción, canción y versión. La cascada de HU-12 se maneja explícitamente en el Service (no vía `ON DELETE CASCADE`, porque el borrado lógico no es un DELETE real). Los objetos de audio en S3 se conservan al soft-delete y solo se eliminan en una purga deliberada.
→ *ISO 25010: fiabilidad (recuperabilidad), integridad. Cubre: HU-12, RNF-05.*

### D4.6 — Enums nativos de PHP casteados en Eloquent
Backed enums (PHP 8.1+) para formato de producción, estados de artista y estados de sesión. Validados con `Rule::enum()` en los Form Requests.
→ *ISO 25010: fiabilidad (madurez). Cubre: RF-01, RF-02, RF-07.*

### D4.7 — Pruebas: Pest
Pest (construido sobre PHPUnit) como framework de pruebas. Se testean Form Requests, Services (mockeando interfaces externas) y endpoints (feature tests de RBAC).
→ *ISO 25010: mantenibilidad (testeabilidad). Cubre: HU-24, HU-25.*

### D4.8 — RBAC: rol desde claim del JWT de Auth0, autorizado con Policies/Gates
Una **Action de Auth0** inyecta el rol como custom claim namespaced (`https://trackstudio.site/roles`). El JWT lo valida el **guard stateless `auth0-api`** del SDK oficial, y el claim de rol se extrae en el punto de extensión que el propio SDK expone (`UserRepositoryContract::fromAccessToken()`); la autorización fina se resuelve con Policies por recurso.

> **Corrección de 2026-09-17:** este punto decía "Auth0 SDK v4.x". El paquete real para Laravel es **`auth0/login` v7.x** (namespace `Auth0\Laravel`); no existe una v4 con esa API, y la v8 está en beta. Detectado en el handoff de backend del 31-ago-2026 §8.1 y aplicado aquí. El namespace del claim se lee de **una sola** clave de config (`config('auth0.roles_claim')` ← `AUTH0_ROLES_CLAIM`), idéntica en la Action de Auth0, el backend y el frontend. Las credenciales (hash bcrypt/argon2id) residen en Auth0; el backend nunca las almacena ni las ve — se documenta, no se implementa.
→ *SOLID: OCP + SRP. ISO 25010: seguridad (autenticidad, control de acceso). Cubre: RNF-01, RNF-02.*

### Flujo de request resultante

```
Request
 → Middleware (valida JWT Auth0, extrae rol del claim)
 → Form Request (valida datos + WAV/MP3 ≤500MB, autoriza)
 → Controller (delgado)
 → Policy (RBAC por recurso)
 → Service (lógica de negocio, cascadas, orquestación)
     → Eloquent (dominio propio)
     → AudioStorageContract / HashVerifierContract / MailerContract (DIP)
 → API Resource (filtra campos por rol)
 → JSON consistente (D3.1)
```

---

## 5. Frontend (React)

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 5.1 | Estado del servidor | DECIDIDO | TanStack Query (cachea y revalida presigned URLs) |
| 5.2 | Reproductor | DECIDIDO | wavesurfer.js (waveform + timestamps, en vez de Web Audio API cruda) |
| 5.3 | UI | DECIDIDO | Tailwind + shadcn/ui |
| 5.4 | Formularios | DECIDIDO | React Hook Form + Zod |
| 5.5 | Cliente HTTP | DECIDIDO | axios (con interceptor que lee `code` de D3.1) |
| 5.6 | Routing | DECIDIDO | Rutas protegidas por rol |
| 5.7 | Almacenamiento del token | DECIDIDO | Ver D5.1 |
| 5.8 | Estado global | **ABIERTO** | Zustand (recomendado) vs Context vs Redux — verificar a posteriori |

### D5.1 — Access token en memoria, gestionado por el SDK de Auth0 para React

El access token se mantiene **en memoria** mediante el caché por defecto de `@auth0/auth0-react`. **Nunca** se persiste en `localStorage` ni `sessionStorage`. La continuidad de sesión tras recargar se resuelve con **refresh tokens con rotación** gestionados por el SDK, de forma transparente para el usuario.

**Modelo de amenaza:** cualquier almacenamiento legible por JavaScript es legible por un XSS. `localStorage` es persistente y totalmente accesible; `sessionStorage` solo reduce la ventana temporal sin resolver el fondo. La memoria volátil minimiza la superficie de exposición.

**Controles complementarios obligatorios:**
- Content Security Policy (CSP) estricta como defensa principal contra XSS.
- Dependencias pinneadas con lockfile versionado (D2.1).
- Sanitización de todo input renderizado en el DOM.

**Modelo de auth del backend:** *stateless*. El SPA envía el JWT como Bearer en cada request; el middleware lee el rol del claim (coherente con D4.8). Sin BFF ni sesión server-side.

**Alternativa evaluada y descartada — cookie `httpOnly` + BFF:** objetivamente más resistente al robo de token por XSS (el token nunca llega al navegador), y soportada nativamente por el SDK de Auth0 para Laravel en modo autenticación. Se descarta por quedar fuera del alcance de la arquitectura SPA desacoplada: exigiría dominio propio con subdominios compartidos (el split Vercel/Railway obliga a `SameSite=None`, que debilita la protección CSRF que motivaba el patrón), store de sesión en BD/Redis (el driver de cookie de Laravel no es viable en producción por el límite de 4 KB), protección CSRF explícita, y modificaciones al modelo C4, a D4.8 y a la estimación del Sprint 1.

→ *ISO 25010: seguridad (confidencialidad, control de acceso). Cubre: RNF-01, RNF-02.*

---

## 6. Base de datos

### D6.1 — Clave primaria: UUID en todas las tablas
UUID nativo de PostgreSQL en PK y FK (`HasUuids` en modelos, `foreignUuid()` en migraciones). Previene enumeración de recursos por ID secuencial.
→ *ISO 25010: seguridad (confidencialidad). Cubre: RNF-01.*

### D6.2 — `artists` y `users` son entidades separadas
Enlazadas por `user_id` **nullable**. El productor crea el artista (nombre + correo) sin cuenta asociada; la cuenta nace cuando el artista se registra en Auth0. El campo nullable expresa las dos etapas del ciclo de vida.
→ *Cubre: RF-01, HU-05.*

### D6.3 — Estados del artista mediante enum
`invitado` (creado, correo enviado, sin cuenta) → `activo` (cuenta enlazada) → `inactivo` (desactivado por el productor). Backed enum casteado en Eloquent (coherente con D4.6).
→ *Cubre: RF-01, HU-06.*

### D6.4 — Enlace cuenta↔artista por token de invitación
Al crear el artista se genera un token único con expiración; el correo (Resend) incluye el enlace de registro. Al volver del registro en Auth0, el token identifica inequívocamente el registro a enlazar. El email se usa como validación secundaria, nunca como mecanismo único (el artista podría registrarse con otro correo y el enlace fallaría silenciosamente). Campos en `artists`: `invitation_token`, `invited_at`, `invitation_expires_at`.
→ *ISO 25010: seguridad (autenticidad). Cubre: RF-01, RF-06.*

### D6.5 — Acceso a producciones vía pivote `production_access`
Campos: `production_id`, `user_id`, `granted_at`, `revoked_at`, `granted_by`. **La revocación no borra la fila**, marca `revoked_at` — esto produce historial auditable de accesos, evidencia directa de RNF-01. La consulta de acceso vigente es: existe fila con `revoked_at IS NULL`.
→ *Cubre: RF-06, HU-20, HU-21.*

### D6.6 — Convenciones de nombres: estándar de Laravel

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tablas | plural, `snake_case` | `artists`, `studio_sessions` |
| Tablas pivote | singular, orden alfabético | `production_access` |
| Columnas | `snake_case` | `version_number` |
| Claves foráneas | `{singular}_id` | `artist_id`, `song_id` |
| Clave primaria | `id` (uuid) | — |
| Timestamps | `created_at`, `updated_at`, `deleted_at` | — |
| Booleanos | prefijo `is_` / `has_` | `is_active` |

→ *ISO 25010: mantenibilidad (analizabilidad).*

### D6.7 — Estrategia de índices
- Índice explícito en **cada FK** (PostgreSQL no los crea automáticamente; omitirlos degrada los JOINs y golpea RNF-03).
- Únicos de negocio como mecanismo de integridad: `(song_id, version_number)` garantiza el versionado secuencial de HU-14; `email` único en `users`; `invitation_token` único.
- **Índice único parcial** sobre `(production_id, user_id) WHERE revoked_at IS NULL` — permite historial completo de accesos e impide simultáneamente dos accesos activos duplicados.
- Índice en `studio_sessions.starts_at` para consultas por rango del calendario.
- Contención deliberada: no se indexa más allá de lo anterior, para no penalizar escrituras ni consumir el límite de 5 GB.

→ *ISO 25010: eficiencia (comportamiento temporal), fiabilidad (integridad). Cubre: RNF-03, RNF-05.*

### D6.8 — Seeders y factories
- **Factories** de Laravel + Faker para todos los modelos; base de los tests de Pest.
- **Seeder de producción:** exclusivamente la cuenta real del productor. Sin datos ficticios.
- **Seeder de desarrollo/staging:** dataset realista en español para Sprint Reviews y la prueba de aceptación (HU-28), incluyendo al menos una canción con **cuatro versiones paralelas** — el escenario que motivó el proyecto.
- Separación estricta por ambiente.

→ *ISO 25010: mantenibilidad (testeabilidad). Cubre: HU-24, HU-25, HU-28.*

### D6.9 — Sin pooler de conexiones dedicado
No se incorpora PgBouncer ni pooler externo. La arquitectura es single-tenant para un único estudio con dos roles y concurrencia esperada de pocos usuarios simultáneos, muy por debajo del límite de 100 conexiones de Railway. Se documenta el presupuesto de conexiones (workers × conexiones por worker) y se monitorea el conteo activo vía `pg_stat_activity` como verificación empírica. Se descarta el pooler por sobre-ingeniería respecto a la carga real.
→ *ISO 25010: eficiencia (utilización de recursos). Cubre: restricción Railway Hobby.*

### D6.10 — Backups: GitHub Actions → S3

**Contexto verificado:** Railway **no** incluye backups automáticos en el plan Hobby (están limitados al plan Pro).

**Mecanismo:** workflow programado en GitHub Actions (`schedule: cron`) que ejecuta `pg_dump` contra la instancia de Railway, comprime el volcado y lo sube al **bucket S3 existente** bajo el prefijo `db-backups/`. Credenciales vía GitHub Secrets.

**Cadencia y retención:** **2 respaldos por sprint** — uno a mitad de sprint y uno al cierre, alineado con la Sprint Review. Con sprints de 2 semanas equivale a cadencia semanal; 16 respaldos acumulados a lo largo del proyecto.

**Nomenclatura:** `db-backups/sprint-{n}/backup_{YYYYMMDD_HHMM}.sql.gz` — trazable contra la planificación SCRUM.

**Verificación:** se documenta al menos una **restauración de prueba** (`pg_restore` a base temporal) con evidencia de integridad. Un backup no restaurado es una suposición, no una garantía.

**Costo:** USD 0 — reutiliza GitHub Actions (ya en el pipeline) y el bucket S3 (ya presente para audio), sin proveedores adicionales.

**Alternativas evaluadas:** Railway Pro (rompe la restricción de presupuesto); Railway Cron + plantilla de backup (consume el crédito de USD 5); dumps en repositorio Git (descartada por mezclar datos personales con código); Cloudflare R2 (viable, descartada para no añadir un proveedor más).

→ *ISO 25010: fiabilidad (recuperabilidad), integridad de datos. Cubre: RNF-04, RNF-05.*

### Estado del ERD — **PENDIENTE**

**Entidades definidas:**

```
users                    (cuentas de login, nacen al registrarse en Auth0)
  id (uuid, PK), auth0_sub, email, role, timestamps

artists                  (entidad de catálogo, creada por el productor)
  id (uuid, PK), name, email, status (enum),
  user_id (uuid, FK → users, NULLABLE),
  invitation_token, invited_at, invitation_expires_at,
  created_by (uuid, FK → users),
  timestamps, deleted_at

production_access        (pivote con historial)
  id (uuid, PK), production_id (FK), user_id (FK),
  granted_at, revoked_at, granted_by (FK)
```

**Entidades pendientes de modelar:** `productions`, `songs`, `versions`, `comments`, `studio_sessions`.

**Desbloqueado (2026-08-18):** el bloque 7 (subida a S3 y versionado secuencial) ya cerró — ver D7.1-D7.7. La estructura de `versions` ya puede modelarse: incluye como mínimo `id` (uuid), `song_id` (FK), `version_number`, `s3_key` (patrón de D7.3), `content_type`, `size_bytes`, `etag` (D7.4), timestamps y `deleted_at`.

**Decisiones de formato pendientes:** notación (Crow's Foot recomendada), herramienta (dbdiagram.io/DBML, Mermaid o draw.io), enfoque design-first.

---

## 7. Almacenamiento y subida de audio (S3) — **CERRADO** (2026-08-18)

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 7.1 | ¿Subida directa navegador→S3 (presigned PUT) o vía backend? | DECIDIDO | Presigned PUT directo — ver D7.1 |
| 7.2 | Multipart upload + feedback de progreso (RNF-03) | DECIDIDO | PUT simple por ahora — ver D7.2 |
| 7.3 | Convención de S3 keys + versionado secuencial (`artist/prod/song/v{n}.ext`) | DECIDIDO | UUIDs, ver D7.3 |
| 7.4 | Hash (RNF-05): ¿cliente antes de subir, ETag de S3, o backend? | DECIDIDO | ETag de S3, ver D7.4 |
| 7.5 | CORS del bucket | DECIDIDO | Ver D7.5 |
| 7.6 | Expiración de presigned URLs + refresco por sesión | DECIDIDO | 15 min, ver D7.6 |
| 7.7 | Validación WAV/MP3 ≤ 500 MB en front y back | DECIDIDO | Ver D7.7 |

**Nota:** con Railway (5 GB de disco, 100 conexiones) y archivos de hasta 500 MB, la subida directa navegador→S3 es prácticamente obligatoria. 7.3 aborda el dolor original del estudio (versiones duplicadas sin nomenclatura).

### D7.1 — Subida directa navegador→S3 vía presigned PUT (2026-08-18)

Se descarta el paso del archivo por el backend. **Mecanismo:** el frontend pide al backend una presigned URL; el Form Request valida la producción/canción/artista y la Policy autoriza antes de firmar; el backend firma la URL vía `AudioStorageContract` (S3), acotada al key de destino y con expiración corta; el navegador sube el archivo directamente a S3 con esa URL — el archivo nunca toca Railway.

**Justificación:** Railway (5 GB de disco, límite de conexiones del plan Hobby) no puede absorber archivos de hasta 500 MB pasando por el servidor sin arriesgar agotar disco/memoria en subidas concurrentes. Además, el feedback de progreso (RNF-03) depende de que el backend responda rápido con la URL firmada — una operación de milisegundos, independiente del tamaño del archivo — mientras que la vía backend haría depender ese feedback de que el archivo cruce Railway primero.

**Aclaración de RNF-03:** "no debería tomar más de 3 segundos" no puede referirse a la transferencia completa del archivo (físicamente imposible para 500 MB en una conexión residencial/de estudio). Se interpreta como **tiempo hasta el primer feedback visible de progreso** (arranque de la subida), que con presigned PUT no depende del tamaño del archivo. **Pendiente:** confirmar el redactado exacto de RNF-03 en la tesis y dejarlo explícito en el plan de medición (11.5).

→ *ISO 25010: eficiencia (comportamiento temporal), restricción Railway Hobby. Cubre: RNF-03, RNF-05.*

### D7.2 — PUT simple, multipart diferido (2026-08-18)

El navegador sube el archivo completo en una sola petición HTTP a la presigned URL, con el progreso obtenido escuchando el evento `progress` de `XMLHttpRequest` (fetch no expone progreso de subida nativamente). Si la conexión se corta a mitad de la subida, se reinicia desde cero — no hay reintento parcial.

**Justificación:** entrega la funcionalidad completa (subida + feedback de progreso) con la menor complejidad posible para el Sprint en que se implemente. Se acepta el riesgo de reinicio completo ante fallo de conexión como compromiso deliberado de alcance, no como omisión.

**Diferido, no descartado:** si el cronograma lo permite, se evalúa migrar a multipart upload real de S3 (`CreateMultipartUpload` → N presigned URLs por parte ≥5 MB → `CompleteMultipartUpload`), que da reintento por parte en vez de reinicio completo y progreso más granular. Revisar esta decisión antes de cerrar el bloque 7 en Sprint 3–4, con el volumen real de canciones grandes como referencia.

→ *ISO 25010: mantenibilidad (simplicidad de implementación) sobre fiabilidad (recuperabilidad) — compromiso explícito, revisable. Cubre: RNF-03 (parcial).*

### D7.3 — Convención de S3 keys: UUIDs, `version_number` como espejo de la tabla `versions` (2026-08-18)

**Patrón:** `{artist_id}/{production_id}/{song_id}/v{version_number}.{ext}`, con los tres primeros segmentos siendo los UUID (D6.1) de `artists`, `productions` y `songs` — no nombres ni slugs legibles.

**`v{n}`:** no es un contador aparte en S3; es literalmente el `version_number` de la fila correspondiente en `versions` (el único de negocio `(song_id, version_number)` ya está en D6.7). Key de S3 y fila de base de datos quedan así imposibles de desincronizar por diseño — no hay dos fuentes de verdad para el número de versión.

**`ext`:** se conserva la extensión original del archivo subido (`wav`/`mp3`), dentro de lo que valide 7.7.

**Justificación:** usar UUIDs en vez de nombres/slugs evita exponer nombres de canciones, producciones o artistas en las keys del bucket S3 — relevante porque el repo es público (D2.2) y el proyecto maneja datos reales de un cliente. Evita también la necesidad de resolver colisiones de slugs o de renombrar keys si el artista o la canción cambian de nombre después.

→ *ISO 25010: seguridad (confidencialidad), mantenibilidad (integridad referencial). Ataca el dolor original del estudio (versiones duplicadas sin nomenclatura). Cubre: RNF-01.*

### D7.4 — Hash de integridad: ETag de S3, verificado por el backend con `HeadObject` (2026-08-18)

**Mecanismo:** tras el PUT, el frontend le informa al backend que la subida terminó (junto con el ETag que S3 devolvió). El backend **no confía ciegamente en ese dato**: hace su propia llamada `HeadObject` a S3 sobre la key recién subida y compara el ETag que S3 reporta contra el esperado, vía `HashVerifierContract` (D4.3). Solo si coincide se marca la versión como íntegra.

**Por qué no el hash del cliente (SHA-256 antes de subir):** exige leer y hashear hasta 500 MB en el navegador del artista, lo que compite con el presupuesto de tiempo de RNF-03 (arranque rápido de la subida) y no aporta verificación real adicional si el backend igual necesita confirmar contra S3 de forma independiente — ver la comparación completa discutida antes de esta decisión.

**Por qué no descargar y hashear en el backend:** implicaría volver a traer cada archivo de hasta 500 MB desde S3 hacia Railway solo para calcular su hash, contradiciendo directamente la razón de ser de D7.1 (el archivo nunca toca el servidor).

**Suficiencia de MD5:** el ETag de S3 (para uploads no-multipart) es el MD5 del archivo. MD5 no es criptográficamente robusto frente a manipulación deliberada, pero el caso de uso de RNF-05 es detectar **corrupción accidental** en la subida, no un ataque — para eso MD5 es suficiente.

**⚠️ Acoplada a D7.2 — revisar si cambia:** esta decisión depende de que la subida sea PUT simple (D7.2). Si en algún momento se activa multipart upload real de S3, el ETag **deja de ser un MD5 simple del archivo completo** (pasa a ser un hash-de-hashes de las partes) y esta verificación deja de funcionar tal cual está descrita. Cualquier revisión futura de D7.2 hacia multipart **debe revisar D7.4 en la misma conversación**, no por separado.

→ *ISO 25010: fiabilidad (integridad de datos), eficiencia (comportamiento temporal). Cubre: RNF-05.*

### D7.5 — CORS del bucket (2026-08-18)

**Orígenes permitidos:** `localhost` (dev, puerto de Vite) + dominio de staging en Vercel + dominio de producción, una vez que existan. Nunca `*` — con presigned PUT, un CORS abierto permitiría que cualquier sitio use las URLs firmadas si llegan a filtrarse.

**Métodos:** `PUT` (subir) y `GET` (por si en el futuro se sirve audio directo desde S3 con URL firmada en vez de proxy por el backend — todavía no decidido, es de la HU de reproducción). No se habilitan `POST`, `DELETE` ni `*`.

**Headers:** `Content-Type` permitido en la solicitud; `ExposeHeaders` debe incluir `ETag` explícitamente (los navegadores no lo exponen a JS por defecto sin esto), necesario para D7.4.

**⚠️ Revisar esta decisión en estos momentos concretos, no antes:**
1. **El día del primer despliegue a staging en Vercel** (ya está en el checklist de `sprint-01-guia-arranque.md` §6, "CORS resuelto el mismo día del primer despliegue") — recién ahí se conoce el dominio real de Vercel a agregar a la lista de orígenes.
2. **Cuando se configure el dominio de producción** (`trackstudio.site` o un subdominio) sobre Vercel — agregar ese origen a la lista.
3. **Cuando se decida cómo se reproduce el audio** (HU de reproducción, todavía no diseñada): si se opta por servir el audio directo desde S3 con presigned GET, `GET` ya está habilitado; si se opta por proxy vía backend, `GET` en el bucket deja de ser necesario y se puede retirar.

→ *ISO 25010: seguridad (control de acceso). Cubre: RNF-01, RNF-02.*

### D7.6 — Expiración de presigned URLs: 15 minutos, sin refresco de una subida en curso (2026-08-18)

**Expiración: 15 minutos.** Margen dentro del rango 10-15 min evaluado — suficiente para subir un archivo de 500 MB incluso en una conexión lenta (a 1 MB/s, ~8 minutos) sin dejar la URL viva durante horas si llega a filtrarse (log, captura de pantalla, historial del navegador).

**No hay "refresco" de una URL en uso:** con PUT simple (D7.2), si la URL expira a mitad de una subida, no existe manera de extender esa subida en curso — S3 simplemente rechaza el resto de la petición. El frontend debe detectar el fallo (403/expirada) y pedir una **URL nueva**, lo que reinicia la subida desde cero. Esto es consistente con el compromiso ya aceptado en D7.2 (sin reintento parcial).

**"Por sesión" = por intento, no persistente:** cada vez que el artista/productor inicia una subida, el frontend pide una presigned URL nueva (pasando de nuevo por Form Request + Policy). No se reutilizan URLs entre intentos ni se guardan para uso posterior — evita que una URL vieja y ya usada quede disponible para reintentos no autorizados.

→ *ISO 25010: seguridad (control de acceso), eficiencia (comportamiento temporal). Cubre: RNF-01, RNF-02, RNF-03.*

### D7.7 — Validación WAV/MP3 ≤ 500 MB: en front, y como condición de la propia presigned URL (2026-08-18)

**Tamaño:** el frontend valida `≤ 500 MB` antes de pedir la presigned URL (rechazo inmediato). El backend no puede inspeccionar el archivo después de subido (D7.1: nunca toca Railway), así que la validación real de tamaño va como condición `content-length-range` al firmar la URL — S3 rechaza directamente cualquier PUT fuera de rango, sin que el backend tenga que hacer nada más.

**Formato (WAV/MP3):** el frontend valida extensión/`Content-Type` antes de subir. El Form Request valida el `Content-Type` declarado al pedir la URL, y ese mismo valor se fija como condición de la presigned URL (S3 rechaza si el `Content-Type` del PUT no coincide).

**Verificación ligera de magic bytes — mejora de UX, no control de seguridad:** el frontend además lee los primeros bytes del archivo (`RIFF....WAVE` para WAV, sync frame/tag `ID3` para MP3) antes de pedir la URL, para detectar archivos corruptos o mal renombrados sin gastar minutos subiéndolos. Es barato (no requiere leer el archivo completo) y mejora la experiencia, pero **no es una garantía de seguridad** — se puede evadir fácilmente y no pretende serlo.

**Por qué no hay validación de contenido real ni escaneo server-side:** el proyecto tiene usuarios cerrados y autenticados (RBAC, D4.8), y el backend nunca abre ni ejecuta el archivo — quien lo reproduce es wavesurfer.js, en el navegador. El escenario de riesgo de "ejecutable disfrazado de `.wav`" requeriría que otro usuario lo descargue y lo ejecute manualmente, fuera del control de la aplicación. Construir escaneo server-side (ej. Lambda sobre el bucket) sería sobre-ingeniería para este alcance y además contradice la razón de ser de D7.1.

→ *ISO 25010: fiabilidad (validación de entrada), eficiencia. Cubre: RF-04, RNF-03.*

---

**Bloque 7 — completo.** Las 7 decisiones (D7.1-D7.7) quedan cerradas. Desbloquea: el ERD completo (entidad `versions` ya puede modelarse) y las HU-13 a HU-16 pueden empezar a evaluarse contra la Definition of Ready.

## 8. Seguridad y acceso

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 8.1 | Matriz RBAC (rol × recurso × acción) | **PARCIAL** | Iniciada con lo ya decidido, ver D8.1 — faltan filas de `productions`/`songs`/`versions`/`comments` hasta cerrar el ERD |
| 8.2 | Aclaración bcrypt/argon2id | DECIDIDO | Credenciales residen en Auth0; se documenta, no se implementa (D4.8) |
| 8.3 | CORS del backend | DECIDIDO | Ver D8.3 |
| 8.4 | Secretos | DECIDIDO | GitHub Secrets + variables Railway/Vercel; ningún `.env` en el repo |
| 8.5 | Rate limiting | ABIERTO | — (separado de 8.3 el 2026-09-25) |

### D8.1 — Matriz RBAC: rol × recurso × acción (iniciada 2026-08-18)

Documentación formal de las reglas de autorización que ya implican D4.2 (API Resources filtrando por rol) y D4.8 (Policies por recurso). Se llenan las filas de las entidades ya definidas (`artists`, `production_access`, D6.2/D6.5); las de `productions`, `songs`, `versions`, `comments` quedan pendientes hasta cerrar el ERD.

| Recurso | Acción | Productor | Artista |
|---|---|:---:|:---:|
| `artists` | Crear (invitar artista) | ✅ | ❌ |
| `artists` | Ver | ✅ (todos) | ✅ (solo su propio perfil) |
| `artists` | Editar | ✅ | ❌ |
| `artists` | Desactivar | ✅ | ❌ |
| `production_access` | Otorgar acceso a una producción | ✅ | ❌ |
| `production_access` | Revocar acceso | ✅ | ❌ |
| `production_access` | Ver accesos propios | ✅ (todos) | ✅ (solo los suyos) |
| Endpoint de humo (`/api/v1/me`) | Ver | ✅ | ✅ |

**Evidencia auditable (D3.1):** el 403 que recibe un `artista` al intentar una acción marcada ❌ arriba es la prueba end-to-end de que esta matriz se cumple en código, no solo en documentación — es el entregable de HU-04 y de la Definition of Done del Sprint 1.

→ *ISO 25010: seguridad (control de acceso). Cubre: RNF-01.*

### D8.3 — CORS del backend (2026-09-25)

Configurado en `backend/config/cors.php`. La autenticación es por `Authorization: Bearer` con el token de Auth0 (D4.8, D5.1), sin cookies, por lo que no hay Sanctum ni credenciales cross-origin.

**Rutas:** solo `api/*`. No se incluye `sanctum/csrf-cookie` porque no se usa Sanctum.

**Orígenes permitidos:** lista explícita por entorno desde la variable `CORS_ALLOWED_ORIGINS` (separada por comas; en local, `http://localhost:5173`). Nunca `*`, con el mismo criterio que D7.5. Sin `allowed_origins_patterns`: no se usan comodines sobre `*.vercel.app`, porque ese dominio lo comparte cualquier proyecto de Vercel.

**Métodos:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`. No se usa `*`.

**Headers:** `Authorization`, `Content-Type`, `Accept`, `X-Requested-With`. No se usa `*`. `exposed_headers` va vacío.

**Preflight:** `max_age` de 600 s. **Credenciales:** `supports_credentials = false`.

**⚠️ Revisar:** (1) si 3.7 decide que el frontend envía `X-Trace-Id`, hay que agregarlo a los headers; (2) al configurar el dominio de staging o de producción, hay que agregar el origen a `CORS_ALLOWED_ORIGINS` en Railway.

→ *ISO 25010: seguridad (control de acceso). Cubre: RNF-01.*

---

## 9. CI/CD, ambientes y observabilidad

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 9.1 | Ambientes | DECIDIDO | dev manual / staging en `develop` / prod en `main` con aprobación |
| 9.2 | Migraciones en deploy | **ABIERTO** | ¿Automáticas o manuales? (decisión de riesgo) |
| 9.3 | Observabilidad | DECIDIDO | Sentry (errores) + UptimeRobot (uptime) — ver D9.3 |
| 9.4 | Rollback | ABIERTO | Procedimiento concreto en Railway/Vercel |

### D9.3 — Observabilidad: Sentry (errores) + UptimeRobot (uptime), riesgo de ToS aceptado (2026-08-18)

**Errores:** Sentry, backend (Laravel) y frontend (React), plan gratuito. Ya estaba anticipado por D3.1: el campo `trace_id` del formato de error se diseñó específicamente para correlación con Sentry.

**Uptime:** UptimeRobot, plan gratuito (50 monitores, chequeo cada 5 min), pingueando un endpoint de salud nuevo `/api/v1/health` (sin autenticación, verifica como mínimo la conexión a la base de datos) y el frontend en Vercel.

**Instrumento de medición para RNF-04** (cierra parte de 11.5): % de uptime reportado por UptimeRobot + tasa de errores de Sentry, recolectados por sprint y presentados en cada Sprint Review.

**⚠️ Riesgo de Términos de Servicio, aceptado deliberadamente:** desde diciembre de 2024, el plan gratuito de UptimeRobot restringe su uso a personal/no comercial en sus Términos de Servicio, con una excepción documentada (aunque inconsistente con otra documentación propia de UptimeRobot) para uso educativo/open-source. Track Studio es un proyecto capstone académico, pero corre en producción real para un cliente real (Milenium Sound) — cae en una zona gris entre "educativo" y "trabajo de cliente". Se evaluó como alternativa sin este riesgo un workflow de GitHub Actions con `schedule: cron` pingueando el health-check (reutilizando infraestructura ya presente, coherente con D6.10), pero el equipo decide mantenerse en UptimeRobot.

**Plan de contingencia si UptimeRobot suspende la cuenta:** migrar al workflow de GitHub Actions descartado arriba, que no depende de los Términos de Servicio de un tercero.

→ *ISO 25010: fiabilidad (madurez, disponibilidad). Cubre: RNF-04. Riesgo: incumplimiento de ToS de un proveedor externo, aceptado conscientemente.*

---

## 10. Cuentas externas — arrancar por lead time

| # | Cuenta | Estado | Nota |
|---|---|---|---|
| 10.1 | Resend | PENDIENTE | Dominio confirmado: `trackstudio.site`. Verificar DNS (24–48 h) una vez creada la cuenta — **el de mayor lead time** |
| 10.2 | Auth0 | **HECHO** (confirmado 2026-08-19) | Tenant + API + app SPA + 2 roles + Action que inyecta roles con namespace `https://trackstudio.site/roles` (D4.8) |
| 10.3 | AWS | PENDIENTE | Bucket + IAM mínimo + CORS |
| 10.4 | Railway + Vercel | PENDIENTE | — |
| 10.5 | Propiedad de cuentas | **PARCIAL** | Correo del proyecto creado: `trackstudioec@outlook.com` (cubre 1.1). Repositorio GitHub: cuenta personal `Bastian2704`, no organización (ver D2.2). Falta confirmar titularidad de Auth0, AWS, Railway/Vercel |

---

## 11. Pruebas y evidencia de RNF

| # | Punto | Estado | Decisión |
|---|---|---|---|
| 11.1 | Backend | DECIDIDO | Pest (D4.7) |
| 11.2 | Frontend | ABIERTO | Vitest + RTL |
| 11.3 | E2E | ABIERTO | Playwright (Sprint 7) |
| 11.4 | Metas de cobertura | ABIERTO | — |
| 11.5 | Plan de medición por RNF | **ABIERTO** | Instrumento concreto para evidenciar RNF-01 a RNF-07 |

---

## 12. Documentación y trazabilidad académica

| # | Punto | Estado |
|---|---|---|
| 12.1 | Contrato interno de API (no viola la delimitación: lo excluido es OpenAPI **externo**) | ABIERTO |
| 12.2 | ADRs de cada decisión | **EN CURSO — este documento** |

---

## Resumen de puntos abiertos priorizados

~~Bloque 7 completo~~ — **cerrado 2026-08-18** (D7.1-D7.7). ~~9.3 Observabilidad~~ — **cerrado 2026-08-18** (D9.3).

**Diferido deliberadamente (2026-08-18):** ERD completo (`productions`, `songs`, `comments`, `studio_sessions`) — ya desbloqueado por el cierre del bloque 7, `versions` ya tiene su estructura mínima (ver "Estado del ERD"). Se retoma cuando el equipo decida, no bloqueado por nada más.

**⚠️ Recordatorios — pausados en esta conversación (2026-08-18), retomar la decisión (no solo el trámite) cuando se trabaje cada uno:**

1. ⚠️ **9.2 — Migraciones en deploy.** ¿Automáticas al desplegar o manuales con aprobación? Es decisión de riesgo: automáticas son más rápidas pero pueden aplicar un cambio de esquema roto sin intervención humana en producción.
2. ⚠️ **9.4 — Rollback.** ¿Cuál es el procedimiento concreto en Railway/Vercel si un despliegue falla? Definir *antes* de que ocurra el primer incidente real, no durante.
3. ⚠️ **8.1 — Matriz RBAC, filas restantes.** Completar `productions`/`songs`/`versions`/`comments` una vez cerrado el ERD (D8.1 ya cubre lo que se puede llenar hoy).
4. ⚠️ **1.6 — Definition of Ready, certificación completa.** Confirmar si el prototipo de Figma existe para todas las pantallas (criterio 6), y cerrar 11.5 (criterio 7) para que deje de ser `PARCIAL`.
5. ⚠️ **11.5 — Plan de medición de RNF, resto de RNF.** RNF-04 ya tiene instrumento (D9.3); falta confirmar el redactado exacto de RNF-03 en la tesis (ver D7.1) y definir instrumento para RNF-01, RNF-02, RNF-05, RNF-06, RNF-07.
6. ~~**3.6 — Nivel de adhesión a RFC 9457.**~~ — **cerrado 2026-09-17**: completo, con `type` derivado del `code` sobre `trackstudio.site` (ver D3.1).
7. ⚠️ **3.7 — Origen del `trace_id`.** ¿Lo genera el frontend (header `X-Trace-Id`) o únicamente el backend? **Ya no bloquea:** el backend genera un ULID por respuesta de error, comportamiento compatible con ambas salidas (ver D3.1). Queda por decidir si el frontend aporta el suyo para correlación end-to-end.
8. ⚠️ **5.8 — Estado global de React.** Zustand (recomendado) vs Context vs Redux — verificar cuando exista estado compartido real que lo justifique.
9. **Cuentas externas (bloque 10)** — no es una decisión pendiente, es trámite: seguir el orden de `sprint-01-guia-arranque.md` §2 (dominio+Resend primero por lead time de DNS).
