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

---

## 1. Verificación previa a cualquier cambio (obligatoria)

Antes de escribir una spec, un test o proponer una implementación:

1. **¿Toca algo `ABIERTO` en el ADR?** Si sí, no lo trabajo todavía — señalo la decisión pendiente. (Hoy: **bloque 7 — subida de audio a S3 está ABIERTO**; mientras siga así, el ERD no se cierra y ninguna historia de audio HU-13..HU-16 es "Ready".)
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

## 5. Qué NO hacer todavía (vigente hasta cerrar el bloque 7 del ADR)

- No tocar S3, subida de archivos ni presigned URLs.
- No crear migraciones de `productions`, `songs`, `versions`, `comments`, `studio_sessions`.
- No implementar hash de integridad (sí se pueden **definir** las interfaces de frontera).
- No construir interfaz de los módulos funcionales más allá del endpoint de humo del Sprint 1.

---

## 6. Decisiones de infraestructura cerradas

- **Repositorio:** cuenta personal de GitHub (`Bastian2704`), **público** (`D2.2`, con controles compensatorios obligatorios).
- **Dominio:** `trackstudio.site`. Namespace del claim de Auth0: `https://trackstudio.site/roles` (`D4.8`).
- **Correo del proyecto:** `trackstudioec@outlook.com`.
- **Región AWS:** `us-east-1`. **Gestor de paquetes JS:** npm. **Tablero:** Jira.

**Drift reconciliado** (detectado 2026-09-02): el handoff de backend (31-ago) registró que el SDK real de Auth0 para Laravel es `auth0/login` **v7** y no "v4.x" como decía una restricción del documento de tesis) y que conviene actualizar la tabla de versiones (D2.1) con las versiones ya instaladas. Corregir en el ADR/documento la próxima vez que se toquen.

---

## graphify

Grafo de conocimiento del código en `graphify-out/`. Para preguntas sobre el codebase: `graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concepto>"` antes de grep o de leer el repo entero. Tras cualquier cambio de código: `graphify update .` (solo AST, sin costo de API). Es memoria **del código**, no de la conversación; la memoria entre sesiones la cargan las specs y los handoffs.
