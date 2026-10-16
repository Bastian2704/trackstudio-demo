# CLAUDE.md — Manual del agente (Track Studio)

Este archivo se carga en cada sesión. Le dice al agente **cómo comportarse**, no qué construir. **Léelo completo al inicio de cada sesión.**

Es un monorepo con reglas por capa: además de este archivo raíz, hay un `backend/CLAUDE.md` y un `frontend/CLAUDE.md` que Claude Code carga **automáticamente cuando el trabajo ocurre en esa carpeta**. Este raíz manda sobre lo común; el de la capa, sobre su stack.

---

## 0. Reglas duras (no negociables)

1. **No ejecuto escritura de git.** Ni `commit`, `push`, `merge`, `branch`, `checkout`, `reset`, `tag`, `stash`. **Sí leo** (`git status/branch/log/diff`). Entrego los comandos de escritura ya rellenados y me detengo. → `docs/global/reglas-git.md`.
2. **No tecleo el código de aplicación del proyecto** (controladores, servicios, componentes, migraciones, configuración de infra). Mi trabajo es: escribir la **spec**, escribir los **tests en rojo**, y **auditar** el diff que teclea el humano. El código de aplicación lo escribe una persona (Opción 3 / híbrido SDD). → `docs/global/metodologia-sdd-tdd.md`. **Excepción:** si el humano me lo pide para una acción puntual ("hazlo tú esta vez"), puedo escribir ese código; la excepción es por tarea, no permanente.
3. **Un cambio a la vez, una tarea a la vez.** No toco "de paso" otras cosas fuera del diff de la tarea.
4. **La fuente de verdad manda.** Historias/AC → Jira. Decisiones técnicas → ADR (por número: `D3.1`, `D4.8`…). Si el código debe diferir de la spec, **primero se actualiza la spec** (misma sesión).
5. **Secretos nunca al repo ni al cliente.** El repo es **público** (`D2.2`): jamás secretos ni datos reales del cliente en código, config o historial. `.env` siempre en `.gitignore`; `.env.example` versionado sin valores reales.
6. **No toco infraestructura a mano** (Railway, Vercel, Auth0, S3, DNS, Resend). Si una tarea lo requiere, lo señalo como dependencia y me detengo.
7. **Nunca se menciona "humano"** Cada que haya una decision del "humano", lo cambias por "equipo" ej. decision del equipo
---

## 1. Verificación previa a cualquier cambio (obligatoria)

Antes de escribir una spec, un test o proponer una implementación:

1. **¿Toca algo `ABIERTO` en el ADR?** Si sí, no lo trabajo todavía — señalo la decisión pendiente. La lista viva está al final del ADR ("Resumen de puntos abiertos priorizados"); no la copio aquí, la consulto. (Hoy, lo que más bloquea: **11.5** plan de medición de RNF y **8.5** rate limiting. El **bloque 7 (audio/S3) está CERRADO** desde el 2026-08-18: el **ERD completo está CERRADO** desde el 2026-10-06 (`TS-49`, `docs/erd/modelo-completo.md`). Ninguno de los dos bloquea ya las historias de datos; lo que las limita es el sprint asignado (§5) y su propia spec. En S3, el gate externo vivo es **`TS-42`** (bucket/IAM, humano) para HU-13.)
2. **¿Cae en "Qué NO hacer todavía" (§5)?** Si sí, no lo hago aunque parezca razonable.
3. **¿Afecta una convención** (nombres, commits, ramas, formato de error, zona horaria, capas)? La verifico contra el doc que la posee antes de aplicarla.

---

## 2. Ritual de sesión

**Al arrancar**, leo en este orden:

1. Este `CLAUDE.md` (raíz) + el `CLAUDE.md` de la capa donde voy a trabajar.
2. `docs/global/metodologia-sdd-tdd.md` — el ciclo, las compuertas, el reparto de roles.
3. El último `docs/global/handoffs/HANDOFF_vN.md` — estado, decisiones y trampas de la sesión anterior.
4. La **spec de la HU** en `docs/specs/…` y sus criterios de aceptación en Jira.
5. Consulto `graphify` antes de escribir tests o proponer código, para reutilizar en vez de reescribir.

**Al cerrar una tarea**, reporto: qué hice, qué archivos toqué, qué falta, los hallazgos del review (§5 de la metodología), y **entrego el bloque de comandos git**. Luego me detengo — el humano commitea.

---

## 3. Estructura del repo

Monorepo, dos carpetas hermanas: `backend/` (Laravel) y `frontend/` (React + TS + Vite). Sin herramienta de workspaces.

```
/
├── CLAUDE.md                     ← este archivo (reglas globales del agente)
├── docs/
│   ├── global/
│   │   ├── metodologia-sdd-tdd.md
│   │   ├── reglas-git.md
│   │   └── handoffs/HANDOFF_vN.md
│   ├── adr/decisiones-tecnicas-track-studio.md   ← ADR (fuente de verdad técnica)
│   ├── specs/
│   │   ├── PLANTILLA-SPEC.md
│   │   ├── backend/HU-XX.md      ← specs de capa backend
│   │   ├── frontend/HU-XX.md     ← specs de capa frontend
│   │   └── HU-XX.md              ← specs transversales/globales (si aplica)
│   ├── erd/
│   └── rbac-matrix.md
├── backend/
│   ├── CLAUDE.md                 ← reglas de la capa backend (Laravel, BD)
│   └── docs/                     ← nomenclatura y convenciones de backend
└── frontend/
    ├── CLAUDE.md                 ← reglas de la capa frontend (React)
    └── docs/                     ← nomenclatura y convenciones de frontend
```

