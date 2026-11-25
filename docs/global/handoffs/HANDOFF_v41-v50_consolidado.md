# Handoff consolidado v41–v50 — Track Studio

**Periodo:** 2026-11-16 → 2026-11-25 · **Sprint:** 5 (con la ampliación de alcance) · **Capa(s):** backend / frontend / diseño (Figma) / backlog / global
**Qué es:** la unificación de `HANDOFF_v41.md` a `HANDOFF_v50.md` que pide la regla 9 de `PLANTILLA-HANDOFF.md`. Contiene **solo** lo de esos diez. El estado posterior está en `HANDOFF_v51.md` y siguientes.

> Escrito el 2026-11-25, en la sesión de v50. Los originales v41–v50 se archivan en [`trackstudio-documentacion/Handoffs`](https://github.com/Cheboy04/trackstudio-documentacion/tree/main/Handoffs). Cuando un dato de aquí choque con un handoff posterior, **manda el posterior**.
>
> `HANDOFF_v45.md` lleva pegado al final, sin título propio, el handoff de la sesión de `TS-90` (2026-11-23). Aquí se cita como **v45b**.

---

## 1. Resumen ejecutivo

Se cerró el S4 y R1 y se ejecutó la mayor parte del S5, replanificado con la ampliación de alcance que pidió el comité:

- **Cierre del S4 y de R1** (v41): sprint 72 cerrado; HU-01..HU-16 en `Listo` (55/92 SP de la baseline, más 3 SP de `TS-85`).
- **Ampliación de alcance** (v41 §7b): flujo de revisión, motivo de la versión, análisis técnico en el navegador, A/B con curvas, correos, dashboard del proceso y varios productores (27 SP). Se crearon `TS-87`..`TS-96` y `TS Sprint 6` (id 74). El S5 quedó en 29 SP.
- **Implementado en el periodo:**
  - `TS-31` (HU-20, acceso del artista, v42);
  - `TS-32` (HU-21 parte A, vista restringida, v43);
  - `TS-28` (HU-17, comentar en una marca, v44 y v45; PR #68);
  - `TS-90` (motivo de la versión, v45b);
  - `TS-29` (HU-18, comentarios en la línea de tiempo, v46 y v47; PR #70);
  - `TS-91` (análisis técnico, v48 y v49; PR #71).
- **Descartado** (v50): varios productores (`TS-96` y `TS-89`), por decisión del equipo con el productor de Millenium Sound. El S5 queda en 28 SP y la ampliación en 26.

Al cerrar v50 quedaban `TS-30` (HU-19), la parte B de HU-21, `TS-92`, `TS-73`, `TS-74`, `TS-44` y la evidencia de calidad (`TS-35`..`TS-37`).

## 2. Qué se hizo (cronología)

| v | Fecha | Foco | Resultado |
|---|---|---|---|
| v41 | 11-16 | Cierre del S4, planificación y replanificación del S5 | Sprint 72 cerrado; `TS-86`; `sprint-05.md`; ampliación aprobada, `TS-87`..`TS-96` y `TS Sprint 6` creados. |
| v42 | 11-17 | `TS-31` (HU-20) | `production_access`, invitación con token, `SmtpMailer` (Resend por SMTP), `MAIL_DELIVERY_FAILED` (502). Backend 548 passed; frontend 362; C3 frontend 28 mutaciones. Guía de Railway y Auth0 para el equipo. |
| v43 | 11-18 | `TS-32` (HU-21, parte A) | `scopeAccessibleBy`, `GET /productions` para los dos roles, `/producciones` con tarjetas y «⋮», detalle de solo lectura y edición en modal. C3 20/20 backend y 16/16 frontend. |
| v44 | 11-20 | `TS-28` (HU-17) | `comments`, `CommentForm` dentro de `VersionPlayer`. C3 backend 34 (29 rojo, 4 equivalentes); frontend 35/35. |
| v45 | 11-22 | Review del PR #68 | Marca durante la renovación (`resumeAt`) y 2000 caracteres por punto de código. PR #68 fusionado (`eb2ee40`). |
| v45b | 11-23 | `TS-90` (motivo) | `change_category` con CHECKs, `ensureChangeReason`, chips en `VersionUpload`. C3 backend 20 (19 rojo); frontend 25/25. Marcos `2164:*` en `TS-88`. |
| v46 | 11-23 | `TS-29` (HU-18) | `GET /versions/{version}/comments`, `CommentTimeline`, `CommentList`, botón «Comentar en {marca}». C3 backend 17/17. Marcos 6-10 en `TS-88`. PR #70. |
| v47 | 11-23 | `ts-18.08` | C3 frontend 65/65 tras cerrar dos huecos y quitar duplicación en `CommentForm`. |
| v48 | 11-24 | `TS-91` (`.01`-`.07`) | `versions.analysis` (`jsonb`), `TechnicalCheck` en el backend, Web Worker con BS.1770 en el frontend. Coincide con `ffmpeg` (±0,5). Marcos 11-15 en `TS-88`. |
| v49 | 11-24 | `TS-91` (`.08`) | C3 frontend 92/92 tras 4 tests nuevos; prueba manual del juego de demo; sin nota al pie. |
| v50 | 11-25 | Descartar varios productores | `TS-96` y `TS-89` comentadas, etiquetadas `descartado`, al backlog y en `Listo`; objetivo del S5 a 28 SP; docs actualizados; consolidación v41–v50. |

## 3. Decisiones vigentes (con su documento dueño)

**Alcance y backlog** (`roadmap.md`, `ampliacion-alcance-2026-11.md`, `CLAUDE.md` §5)
- **Ampliación aprobada el 2026-11-16**, repartida entre S5 y S6, unos 5 SP más por semana. El alcance principal y Figma no se recortan; si hace falta, caen primero los correos y luego el dashboard (v41).
- **Fuera:** resumen con IA (costo), aislamiento por productor, notificaciones dentro de la app (`TS-82`) y `TS-81`.
- **Varios productores descartado el 2026-11-23** (v50): `TS-96` y `TS-89` cerradas como descartadas; `revoked_by` queda fuera de alcance (HU-20 §1, ERD §3.7). El nombre del productor en los comentarios sigue siendo `author.name ?? «Productor»` (v46 dec. 4).
- **HU-21 se parte:** parte A hecha; la parte B (el artista comenta) espera a HU-19 (v43).
- **Las pantallas nuevas se prototipan antes en `TS-88`**, en la página «TS-88 · Ampliación» (`2162:12`) del archivo `uDajU3zIBNlPk6a2ZKUgIc` (v41, v46).

**Acceso del artista** (specs HU-20 y HU-21, ADR D8.1, D3.1)
- Invitación con token de 7 días guardado como SHA-256; revocar es idempotente; aceptar no reactiva a un `inactivo`; la ruta `/invitacion/:token` es pública (v42).
- **Si falla el correo, se revierte todo:** 502 `MAIL_DELIVERY_FAILED` (v42).
- **La Action de Auth0 «Assign artista role»** asigna `artista` a toda cuenta nueva y va después de «Add roles to tokens» (v43). `TS-97` propone limitarlo a quien viene de una invitación.
- **`Production::scopeAccessibleBy($sub)` es la única regla de acceso del artista** (v43).
- **Un solo listado `/producciones`** para los dos roles; el «⋮» con Editar y Eliminar solo en esas tarjetas (v43).

**Comentarios** (specs HU-17 y HU-18)
- **La marca se fija al pulsar «Comentar en {marca}»** y no con el primer carácter (v46 dec. 1, enmienda de HU-17).
- **Durante la renovación de la URL, la posición es `resumeAt`** (v45).
- **Los límites de longitud se cuentan por punto de código** (`[...s].length`), como `mb_strlen` (v45).
- **Se acepta el orden 422 → 404** en una versión sin verificar (v45).
- **Marcadores decorativos (`aria-hidden`) en HU-18**, agrupados al 2 % de la duración; el listado es el camino accesible. El salto y el área de 24 × 24 px llegan con HU-19 (v46).
- **Sin paginación** en el listado de comentarios (v46).

**Motivo de la versión** (spec TS-90, ERD §3.5)
- Obligatorio si la canción ya tiene una versión verificada, no por número; en la primera la categoría es opcional, pero con categoría el texto es obligatorio. Los dos errores van juntos. No se edita. Una categoría por versión (v45b).

**Análisis técnico** (specs TS-91, ADR D7.9 y D7.10)
- Calculado en el navegador, en un Web Worker; advierte y no bloquea. Si el análisis da 422, se reintenta sin él (v48).
- **Las advertencias las calcula el backend** en `VersionResource`, para que `TS-95` use la misma regla (v48).
- Rango de dB hasta +20; tope de 20 min, y de 10 min para MP3; espera de 15 s; silencio por debajo de −60 dBFS (v48).
- «Solo se revisa en el master» para lo que no es master; sin nota al pie; la insignia de un master correcto es «Chequeo sin advertencias» (v48, v49).
- **D7.10 sigue PARCIAL:** los umbrales esperan al productor y llegan en `thresholds`.

**Proceso** (decisiones del equipo)
- **Excepción de la regla 2 por tarea:** el agente escribió código en el Green frontend de HU-17 (v44), el backend y el frontend de HU-18 (v46), las correcciones de `ts-18.08` (v47) y los cambios de `TS-91` tras la prueba manual (v49).
- **Commits en inglés** (v45); falta escribirlo en `reglas-git.md`.
- **Sin firmas de agente en commits ni PRs** (`reglas-git.md` §3; recordado en v49 y v50).
- **Un hallazgo de review se cierra en el mismo PR** (metodología §9; v47).

## 4. Trampas y hallazgos (las que siguen siendo útiles)

**C3**
- **Si sobrevive una mutación, quita todas las copias a la vez:** si entonces cae, es duplicación; si no, es un hueco de test (v47).
- **Un test que comprueba la ausencia de algo que esa rama nunca pinta siempre da verde** (v47).
- **Las señales estacionarias y simétricas no prueban BS.1770:** hacen falta niveles distintos, una señal por debajo de −70 LUFS, una transición corta y una señal asimétrica (v49).
- **Los scripts de C3 viven en el scratchpad y no persisten:** el patrón (reemplazo exacto, ejecutar tests, restaurar y comprobar sha256) está en las specs (v44, v46).

**Frontend**
- **Un `GET` nuevo en un componente rompe tests que montan la misma página o cuentan peticiones:** súbelo al padre o busca con `grep -rl "<Página>" src | grep test` (v42, v45b).
- **`StrictMode` + `useMutation` lanzada al montar:** `setTimeout(() => mutate())` y `clearTimeout` en el cleanup (v42).
- **El `<audio>` con `key` empieza en 0** hasta `onLoadedMetadata`; cualquier lectura de la posición tiene que usar `resumeAt` (v45).
- **Zod `.max()` cuenta UTF-16; Laravel `max:` usa puntos de código** (v45).
- **`Math.min(x, null)` da 0;** un 422 no implica `VALIDATION_ERROR` (v44).
- **React Hook Form:** `setFocus` tras `reset()` falla, así que se usa una `ref` propia; `useWatch` y no `watch` (v44, v46).
- **`<legend>` debe ser el primer hijo del `<fieldset>`,** y el grupo necesita `role="radiogroup"` explícito (v45b).
- **Corre `tsc -b` (build) antes de cerrar un Green:** Vitest no detecta los fallos de tipos en las fixtures (v45b).
- **Temporizadores falsos:** `waitFor` y `findBy` se cuelgan; usa `act` y `vi.advanceTimersByTimeAsync` (v48).
- **`vi.mock` de un módulo inexistente impide cargar el archivo entero:** pon los tests nuevos en un archivo aparte (v48).
- **`npx shadcn add`** instala `cn` y reescribe imports: restaura `package.json` y el lockfile y genera desde `--view` (v43).
- **Base UI en jsdom:** con un `Dialog` abierto, consulta fuera con `{ hidden: true }` (v43).
- **Pasa `npm run format:check` antes de cada commit del frontend** (v48).
- **Los tests de `main`** van cerca del límite de 5 s (v46, v47).

**Backend y entorno**
- **Tras un merge o una HU con migración:** `docker exec -u sail backend-laravel.test-1 php artisan migrate`; Pest no lo detecta y staging necesita lo mismo (v44).
- **`FormRequest` valida antes que el Service:** si un 404 debe ganar, la comprobación va en `authorize()` o en el binding (v45).
- **Pest:** las funciones globales no se redeclaran entre archivos, así que van en `tests/Pest.php` (v46). `factory()->make()` crea los padres (v42).
- **PHPStan `LARAVEL_VERSION`:** `phpstan clear-result-cache` (v44).
- **`sail psql -c` no ejecuta:** `sail exec pgsql psql -U sail -d laravel -c "…"` (v43).
- **El token de la invitación solo se ve con `MAIL_MAILER=log`** en `storage/logs/laravel.log` (v43).
- **Railway puede bloquear SMTP saliente** fuera del plan Pro: la salida es `MAIL_MAILER=resend` (v42, sin verificar).
- **Ruta GET inexistente → 500 en vez de 405** (v46; decide el equipo).

**Audio**
- **`ffmpeg ebur128` sobrestima el pico real de un seno puro a fs/4:** usa ruido o material realista como referencia (v48).
- **Calcula la atenuación de un filtro antes de fijar un margen;** mono frente a estéreo da unos 3 dB (v48).

**Figma, Jira y herramientas**
- **Figma:** carga `figma-use` y `figma-generate-design` antes de `use_figma`; el archivo no tiene variables; clonar no toca el original (v46).
- **Jira:** el MCP de Atlassian da 503 a menudo y vuelve limpiando la autenticación con `/mcp` (v45b, v50). `manageJiraSprint` con `update` reescribe nombre, fechas y objetivo (v50). `text ~` es difuso, así que revisa cada resultado (v50). El flujo no tiene estado de descarte (v50).
- **GateGuard** bloquea el primer Bash y el primer Write/Edit de cada archivo; solo cuentan como búsqueda `grep`, `find` o Glob (v44, v46, v47).
- **zsh:** cita los patrones de `grep --include` (v46).
- **`set -o pipefail` + `grep -q`** mata por SIGPIPE (v48).

## 5. Drift: estado al cerrar v50

| Drift | Dueño | Estado |
| --- | --- | --- |
| `HANDOFF_v40.md` suelto con el consolidado v31–v40 ya creado | Handoffs | Se archiva junto con v41–v50 |
| `HANDOFF_v45.md` contiene también el handoff de `TS-90` sin título | Handoffs | Registrado aquí (v45b); se archiva tal cual |
| `reglas-git.md` no dice que los commits van en inglés | `reglas-git.md` §3 | Pendiente (v45) |
| Comentarios con referencia a la spec borrados en `commentSchema.ts` y `VersionPlayer.tsx` | Equipo | Pendiente (v45) |
| Marco 5 de `TS-88` (geometría, promete HU-19, «Subida por Alex») | Figma | Pendiente (v46) |
| Marco 12 de `TS-88`: «No se revisa en mezclas» y la nota al pie retirada | Figma / `TS-73` | Pendiente (v48, v49) |
| Fecha en 24 h (Figma) frente a 12 h (app) | Spec HU-14 / `TS-74` | Pendiente (v46) |
| Figma 2b: posición de «Quitar categoría» | `TS-73` | Pendiente (v45b) |
| Descripciones de Jira de `TS-28` y `TS-29` con referencias viejas | Jira | Pendiente (v44, v46) |
| Checklists de Jira de `TS-90` y `TS-91` sin marcar | Jira | Pendiente (v45b, v49) |
| Prueba de «solo borra los suyos» de HU-19 con dos productores (usuarios de factory) | Spec HU-19 | Revisar al especificar HU-19 (v50) |
| `TS-81` y `TS-46`..`TS-48` en `Listo` antes de lo previsto | Equipo | Sin confirmar (v41) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente |

## 6. Bloqueos y pendientes al cerrar v50

- **`.09` del equipo:** `TS-90`, `TS-91` (migración en staging y prueba con MP3) y la comprobación en staging de `TS-29`.
- **Sprint 5 por hacer:** `TS-30` (HU-19, con su marco en `TS-88`), la parte B de HU-21, `TS-92` (revisión), `TS-73`, `TS-74` y las casillas `.s5` de `TS-35`..`TS-37`.
- **Equipo, sin el agente (regla 6):** `TS-44` (producción).
- **Decisiones abiertas del equipo:**
  - la carrera de `InvitationService.php:43` (v42);
  - `TS-97`, el rol `artista` para toda cuenta nueva (v43);
  - formato de fecha (`TS-74`);
  - `timeout` de los tests de `main`;
  - mapear el 405 en el handler de D3.1.
- **PR #53, #54 y #55** (evidencia de calidad S2 y S3), abiertos desde el 2026-11-02 (v41).
- **`graphify`** no está instalado.
- **ABIERTOS en el ADR, sin bloquear:** 5.8, 8.5 y 11.5; D7.10 PARCIAL.

## 7. Próximos pasos (tal como quedaron en v50)

1. Integrar la PR de `chore/TS-96-descartar-varios-productores` (descarte, v50 y este consolidado).
2. `TS-92` (flujo de revisión): marco en `TS-88` y spec backend.
3. `TS-30` (HU-19), luego la parte B de HU-21 y `TS-74`.
4. En S6, `TS-93` (A/B) lee las series de `versions.analysis` y reutiliza `formatDb`, `TechnicalCheck` y `changeCategoryLabel`.

## 8. Huecos de handoffs

Ninguno. La sesión de `TS-90` no tiene archivo propio porque quedó dentro de `HANDOFF_v45.md` (v45b).

## 9. Cómo retomar el entorno (referencia de v41–v50)

```fish
nvm install && nvm use                                  # Node (.nvmrc)
cd frontend && npm ci && npx vitest run --maxWorkers=2 && npm run format:check && cd ..
cd backend
./vendor/bin/sail up -d && ./vendor/bin/sail composer install
docker exec -u sail backend-laravel.test-1 php artisan migrate
```

- **Variables nuevas del `.env` del backend:** `MAIL_TIMEOUT` y `FRONTEND_URL`. En local, `MAIL_MAILER=log` (v42).
- **Juego de demo de audio:** `cd frontend && bash scripts/audio-demo.sh` (`frontend/demo-audio/`, en `.gitignore`). Las referencias de `ffmpeg` se regeneran con `scripts/ebur128-fixtures.sh` (necesita `ffmpeg` con `libmp3lame`; el CI no) (v48, v49).
- **Jira:** proyecto `TS`, tablero 3; `TS Sprint 5` es el id 73 y `TS Sprint 6` el id 74.

## 10. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. **La próxima consolidación toca al cerrar v60 y cubre v51–v60.**
