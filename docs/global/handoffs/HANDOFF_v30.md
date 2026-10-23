# Handoff v30 — Track Studio

**Fecha:** 2026-10-23 · **Sprint:** 3 · **Capa(s):** frontend (runtime) y global (documentación)
**Foco de la sesión:** registrar el cierre de `TS-78` (Node 24 y `npm audit`, PR #49) y abrir `TS-79`, la reconciliación de la documentación.

> Continúa [`HANDOFF_v29.md`](HANDOFF_v29.md) (TS-77).

## 1. Resumen ejecutivo

`TS-77` (PR #48) y `TS-78` (PR #49) están integrados en `develop` y en *Listo* en Jira. Las cuatro HU del Sprint 3 (`TS-20`, `TS-22`, `TS-23`, `TS-24`) y `TS-42` también están en *Listo*. Solo les faltan las comprobaciones `.09` en staging, que hace el equipo y no bloquean el Done. Se abre `TS-79` en el sprint para reconciliar la documentación. No incluye código de aplicación.

## 2. Qué se hizo

- **`TS-78` (cerrado el 2026-10-22, PR #49).** El detalle está en [`docs/specs/frontend/TS-78.md`](../../specs/frontend/TS-78.md):
  - `.nvmrc` pasa a `24.22.1` y `engines.node` a `>=24.22.1 <25`.
  - Mínimos corregidos de `axios`, `react-router(-dom)`, `vite` y `vitest` (fijado en `4.1.12`). Las transitivas se corrigen con `npm audit fix` sin `--force`.
  - El test guardián `frontend/runtime.test.ts` controla el runtime y los mínimos. La cadena pasa: 257/257 tests y build en verde.
  - ADR D2.1 actualizado: filas de Node y Vitest, y nota de TS-78.
- **`TS-79` (abierto el 2026-10-23).** Task creada en `TS Sprint 3`. Checklist de `.01` a `.07`: este handoff, la reconciliación de `sprint-03.md`, los READMEs, la consolidación de handoffs, la regla del repositorio de documentación, la regla 7 y `graphify-out/`.

## 3. Decisiones tomadas en esta sesión

1. **Riesgo aceptado en `shadcn` (`TS-78`, decisión del equipo del 2026-10-22).** Quedan 7 avisos altos de la cadena `shadcn` → `braces`, que no tiene corrección. Solo afectan al desarrollo y no llegan al bundle. Bajar a `shadcn` 1.0.0 se descartó. El criterio de revisión está en la spec, §3.4.
2. **Reconciliar la documentación en el S3 (`TS-79`, decisión del equipo).** Se fija la regla de un repositorio aparte para la documentación que no necesita vivir junto al código.

## 4. Trampas y hallazgos

1. **`npm ci` con Node 20 solo avisa del `engines`**, porque no hay `engine-strict`. El mínimo lo hace cumplir `runtime.test.ts`.
2. **Vercel solo respeta la mayor de `engines` (24.x)** y aplica el parche que tenga disponible. El equipo lo comprueba con `node -v` en el log del build.

## 5. Drift detectado

Se corrige en `TS-79`:

- No hay README en la raíz. `backend/README.md` y `frontend/README.md` siguen siendo las plantillas de Laravel y Vite.
- Los handoffs v1..v10 siguen sueltos aunque ya existe [`HANDOFF_v1-v10_consolidado.md`](HANDOFF_v1-v10_consolidado.md). Los v11..v20 no se han consolidado. Con este v30 se cumple el umbral de v21..v30 (`PLANTILLA-HANDOFF.md` §9).
- `sprint-03.md` desfasado respecto a Jira:
  - `ts-11.08` está sin marcar aunque `TS-22` está en *Listo*.
  - Las casillas de sincronización con Jira siguen abiertas.
  - `TS-35`..`TS-37` no están en ningún sprint de Jira, aunque el documento los cuenta como reserva del S3.
- El término «humano» sigue en 56 documentos (regla 7 del `CLAUDE.md` raíz).
- `graphify-out/` no está trackeado ni ignorado.

## 6. Bloqueos y pendientes

- **Equipo (regla 6):**
  - `node -v` en el build de Vercel.
  - `php -v` en Railway, de v29.
  - Smoke test de staging.
  - Las `.09` de `TS-20`, `TS-22`, `TS-23` y `TS-24`.
- **`TS-42`:** falta el comentario con evidencia no sensible.
- **`TS-79` `.05`:** falta que el equipo indique el nombre o la URL del repositorio de documentación, su visibilidad y si está clonado en local.
- **Siguen ABIERTOS en el ADR:** 8.5 (rate limiting) y 11.5 (plan de medición de RNF).

## 7. Próximos pasos

1. Seguir `TS-79` en este orden: `.02` (`sprint-03.md`), `.03` (READMEs), `.04` (consolidar handoffs), `.05` (regla del repositorio de documentación y `CLAUDE.md`), `.06` (regla 7) y `.07` (`graphify-out/`).
2. `TS-69` y `TS-70` (UI Figma) siguen en *Por hacer*.
3. Evidencia de tesis (`TS-46`, `TS-53`) y cierre del Sprint 3 el 2026-10-30.

## 8. Cómo retomar el entorno

Node cambió: `nvm install 24.22.1 && nvm use` (lee `.nvmrc`), y después `npm ci` en `frontend/`. El backend sigue como en v29.