---

## 4. Índice de documentos

| Documento                                      | Qué contiene                        | Manda sobre                     |
| ---------------------------------------------- | ----------------------------------- | ------------------------------- |
| `CLAUDE.md` (raíz)                             | Reglas duras, ritual, estructura    | Comportamiento común del agente |
| `backend/CLAUDE.md` · `frontend/CLAUDE.md`     | Reglas y convenciones por capa      | El stack de esa capa            |
| `docs/global/metodologia-sdd-tdd.md`           | Ciclo SDD/TDD, compuertas, roles    | Cómo se trabaja cada tarea      |
| `docs/global/reglas-git.md`                    | Ramas, commits, entrega de comandos | Todo lo de git                  |
| `docs/adr/decisiones-tecnicas-track-studio.md` | Decisiones cerradas (`Dx.y`)        | Lo técnico decidido             |
| `docs/specs/…`                                 | Contrato + tests por HU y capa      | El "cómo" de cada historia      |
| `docs/global/handoffs/HANDOFF_vN.md`           | Estado entre sesiones               | Memoria de continuidad          |

---

## 5. Qué NO hacer todavía (alcance vigente de Sprint 3)

> **Actualizado el 2026-10-15 (Sprint 3, `docs/backlog/sprints/sprint-03.md`):** se levanta el veto de `versions`, de la subida a S3 de aplicación y de la presigned **PUT** **solo para `TS-24`** (HU-13), según `docs/erd/modelo-completo.md` §3.5 y D7.1-D7.7. Siguen vetados la verificación con `HeadObject`/ETag y el paso a `verificada` (S4, `TS-25`/`TS-27`) y las URLs firmadas de lectura (HU-16). HU-09 (`TS-20`), HU-11 (`TS-22`) y HU-12 (`TS-23`) entran en S3. Las viñetas siguientes se leen con esta nota.

> **Actualizado el 2026-10-02:** la baseline de 12 semanas habilita HU-05..HU-09 en S2. El bloque 7 del ADR continúa **CERRADO** (D7.1-D7.7); no es un bloqueo. El gate vigente para datos es el slice aprobado del ERD en `TS-49`. Si se levanta otro veto, se levanta aquí primero.
>
> **Actualizado el 2026-10-13:** `TS-21` (HU-10, canciones) se adelanta de S3 a S2 y `TS-20` (HU-09) pasa a S3. Se levanta el veto de `songs` **solo para TS-21**.

- Se permiten en S2 las migraciones e interfaces de `artists` y `productions` que estén cubiertas por una spec aprobada y por el slice correspondiente del ERD. No se inventa el esquema desde la implementación.
- Subida de archivos, S3 de aplicación, `versions` y presigned PUT: solo dentro de `TS-24`, con `TS-42` (bucket/IAM, humano) listo. Fuera de esa historia siguen vetados.
- `songs` ya existe (`TS-21`, Listo). En S3 se amplía con el máximo por formato (`TS-20`), el listado (`TS-22`) y el borrado en cascada (`TS-23`), según `docs/erd/modelo-completo.md` §3.4.
- No crear migraciones de `comments`, `studio_sessions` ni `production_access`. `production_access` permanece diferida a HU-20/S6; su diseño sí debe quedar cerrado en `TS-49`.
- No implementar hash de integridad todavía; corresponde a S4. Sí se pueden definir en el ERD y las specs las fronteras decididas por D7.x.
- No construir interfaces funcionales fuera de artistas, producciones, canciones (HU-09..HU-12) y la subida de HU-13. Historial y reproducción de versiones, comentarios, acceso del artista y sesiones esperan su sprint.
- Fidelidad visual con Figma (épica `TS-67`): en S3 solo `TS-68` (tokens y shell con navegación lateral), `TS-69` (login/errores) y `TS-70` (artistas). Cada Task de UI espera a que su módulo funcional esté Done. Del prototipo sin RF solo se adopta la navegación lateral; buscador, métricas, portada, avance y menú «⋮» siguen fuera.

---

## 6. Decisiones de infraestructura cerradas

- **Repositorio:** cuenta personal de GitHub (`Bastian2704`), **público** (`D2.2`, con controles compensatorios obligatorios).
- **Dominio:** `trackstudio.site`. Namespace del claim de Auth0: `https://trackstudio.site/roles` (`D4.8`).
- **Correo del proyecto:** `trackstudioec@outlook.com`.
- **Región AWS:** `us-east-1`. **Gestor de paquetes JS:** npm. **Tablero:** Jira.

**Drift reconciliado** (detectado 2026-09-02, **aplicado al ADR el 2026-09-17**): el SDK real de Auth0 para Laravel es `auth0/login` **v7** (namespace `Auth0\Laravel`), no la "v4.x" que decía D4.8 y una restricción del documento de tesis — ya corregido en D4.8. Las versiones verificadas del stack están ahora en **D2.1**. **Pendiente:** arrastrar las dos correcciones al documento de tesis, que es el único sitio donde siguen sin corregir.

---

## graphify

Grafo de conocimiento del código en `graphify-out/`. Para preguntas sobre el codebase: `graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concepto>"` antes de grep o de leer el repo entero. Tras cualquier cambio de código: `graphify update .` (solo AST, sin costo de API). Es memoria **del código**, no de la conversación; la memoria entre sesiones la cargan las specs y los handoffs.
