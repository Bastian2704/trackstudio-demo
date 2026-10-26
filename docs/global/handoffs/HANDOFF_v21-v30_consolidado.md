# Handoff consolidado v21–v30 — Track Studio

**Periodo:** 2026-10-08 → 2026-10-23 · **Sprint:** 2 → 3 · **Capa(s):** backend / frontend / infraestructura / global
**Qué es:** la unificación de `HANDOFF_v21.md` a `HANDOFF_v30.md` que pide la regla 9 de `PLANTILLA-HANDOFF.md`. Contiene **solo** lo de esos diez. El estado posterior está en `HANDOFF_v31.md` y siguientes.

> Escrito el 2026-10-26 (`TS-79`). Los originales v1–v30 se archivaron en [`trackstudio-documentacion/Handoffs`](https://github.com/Cheboy04/trackstudio-documentacion/tree/main/Handoffs). Cuando un dato de aquí choque con un handoff posterior, **manda el posterior**.

---

## 1. Resumen ejecutivo

Se cerró el Sprint 2 y se ejecutó casi todo el Sprint 3:

- **S2:** HU-08 (`TS-19`, producciones), HU-06 (`TS-17`, listado de artistas), HU-07 (`TS-18`, estado del artista) y HU-10 (`TS-21`, canciones). `TS-20` (HU-09) pasó al S3, porque sus reglas cuentan canciones y en el S2 todavía no existía `songs`.
- **S3:** bucket S3 e IAM (`TS-42`), base visual de Figma (`TS-68`), borrado en cascada (`TS-23`) y los hotfixes de seguridad de PHP (`TS-77`) y Node (`TS-78`).
- Todas las historias están en `develop` y en *Listo*. Solo faltan sus comprobaciones `.09` en staging, que hace el equipo y no bloquean el Done.

Al cerrar v30 quedaban pendientes:

- `TS-79`, la reconciliación de la documentación.
- `TS-69` y `TS-70` (UI Figma).
- Evidencia de tesis (`TS-46`, `TS-53`) y de calidad (`TS-35`..`TS-37`).
- Las comprobaciones en staging y en Railway.

## 2. Qué se hizo (cronología)

| v | Fecha | Foco | Resultado |
|---|---|---|---|
| v21 | 10-08 | TS-19: frontend de HU-08 | 67 tests y 30 mutaciones C3. PR #33 integrado. Artista por URL anidada como apaño temporal. |
| v22 | 10-08 | TS-17: backend de HU-06 | `GET /artists` paginado con producciones. 218 tests y 18 mutaciones C3. Spec frontend en borrador. |
| v23 | 10-12 | TS-17: frontend de HU-06 | `/artistas`, 92 tests y 26 mutaciones C3. PR #36. |
| v24 | 10-13 | TS-18: HU-07 en las dos capas | `PUT /artists/{artist}/status`, con auditoría en el log. PR #38. Criterio de Done nuevo. TS-20 → S3 y TS-21 → S2. |
| v25 | 10-14 | TS-21: HU-10 en las dos capas | CRUD de canciones. Backend con 303 tests y 50 mutaciones; frontend con 138 tests y 35 mutaciones. PR #39. |
| — | 10-15 → 10-21 | **Sin handoff** | Planificación del S3 (PR #41), D9.2 (10-15), TS-22 (#42), TS-24 (#44, con la enmienda de D7.1 del 10-20), TS-20 (#45). Ver §5. |
| v26 | 10-20 | TS-42: bucket e IAM | Lo hace el equipo en la consola. D7.8 (versioning y lifecycle) aprobada. Evidencia con el perfil de la API. PR #43. |
| v27 | 10-22 | TS-68: review | 11 mutaciones C3 y comparación con Figma `1:76`. Se corrigen `--ring`, `--card`, `--radius` y el logotipo móvil. PR #46. |
| v28 | 10-22 | TS-23: HU-12 en las dos capas | Cascada producción → canciones → versiones en una transacción. 395 + 248 tests. PR #47. |
| v29 | 10-22 | TS-77: PHP 8.4.27 | PHP2Shell y avisos de `composer audit`. Tests guardianes del runtime. PR #48. |
| v30 | 10-23 | Cierre de TS-78 y apertura de TS-79 | Node 24.22.1 y `npm audit` (PR #49). Se abre la reconciliación de la documentación. |

## 3. Decisiones vigentes (con su documento dueño)

**Proceso (decisiones del equipo)**
- **Criterio de Done (v24):** una historia pasa a *Listo* al mergearse en `develop`. La comprobación en staging (`ts-XX.09`) la hace el equipo aparte y no bloquea el Done.
- **TS-20 pasa a S3 y TS-21 a S2 (v24):** las reglas de formato cuentan canciones.
- **Mensajes de commit en inglés** (v22). Desde el 2026-10-23, sin trailers de autoría de agentes (`reglas-git.md` §3).
- **Evidencia del rojo en CI:** abre el PR en borrador **antes** de empujar el commit rojo (v22).
- **D9.2 (ADR, 2026-10-15):** Railway migra en cada despliegue (`migrate --force`). El rollback está en D9.4 y en el runbook §4.

**Producciones y artistas en el frontend (specs frontend HU-06, HU-07 y HU-08)**
- El borrado se confirma con un `AlertDialog` controlado: Escape no lo cierra mientras el `DELETE` está en curso. Tras un 204, se vuelve con aviso (v21).
- `noticeFrom` vive en `src/lib/notice.ts`, porque el estado `{ notice }` es un contrato entre pantallas (v21).
- `/artistas?page=N`, con las producciones como enlaces y «Nueva producción» en Acciones. Sustituye el apaño de la URL anidada de HU-08 (v22).
- `FORMAT_LABELS` vive en `productionSchema.ts` y `STATUS_LABELS` en `artistSchema.ts` (v23, v24).

**Estado del artista, HU-07 (specs HU-07)**
- El productor solo activa o desactiva con `{ "active": bool }`. Al reactivar, el servidor deriva `invitado` o `activo` a partir de `user_id`. La operación es idempotente.
- La auditoría es un log estructurado `artist.status_changed`, sin cambiar el esquema.
- Ruta separada `PUT /api/v1/artists/{artist}/status`. La sección «Estado» va en la edición, y solo desactivar pide confirmación.

**Canciones, HU-10 y HU-12 (specs HU-10 y HU-12, ERD §3.4)**
- El alta va anidada: `POST /productions/{production}/songs`. El borrado es lógico y compacta las posiciones a `1..n`. Si el artista está `inactivo`, el alta da 422 en `errors.production`.
- La cascada producción → canciones → versiones entra en HU-12, en una transacción. Los objetos de S3 se conservan (D4.5).
- El borrado se hace desde el listado, con el nombre de la canción en el diálogo. Si la página se queda vacía, se retrocede una. La API no pide parámetro de confirmación: la protege la Policy.
- El frontend no muestra `position` (es del listado, HU-11).

**Infraestructura S3 (ADR D7.1–D7.8, v26)**
- Bucket `trackstudio-audio-staging` en `us-east-1`: privado, SSE-S3 y versioning (D7.8). Lifecycle: las versiones no actuales expiran a los 30 días, los delete markers huérfanos se borran y las multipart incompletas se abortan a los 7 días.
- Usuario IAM `trackstudio-api`, y no un rol, porque Railway corre fuera de AWS. Permisos: `PutObject` y `GetObject`, con `Deny` explícito en `db-backups/*`. Sin `DeleteObject` ni `ListBucket`.
- **D7.1 enmendada el 2026-10-20:** la subida pasa de presigned PUT a **presigned POST**, porque `content-length-range` (D7.7) solo existe en POST (trampa 1 de v26).

**Runtime (ADR D2.1, v29–v30)**
- PHP **8.4.27** (sin pasar a 8.5) y Node **24.22.1**. Los tests guardianes `PhpRuntimeTest`, `DependencyAdvisoriesTest` y `frontend/runtime.test.ts` hacen cumplir los mínimos.
- En el CI, `setup-php` va con `"8.4"` + `update: true`, porque no acepta versión de parche.
- **Riesgo aceptado:** 7 avisos altos de la cadena `shadcn` → `braces`, sin corrección. Solo afectan al desarrollo (spec TS-78 §3.4).

## 4. Trampas y hallazgos (las que siguen siendo útiles)

**Tests del backend**
- **Un 405 sale como 500 `INTERNAL_ERROR`:** el manejador D3.1 no mapea `MethodNotAllowedHttpException`. Sigue sin tarea (v22).
- **`whenLoaded('x')` sin closure devuelve `MissingValue`.** La transformación va como segundo argumento.
- **Para probar un desempate por `id` hay que fijar los UUID a mano** y usar varios empates, porque los UUID se ordenan por tiempo.
- **Si el método del controller no tipa el modelo, `can:` recibe el id crudo** y da 403 donde se espera 404.
- **Pest cuenta las aserciones de `Log::spy()` y las transacciones abortadas (`25P02`) como `errors`, no como `failed`.** Un script de C3 tiene que contar los dos.
- **Una migración nueva no llega sola a la base local:** la suite pasa gracias a `RefreshDatabase`. Antes de probar a mano, corre `sail artisan migrate:status`.
- **Con `APP_DEBUG=true`, el `detail` del 500 incluye SQL y valores.** Staging y producción deben tener `APP_DEBUG=false`.
- **`sail psql -c` no imprime nada fuera de una terminal.** Usa `sail exec -T pgsql sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "…"'`.
- **`docker exec` sin `-u sail` corre como root** y deja `/tmp/phpstan` a nombre de root.
- **La imagen de Sail no fija el parche de PHP** (usa el PPA `ondrej/php`), así que cada `sail build` puede cambiarlo. Lo detecta `PhpRuntimeTest`.
- **En el CI, `env:` va al nivel del step**, como hermano de `with:`.
- **El editor puede formatear PHP con reglas distintas a las de Pint.** Pasa `sail pint` antes de commitear.

**Tests del frontend**
- **Un diálogo modal oculta el resto de la página a RTL:** `queryByRole('status' | 'alert')` no encuentra nada. Cierra el diálogo antes de comprobar los avisos.
- **`findBy…` puede encontrar el elemento en la rama `isPending`.** Espera primero a una señal de error.
- **Un componente que se desmonta oculta estado colgado.** En los diálogos controlados, prueba el ciclo de ida y vuelta.
- **`useParams` no conoce las rutas:** un nombre mal escrito compila y genera URLs como `//songs`. Afirma la URL exacta.
- **Vitest no comprueba tipos:** un `import` que falta tumba todos los tests de `App.test.tsx`. `tsc -b` lo detecta antes.
- **Un mock de la API que responde a cualquier `GET` esconde la navegación a un id equivocado.** Para probar que se pinta la respuesta, haz que difiera de lo escrito.
- **Claves de caché compartidas en la página 1:** para probar la invalidación por prefijo hace falta ir a la página 2. El `QueryClient` de los tests tiene `staleTime` 0 y el de la app, 30 s.
- **`<select>` con opción vacía:** usa `z.string().pipe(z.enum(…))` y `useForm<Input, unknown, Output>`.
- **`npx shadcn add` puede meter dependencias espurias** (`cn`). Revisa el diff de `package.json` después de cada generador.
- **Los wrappers de shadcn reenvían props:** la API real está en el tipo de Base UI.
- **Una variable CSS inválida (`--ring: cabeff`) no rompe ni el build ni los tests.** Solo se ve midiendo el estilo computado.
- **Si mueves una constante de archivo, revisa el `import type` que queda.** Los tests no lo detectan.

**Herramientas y entorno**
- **Playwright MCP busca Chrome en `/opt/google/chrome`.** En su lugar sirve `brave --headless=new` con un harness de Vite. Con `--virtual-time-budget` hay que poner `transition: none` antes de medir.
- **El MCP de Atlassian puede caerse** (`EAI_AGAIN`, o un incidente de Rovo). Redacta sin Jira y contrasta los AC cuando vuelva.
- **El `!` de Claude Code ejecuta zsh, no fish**, con un shell nuevo en cada comando.
- **`npm ci` solo avisa del `engines`.** Vercel aplica la mayor (24.x) con el parche que tenga.
- **El gestor de paquetes es npm:** se borraron `pnpm-lock.yaml` y `pnpm-workspace.yaml`, que se crearon por error.

**S3**
- **`HeadObject` sobre una key que no existe da 403, no 404,** porque la API no tiene `ListBucket`. Hay que tenerlo en cuenta en `TS-25`/`TS-27` (S4).
- **Si cambia el dominio, el origen nuevo se añade a la vez en el CORS del bucket, en Auth0 y en `CORS_ALLOWED_ORIGINS`** (D7.5).
- **Residual aceptado (spec backend HU-12 §3.4):** si se borra una canción con una subida en curso, el objeto queda en S3 sin una fila vigente. La confirmación de S4 tiene que responder 404.

**Git**
- **`git merge-tree` simula un merge sin tocar nada.** Úsalo antes de entregar comandos de merge.
- **Si un archivo mezcla cambios de dos commits, usa `git add -p`.** Un commit que no compila solo (`60554a1`) desaparece con un *squash*.

## 5. Hueco de handoffs (2026-10-15 → 2026-10-21)

Estas entregas no tienen handoff propio. Su fuente es la spec y el PR:

| Trabajo | Fuente |
|---|---|
| Planificación del S3 (`TS-66`) | PR #41, [`sprint-03.md`](../../backlog/sprints/sprint-03.md) |
| D9.2, migraciones en el deploy (2026-10-15) | ADR D9.2 |
| HU-11, listado de canciones (`TS-22`) | PR #42, specs `backend/HU-11.md` y `frontend/HU-11.md` |
| HU-13, subida de audio y enmienda de D7.1 a POST (`TS-24`) | PR #44, specs `backend/HU-13.md` y `frontend/HU-13.md`, ADR D7.1 |
| HU-09, restricciones de formato (`TS-20`) | PR #45, specs `backend/HU-09.md` y `frontend/HU-09.md` |

Las trampas de esas sesiones no quedaron registradas en ningún handoff.

## 6. Drift: estado al cerrar v30

| Drift | Dueño | Estado en v30 |
|---|---|---|
| No hay README en la raíz y los de las capas son plantillas | Repo | Pendiente → `TS-79` |
| v1–v10 sueltos, v11–v20 sin consolidar | Handoffs | Pendiente → `TS-79` |
| `sprint-03.md` desfasado (`ts-11.08`, evidencia de TS-42, casillas de Jira) | `sprint-03.md` | Pendiente (v28, v30) → `TS-79` |
| `TS-35`..`TS-37` fuera del sprint en Jira | Jira | Pendiente (v30) → `TS-79` |
| «humano» en 56 documentos (regla 7) | `CLAUDE.md` | Pendiente → `TS-79` |
| `graphify-out/` ni versionado ni ignorado | `.gitignore` | Pendiente → `TS-79` |
| El CORS del bucket permite `PUT`/`GET` (v26), pero HU-13 sube con POST desde el 10-20 | Infraestructura (equipo) | Sin verificar |
| La descripción del PR #47 usa `sail psql -c` | GitHub | Pendiente (v28) |
| `sprint-03.md` no tiene subtareas `ts-39.0x` de TS-68 | `sprint-03.md` | Pendiente (v27) |
| Correcciones de Auth0 v7 y D2.1 sin llevar al documento de tesis | Tesis | Pendiente (v22–v25) |
| Ajustes de Jira: SP de TS-40, épicas en *Por hacer*, TS-61 ausente | Jira | Pendiente (v24) |

## 7. Bloqueos y pendientes al cerrar v30

- **Siguen ABIERTOS en el ADR:** 8.5 (rate limiting) y 11.5 (medición de RNF).
- **Equipo (regla 6):**
  - `php -v` en Railway (staging y producción).
  - `node -v` en el build de Vercel.
  - `APP_DEBUG=false` en staging.
  - Que el log `artist.status_changed` llegue a Railway (`ts-07.09`).
  - Smoke test.
- **Comprobaciones en staging (`.09`):** `TS-17`, `TS-18`, `TS-19`, `TS-21` (arrastre del S2), `TS-20`, `TS-22`, `TS-23` y `TS-24`.
- **Sin tarea:** el 405 que sale como 500 en el manejador D3.1.
- **Cosmético:** el menú móvil del shell no se cierra al navegar hacia atrás. Quedan clases `dark:` en `input.tsx` y una línea en blanco de más en `SongList.tsx`.

## 8. Próximos pasos (tal como quedaron en v30)

1. `TS-79`, por orden: `sprint-03.md`, READMEs, consolidación de handoffs, regla del repositorio de documentación, regla 7 y `graphify-out/`.
2. `TS-69` y `TS-70` (UI Figma).
3. Evidencia de `TS-46`, `TS-53` y `TS-35`..`TS-37`, y cierre del S3 el 2026-10-30.

## 9. Cómo retomar el entorno (referencia de v21–v30)

```fish
nvm install && nvm use                           # Node 24.22.1 (.nvmrc)
cd frontend && npm ci && cd ..
cd backend
./vendor/bin/sail build --no-cache               # solo si cambió el runtime (PHP 8.4.27)
./vendor/bin/sail up -d && ./vendor/bin/sail composer install
./vendor/bin/sail artisan migrate                # songs y versions son nuevas desde S2/S3
```

## 10. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. **La próxima consolidación toca al cerrar v40 y cubre v31–v40.**
