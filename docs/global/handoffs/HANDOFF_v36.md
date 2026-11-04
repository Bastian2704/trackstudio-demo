# Handoff v36 — Track Studio

**Fecha:** 2026-11-04 · **Sprint:** 4 · **Capa(s):** frontend / global
**Foco de la sesión:** ciclo completo de HU-14 frontend (`TS-25`, `ts-14.05`..`ts-14.08`): spec, rojo, Green y review C3. Cierre de D3.2.

## 1. Resumen ejecutivo

HU-14 frontend recorrió su ciclo completo en la sesión: spec aprobada, tests en rojo, Green del equipo y review C3 sin hallazgos abiertos.

- **Funcionalidad:** el cliente lee la duración del audio antes de firmar, envía la etiqueta y la descripción opcionales, confirma con el ETag de S3, muestra «Verificando…» y traduce los errores de verificación por `code`. La canción tiene ahora un historial paginado con fechas en UTC-5.
- **D3.2:** cerrado. Las fechas se muestran en UTC-5 fijo.
- **Calidad:** suite 304/304 en verde; Prettier, ESLint (0 errores) y build limpios.
- **Pendiente:** commitear el Green y el review (§6), y la comprobación en staging `ts-14.09`, que corresponde al equipo.

## 2. Qué se hizo

- **Spec** [`docs/specs/frontend/HU-14.md`](../../specs/frontend/HU-14.md): creada y aprobada sin cambios. Enmienda HU-13 frontend (§3.9, registrada en `HU-13.md` §6). Su §6 tiene el detalle de rojo, Green y review.
- **Commits ya hechos por el equipo:** `6bafa4f` (spec + D3.2) y `7ea58b3` (tests en rojo).
- **Tests (agente):**
  - Ampliado: `VersionUpload.test.tsx`.
  - Nuevos: `VersionHistory.test.tsx` y `lib/dates.test.ts`.
  - Casos nuevos en `SongEditPage.test.tsx`.
  - Fixtures ajustadas en `SongEditPage.test.tsx` y `SongCreatePage.test.tsx`.
  - Helpers: `src/test/s3.ts` (cabeceras de respuesta, `ETAG_DE_S3`, `confirmacionSimulada`) y `src/test/audio.ts` nuevo (`simularDuracion`).
- **Green (equipo, sin commitear):** `dates.ts`, `VersionHistory.tsx`, `versionSchema.ts`, `versionApi.ts`, `VersionUpload.tsx` y `SongEditPage.tsx`. A petición del equipo, el agente corrigió en el Green un `SongPage` mal copiado en `versionSchema.ts`, tres detalles menores y los dos hallazgos del review.
- **Review C3:** 53 mutaciones; 51 en rojo a la primera. La que sobrevivió por un fallo del test #14 quedó corregida (§4). El script está en el scratchpad de la sesión y no se versiona.
- **Prueba en local (equipo, 2026-11-04):** con `localhost:5173` contra el bucket real de `TS-42`, todo funcionó según lo esperado: subida, «Verificando…», versión verificada y refresco del historial. No sustituye a `ts-14.09` (staging).
- **Jira:** no se tocó. Las casillas `ts-14.05`..`ts-14.08` de `TS-25` siguen sin marcar.

## 3. Decisiones tomadas en esta sesión

- **D3.2 cerrado:** las fechas se muestran en UTC-5 fijo (`America/Guayaquil`), no en la zona del navegador. Lo decidió el equipo, y queda en el ADR y en `frontend/CLAUDE.md` §3. El formateador único es `formatDateTime` (`src/lib/dates.ts`).
- **La fecha del historial es `verified_at`** (decisión del equipo).
- **El reintento tras un error de verificación es una subida completa**, con firma nueva. No hay botón de «reintentar verificación».
- **Hallazgos del review:**
  - Se borra `setProgress(0)`, que era código muerto.
  - El texto del 404 pasa a la constante `SONG_UNAVAILABLE`.
  - Se acepta sin test la falta de `revokeObjectURL`.
  - Se acepta como residual el posible bloqueo de `readDurationMs` si el navegador no disparase ningún evento.

  Todo esto lo decidió el equipo.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **`Intl.DateTimeFormat` fija la zona al construirse.** Un formateador creado al cargar el módulo ignora un `vi.stubEnv('TZ', …)` posterior. El test tiene que hacer `vi.resetModules()` + `import()` después de forzar la zona. En una máquina en -05, un test mal planteado pasa en local y solo falla en CI (UTC).
- **`npm test` a secas murió con código 137 (OOM)** en este equipo, que tenía unos 2 GB libres. Se usó `npx vitest run --maxWorkers=2`.
- **Montar un componente que pide datos rompe las fixtures que responden a «cualquier GET»:** pasó con `conPrecarga` y `altaCorrecta`. Antes de montar una consulta nueva en una página, hay que revisar sus tests y los de las páginas que navegan a ella.
- **jsdom no carga medios:** la duración se simula con un `spyOn` del setter de `src` y del getter de `duration` de `HTMLMediaElement`, más `URL.createObjectURL`. La implementación tiene que registrar los eventos con `addEventListener` antes de asignar `src`.
- **`graphify` no está en el PATH:** no se pudo ejecutar `graphify update .` tras los cambios de código.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| D3.2 «Abierto» sobre la zona de presentación | ADR | Cerrado (2026-11-04) |
| `frontend/CLAUDE.md` §3 daba D3.2 por ABIERTO | `frontend/CLAUDE.md` | Corregido |
| HU-14 frontend §5 decía que no hacía falta una clase de error | `HU-14.md` §5 | Corregido (`VerifyError`) |
| `sprint-04.md` solo existe en la rama `chore/TS-84-planificar-sprint-4` | Backlog | Sin cambios; se citó desde `79c59d3` |
| «humano» en 32 tickets de Jira | Jira | Sin cambios (v32) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

## 6. Bloqueos y pendientes

- **Git de `TS-25` frontend:** commitear el Green y el review (comandos en el reporte de cierre de la sesión). Después, push y PR.
- **`ts-14.09`** (equipo): comprobación en staging con el bucket de `TS-42`. Sube un WAV real, comprueba que llega a `verificada` y que el CORS expone `ETag`.
- **Jira:** marcar `ts-14.05`..`ts-14.08` en `TS-25`.
- **`graphify`:** instalarlo o añadirlo al PATH y ejecutar `graphify update .`.
- **De v33/v35, sin tocar:** comprobaciones de `TS-70` y su PR #52; registro de `TS-81`/`TS-82`; evidencia de `TS-35`..`TS-37` y de `TS-46`/`TS-53`.
- **ABIERTOS en el ADR:** 8.5 y 11.5, sin cambios.

## 7. Próximos pasos

1. Commitear HU-14 frontend, publicar y abrir o actualizar el PR de `TS-25`.
2. `ts-14.09` en staging y casillas de Jira.
3. Siguiente historia del S4: `TS-27` (HU-16, URL firmada de lectura), spec backend (`ts-16.01`).

## 8. Cómo retomar el entorno

Sin cambios respecto al consolidado v21–v30 §9, salvo lo siguiente:

- Tests de frontend con `npx vitest run --maxWorkers=2` si la máquina va justa de memoria.
- Código nuevo: `src/lib/dates.ts`, `VersionHistory.tsx` y `src/test/audio.ts`.
