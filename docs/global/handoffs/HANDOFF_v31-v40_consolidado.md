# Handoff consolidado v31–v40 — Track Studio

**Periodo:** 2026-10-28 → 2026-11-13 · **Sprint:** 3 → 4 · **Capa(s):** backend / frontend / backlog / global
**Qué es:** la unificación de `HANDOFF_v31.md` a `HANDOFF_v40.md` que pide la regla 9 de `PLANTILLA-HANDOFF.md`. Contiene **solo** lo de esos diez. El estado posterior está en `HANDOFF_v41.md` y siguientes.

> Escrito el 2026-11-13, en la sesión de v40. Los originales v31–v40 se archivaron en [`trackstudio-documentacion/Handoffs`](https://github.com/Cheboy04/trackstudio-documentacion/tree/main/Handoffs). Cuando un dato de aquí choque con un handoff posterior, **manda el posterior**.

---

## 1. Resumen ejecutivo

Se cerró el Sprint 3 y se ejecutó el Sprint 4 completo, con el que se cierra R1 (HU-01..HU-16, 55/92 SP):

- **S3 (cierre):** reconciliación de la documentación (`TS-79`) y UI Figma de login, errores y artistas (`TS-69`, `TS-70`). Se registraron como candidatas post-S6 `TS-80` (Mi perfil), `TS-81` (listado de producciones con filtros) y `TS-82` (notificaciones).
- **S4:** planificación (`TS-84`), versionado verificado por ETag (`TS-25`, HU-14), URLs firmadas de lectura (`TS-27`, HU-16), reproductor (`TS-26`, HU-15) y UI Figma de producciones y canciones (`TS-71`, `TS-72`). `TS-45` y `TS-46` (tesis) figuran en *Listo* en Jira.
- Todo está en `develop` (PRs #50 a #59) salvo `TS-72`, que al cerrar v40 tiene la rama lista y el PR por abrir.

Al cerrar v40 quedaban pendientes:

- El PR de `TS-72` y sus casillas de Jira.
- Las casillas `.s4` de `TS-35`..`TS-37`, insumo del cierre de R1.
- Las comprobaciones en staging (`ts-14.09`, `ts-15.09`, `ts-16.09`) y el #10 (C4) de `TS-27`.

## 2. Qué se hizo (cronología)

| v | Fecha | Foco | Resultado |
|---|---|---|---|
| v31 | 10-28 | Cierre de `TS-79` | PR #50: sprint-03 reconciliado, READMEs, consolidación v11–v30, regla del repo de documentación, regla 7 y `graphify-out/` ignorado. |
| v32 | 10-28 | `TS-69`: login, inicio, 403 y errores | Marcos nuevos en Figma (`2101:2`), 4 tests y C3 completa; `ErrorAlert` y `AuthCard`. Candidata `TS-80`. |
| v33 | 11-02 | `TS-70`: artistas | Tarjetas por debajo de `lg`, alta en modal en ruta hija, `ArtistStatusBadge` y `artistStyles.ts`. 14 mutaciones C3. PR #52. Candidatas `TS-81` y `TS-82`. |
| v34 | 11-03 | Planificación del S4 | `sprint-04.md`; objetivo y checklists en Jira; `TS-84`. La verificación por ETag va en `TS-25`. |
| v35 | 11-03 | `TS-25`: review C3 backend | 59 mutaciones, 56 en rojo y 3 corregidas en la spec. #28 (C4) contra el bucket real en verde. Sail con PHP 8.4.27. |
| v36 | 11-04 | `TS-25`: frontend y review del PR | Duración, confirmación con ETag, «Verificando…» e historial. D3.2 cerrado (UTC-5). `S3Client` singleton con timeouts. 304 tests. |
| v37 | 11-04 | `TS-27`: review C3 backend | 31 mutaciones, todas en rojo. Hallazgo menor de orden en `VersionPolicy`. El #10 (C4) no se corrió. |
| v38 | 11-04 | `TS-26`: review C3 frontend | Un bug medio (reproducir la misma versión tras un error) y uno derivado (URL caducada reutilizada), corregidos. 42 mutaciones; 321 tests. |
| v39 | 11-09 | `TS-71`: UI de producciones | `ProductionFormatBadge`, «Nueva canción» en la cabecera, formulario en panel. 17 mutaciones; el hueco M9 se cerró con un test. 311 tests. |
| v40 | 11-13 | `TS-72`: UI de canciones y consolidación | Token `--success`, `SongStatusBadge`, lápiz y papelera por fila, clases compartidas en `artistStyles.ts`. 26 mutaciones; el hueco M16 se cerró con un test. 335 tests. |

## 3. Decisiones vigentes (con su documento dueño)

**Proceso (decisiones del equipo)**
- **Excepción de la regla 2 por tarea:** el agente puede escribir o entregar código solo cuando el equipo lo pide para esa tarea. Así fue en los hallazgos del PR de `TS-25` (v36), en los de `TS-26` (v38) y en los bloques de `TS-71` y `TS-72` (v39, v40). En `TS-72` los bloques se entregaron con la lógica y la sintaxis explicadas.
- **Las Tasks de UI van de una en una:** `TS-72` empezó cuando `TS-71` estuvo en *Listo* (v39).
- **El registro de Green no dice quién escribió el código** (v35).
- **El commit de la fase en rojo lleva scope:** `test:` o `docs(specs):` (v32).

**Fidelidad visual con Figma (épica `TS-67`; specs `TS-68`..`TS-72`)**
- **Mandan los tokens y el marco de escritorio sobre el móvil.** Los marcos móviles traen colores y fuente fuera de los tokens (`TS-70` §3.7).
- **Las tablas pasan a filas apiladas por debajo de `lg`, no de `md`** (`TS-70` §3.3). En canciones, las filas van dentro del panel (`TS-72` §3.3).
- **Alta de artista en modal sobre el listado** (`/artistas/nuevo`, `TS-70` §3.5). Las altas de producción y de canción siguen siendo páginas.
- **Lo que Figma dibuja sin RF no entra:** portada, estado de la producción, avance, contadores, asa de arrastre, fecha de actualización y el listado global de producciones (`TS-71` §7, `TS-81`).
- **Token `--success` `#34d399`** para «Finalizada» (`TS-68` §3.1, 2026-11-11).
- **Las clases compartidas viven en `src/routes/artists/artistStyles.ts`:** panel, título, formulario, tabla y «Volver» (`TS-72` §0.6, 5).
- **Login con Auth0 Universal Login,** sin campos de credenciales y sin el nombre del cliente en la UI (`TS-69`).

**Versiones de audio (HU-14..HU-16; ADR D7.x, D3.2)**
- **La verificación `HeadObject`/ETag, el paso a `verificada`/`fallida` y el abandono de pendientes son de `TS-25`;** `TS-27` solo emite la URL de lectura (v34).
- **En S4 solo reproduce el productor.** El artista espera a HU-21 (S6), porque `production_access` sigue vetada.
- **D3.2 cerrado:** las fechas se muestran en UTC-5 fijo (`America/Guayaquil`), con `formatDateTime` (`src/lib/dates.ts`). La fecha del historial es `verified_at` (v36).
- **El reintento tras un error de verificación es una subida completa,** con firma nueva (v36).
- **`S3Client` es un singleton del contenedor** con `connect_timeout` de 3 s y `timeout` de 5 s. Cualquier servicio nuevo de S3 lo inyecta (v36).
- **Se mantiene la regla `string` del `etag`** por contrato, aunque C3 no la pueda demostrar (v35, v36).
- **Volver a elegir una versión** se resuelve con un contador en la `key` del reproductor, y cada montaje pide su propia URL (v38).

**Backlog (`roadmap.md`, Jira)**
- **Candidatas post-S6 sin sprint:** `TS-80` (Mi perfil, bajo `TS-2`), `TS-81` (producciones con filtros, bajo `TS-4`; exige enmendar el AC de `TS-17` y revisar RF-01) y `TS-82` (notificaciones por consulta periódica, bajo `TS-7`; depende de `TS-28` y `TS-34`).

## 4. Trampas y hallazgos (las que siguen siendo útiles)

**C3 (todas las capas)**
- **Mira por qué falla una mutación, no solo que falle.** Una excepción o un fallo de render no prueban la aserción: así pasó con SigV4 en v37, con «`data` antes que `isError`» en v38 y con la guarda `isSuccess` en v40.
- **Antes de escribir «X → rojo» en una spec, comprueba que X sea la única barrera.** Las defensas en dos capas engañan: `withTrashed()` en v35 y `whereUuid` en v37.
- **Una regla tapada por otra no se puede poner en rojo** (`regex` frente a `string`, v35).
- **Los rojos contra la implementación desechable de la fase roja no garantizan el C3 del Green real** (v38).
- **El C3 cubre todo lo que toca el Green,** también los archivos de otras Tasks y sus tests (v40).
- **El estilo puro no se pone en rojo (C2):** se verifica lado a lado con Figma. Así se encontraron `ErrorAlert` sin aplicar (v32) y la tabla que desbordaba a 1024 px (v33).
- **jsdom ignora el CSS al calcular los roles:** los `role` explícitos de una tabla apilada se verifican en el navegador (v40).
- **Mover un elemento fuera de una rama condicional cambia sus guardas** (M9 en v39, M16 en v40).
- **Los scripts de mutación** restauran desde una copia, sin git, y deben negarse a aplicar un texto que aparezca más de una vez (v35).

**Frontend**
- **`npx shadcn add` instala el paquete npm `cn`** y reescribe el import. Revisa `package.json`, el lockfile y los imports después de cada `shadcn add` (v32, v33, v36).
- **`rounded-lg` vale 12px** con `--radius: 0.75rem`; para los radios de Figma usa valores explícitos (v32).
- **Los colores de las variantes de shadcn ganan por especificidad** (v32).
- **Un modal en ruta hija necesita `<Outlet />` en el padre** (v33).
- **`Intl.DateTimeFormat` fija la zona al construirse:** el test necesita `vi.resetModules()` + `import()` (v36).
- **`npm test` puede morir por falta de memoria:** usa `npx vitest run --maxWorkers=2` (v36).
- **Montar una consulta nueva rompe las fixtures que responden a «cualquier GET»** (v36).
- **jsdom no carga medios:** la duración se simula con `spyOn` sobre `HTMLMediaElement` (v36).
- **`gcTime: 0` no borra al instante;** para datos nuevos en cada montaje, cambia la clave (v38).
- **«Nueva canción» desaparece en el máximo del formato:** no es un defecto (HU-09 §3.3, v39).

**Backend y entorno**
- **`sail pest` no pasa variables de entorno al contenedor:** usa `docker compose exec -T -e …` (v35).
- **La imagen de Sail no fija el parche de PHP;** lo detecta `PhpRuntimeTest` (v35).
- **Los timeouts del SDK de AWS** se leen con `getCommand(…)['@http']` (v36).

**Figma, Jira y herramientas**
- **`get_metadata` de la página completa ocupa unos 580 000 caracteres:** se guarda en un archivo y se filtra con `jq`. `get_screenshot` da una URL de vida corta (v39). Para leer un color exacto, muestrea la captura con PIL (v40).
- **Revisa los marcos móviles antes de cerrar un inventario** (v33).
- **En Jira, una línea `- [ ]` con comillas invertidas rompe la checklist** (v33). `manageJiraSprint` con `update` reescribe el sprint entero (v34). Antes de crear un sprint, consulta `sprint in openSprints()` (v34).
- **En zsh, `echo ======` falla;** usa `echo ---` (v31).
- **Capturas sin Chrome:** el Chromium de Playwright en `~/.cache/ms-playwright` funciona sin interfaz (v32, v33).
- **Al editar tablas Markdown, usa un script que compruebe el texto,** no `sed` (v38).
- **Los hooks de la sesión piden justificar** la primera escritura de cada archivo y el primer Bash. En lote, comprueba qué se aplicó antes de reintentar (v39, v40).

## 5. Drift: estado al cerrar v40

| Drift | Dueño | Estado |
| --- | --- | --- |
| CORS del bucket con `PUT`/`GET` y subida por POST | ADR D7.5 | **Cerrado** (2026-11-03, con `ExposeHeaders: ETag`) |
| D3.2 «Abierto» | ADR | **Cerrado** (2026-11-04) |
| `sprint-04.md` solo en su rama | Backlog | **Cerrado** (PR #56) |
| Columnas C3 que afirmaban rojos que no se daban (HU-14 #15, HU-15 #2 y #6, TS-72 M6) | Specs | **Corregidos** |
| Barra superior móvil del `AppShell` (`ml-auto` en el saludo oculto; `px-8` frente a `px-4`) | `AppShell` (`TS-68`) | Pendiente: falta decidir si se abre un defecto |
| AC de `TS-17` y RF-01 frente a `TS-81` | Jira / dueño de Track Studio | Pendiente hasta planificar `TS-81` |
| «humano» en 32 tickets de Jira | Jira | Pendiente (v32) |
| La descripción del PR #47 usa `sail psql -c` | GitHub | Pendiente (v28) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes al cerrar v40

- **`TS-72`:** PR a `develop` e integración; casillas `ts-43.01`..`.05` en Jira.
- **Cierre del S4 y de R1:** casillas `ts-24.s4.01`, `ts-25.s4.01` y `ts-26.s4.01`.
- **Equipo (regla 6) y staging:** `ts-14.09`, `ts-15.09`, `ts-16.09` y el #10 (C4) de `TS-27` (comando en §9). Siguen sin confirmar: `php -v` en Railway, `node -v` en Vercel, `APP_DEBUG=false` en staging y el log `artist.status_changed` (`ts-07.09`).
- **Hallazgo menor sin decidir:** el orden de `play` en `app/Policies/VersionPolicy.php:35` (v37).
- **`TS-82`:** sus dependencias con `TS-28` y `TS-34` constan en la descripción, no como enlaces de Jira (v33).
- **Sin tarea:** el 405 que sale como 500 en el manejador D3.1. **Cosmético:** el menú móvil del shell no se cierra al navegar hacia atrás.
- **`graphify`** fuera del PATH.
- **ABIERTOS en el ADR:** 8.5 (rate limiting) y 11.5 (medición de RNF), sin bloquear.

## 7. Próximos pasos (tal como quedaron en v40)

1. Integrar `TS-72` y actualizar Jira.
2. Casillas `.s4` de `TS-35`..`TS-37` y cierre del S4 y de R1.
3. Planificación del S5: `TS-73` (UI de versiones, subida y reproductor; marcos `1:1124` y `106:495`) y HU-17 en adelante.

## 8. Huecos de handoffs

Ninguno. Cada sesión de v31 a v40 dejó su handoff. La planificación del S4 (v34) y los PRs #50 a #59 están cubiertos.

## 9. Cómo retomar el entorno (referencia de v31–v40)

```fish
nvm install && nvm use                           # Node 24.22.1 (.nvmrc)
cd frontend && npm ci && npx vitest run --maxWorkers=2 && cd ..
cd backend
./vendor/bin/sail build --no-cache               # si PhpRuntimeTest falla (PHP 8.4.27)
./vendor/bin/sail up -d && ./vendor/bin/sail composer install
./vendor/bin/sail artisan migrate
```

Pruebas de frontera contra el bucket de `TS-42` (#28 de HU-14 y #10 de HU-16), desde `backend/`:

```bash
docker compose exec -T \
  -e S3_TEST_OBJECT_KEY='<key del objeto subido por HU-13>' \
  -e S3_TEST_OBJECT_ETAG='<etag sin comillas>' \
  laravel.test php vendor/bin/pest tests/Unit/S3AudioStorageBucketTest.php
```

Código nuevo en el periodo: `ErrorAlert`, `AuthCard`, `alert.tsx`, `dialog.tsx`, `textarea.tsx`, `ArtistStatusBadge`, `artistStyles.ts`, `ProductionFormatBadge`, `SongStatusBadge`, `src/lib/dates.ts`, `VersionHistory`, `VersionPlayer` y los helpers `src/test/s3.ts` y `src/test/audio.ts`.

## 10. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. **La próxima consolidación toca al cerrar v50 y cubre v41–v50.**
