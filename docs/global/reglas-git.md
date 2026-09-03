# Reglas de Git (Track Studio)

Documento **global**. Define el modelo de ramas y **qué puede y qué no puede hacer el agente** con el control de versiones. Aplica a todo el monorepo.

**Fuente de verdad del "qué se construye" para nombrar ramas/commits:** el ID de la historia/tarea en **Jira**. Este documento define el _formato_; el ID real sale del tablero.

---

## 1. Regla dura: el agente lee, no escribe

El control de versiones lo ejerce **exclusivamente el equipo humano**. Cada commit del repositorio es un punto donde una persona leyó un diff y dijo que sí. Los commits frecuentes son además la red de reversión si algo se cuela — más importante todavía porque **el repo es público** (`D2.2`): un secreto o un dato real del cliente que entra al historial no se borra con un commit más.

| El agente **SÍ** (solo lectura)                               | El agente **NUNCA** (escritura)               |
| ------------------------------------------------------------- | --------------------------------------------- |
| `git status`, `git branch`, `git log`, `git diff`, `git show` | `git commit`, `git add`                       |
| Leer en qué rama está para rellenar los comandos de entrega   | `git push`                                    |
| Inspeccionar el historial para dar mejor guía                 | `git checkout` / `switch` / `git checkout -b` |
|                                                               | `git merge`, `git rebase`, `git reset`        |
|                                                               | `git tag`, `git branch -d/-D`, `git stash`    |

Si el agente cree que hace falta una operación de escritura, **no la ejecuta**: entrega el bloque de comandos (§4) y se detiene.

---

## 2. Modelo de ramas — git-flow simplificado

Del plan CI/CD del proyecto: `feature/* → develop (staging) → main (producción, con aprobación manual)`.

| Rama                     | Rol                                                       | Nace de   | Vuelve a                                               |
| ------------------------ | --------------------------------------------------------- | --------- | ------------------------------------------------------ |
| `main`                   | Producción. Instancia operativa de Milenium Sound.        | —         | — (solo por PR desde `develop`, con aprobación manual) |
| `develop`                | Integración / staging. Un merge aquí despliega a staging. | `main`    | —                                                      |
| `feature/TS-<id>-<slug>` | Una historia/tarea.                                       | `develop` | `develop` por **Pull Request**                         |
| `fix/<slug>`             | Corrección menor no atada a una historia.                 | `develop` | `develop` por PR                                       |
| `hotfix/<slug>`          | Urgencia en producción.                                   | `main`    | `main` **y** `develop`                                 |

- **Nunca `push` directo a `main` ni a `develop`.** Todo entra por PR con 1 review (y CI verde cuando el workflow exista — T-11). `main` y `develop` tienen branch protection (T-03).
- Las features nacen de `develop` y vuelven por PR hacia `develop`. A `main` solo se llega por PR desde `develop` con aprobación manual (se ejerce plenamente en Sprint 8 / R3).

---

## 3. Convención de nombres

**Ramas:** `feature/TS-<id>-<slug>` — `<slug>` corto en `kebab-case`. Ej.: `feature/TS-34-forbidden-formato-d3-1`.

**Commits — formato propuesto (a aprobar):**

```
<tipo>(<scope>): TS-<id> <descripción imperativa breve>
```

- `<tipo>`: `feat` · `fix` · `docs` · `ci`
- `<scope>` (área del monorepo): `backend` · `frontend`
- `TS-<id>`: clave de la historia/tarea en Jira
- Ejemplo: `feat(backend): TS-34 responder 403 FORBIDDEN en formato D3.1`

> **Por qué este formato.** Reconcilia las dos formas que ya aparecen en los documentos del proyecto: el `CLAUDE.md` actual pide _"Conventional Commits con ID de historia — `TS-XX: descripción`"_, y el handoff de backend usó `chore(backend): scaffold Laravel 13 + Sail`. Este formato cumple las dos a la vez. **Si prefieres la forma corta `TS-<id>: descripción` sin `tipo(scope)`, dilo y se cambia aquí — es el único sitio donde vive la convención.**

---

## 4. Regla de entrega (obligatoria)

Como el agente no ejecuta git, **cada vez que arranca y cada vez que cierra una tarea entrega un bloque de comandos copy-paste**, ya rellenado con la rama y el ID reales (leídos con `git branch`/`git status` y del tablero de Jira). Sin ese bloque, la tarea no está entregada.

- **Antes de tocar nada:** el agente informa en qué rama debería estar el trabajo y da los comandos para crearla. Si la rama correcta no existe (falta `develop`) o **no conoce el `TS-<id>` real**, lo dice y **frena** — no empieza en la rama equivocada ni inventa el ID.
- **Al terminar:** entrega el bloque de cierre (`add`, `commit` ya redactado según §3, `push`, apertura de PR hacia `develop`).

### 4.1 Bloques de comandos

**Arrancar una tarea** (`<id>` = clave de Jira; `<slug>` corto):

```bash
git checkout develop && git pull
git checkout -b feature/TS-<id>-<slug>
```

**Cerrar una tarea:**

```bash
git add -A
git commit -m "<tipo>(<scope>): TS-<id> <descripción imperativa>"
git push -u origin feature/TS-<id>-<slug>
# abrir PR hacia develop en GitHub
```

**Empecé a trabajar sin rama** (los cambios sin commitear viajan con el `checkout -b`):

```bash
git status                                # confirmar que NO hay commits, solo cambios sin stage
git checkout -b feature/TS-<id>-<slug>    # se lleva el trabajo consigo
```

**Guardar trabajo a medias para cambiar de contexto:**

```bash
git stash push -m "TS-<id> wip"
git stash list
git stash pop
```

**Limpiar después de que el PR se fusionó:**

```bash
git checkout develop && git pull
git branch -d feature/TS-<id>-<slug>              # local
git push origin --delete feature/TS-<id>-<slug>   # remota
git remote prune origin
```

**Arranque inicial del repo** (una sola vez — pendiente en el proyecto: crear `develop`):

```bash
git checkout main && git pull
git checkout -b develop
git push -u origin develop
```

---

## 5. Cuándo commitear y cuándo pushear

| Momento                                                                                          | Acción                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Tests en verde y una unidad lógica terminada                                                     | `commit` (uno por unidad coherente, no un commit gigante al final) |
| Fin de la tarea, o se quiere respaldo/revisión remota                                            | `push`                                                             |
| Tarea completa, AC de capa cubiertos, tests verdes y **probados en rojo** (C3 de la metodología) | `push` + abrir **PR hacia `develop`**                              |
| Nunca                                                                                            | `push` directo a `main` o a `develop`                              |

---

## 6. Deudas y trampas registradas

- **Clave de Jira pendiente.** El formato usa `TS-<id>`, pero la clave real del proyecto y el mapeo HU↔issue se confirman cuando se puebla el tablero (T-08). Hasta entonces, si el agente no conoce el `<id>` real, **lo pide y frena**; no lo infiere.
- **Trampa del import a Jira (aprendida del proyecto de referencia):** al importar el backlog por CSV, el `Issue Id` del CSV **no** es el `TS-<id>` que asigna el tablero. Nombrar ramas/commits con el ID del CSV lleva a colisiones. Usar siempre el ID **del tablero**, verificado, no el del archivo de importación.
- **Repo público:** antes de cada PR, revisar que el diff no arrastre `.env`, secretos ni datos reales del cliente. `.env` está en `.gitignore` (verificado); mantenerlo así.
