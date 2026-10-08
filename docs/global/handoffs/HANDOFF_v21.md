# Handoff v21 — Track Studio

**Fecha:** 2026-10-08 · **Sprint:** 2 (2026-10-05 → 2026-10-16) · **Capa(s):** frontend / global
**Foco de la sesión:** frontend de `TS-19` (HU-08), desde la spec hasta Green y review C3, con el humano implementando paso a paso en modo mentoría.

> Continúa [`HANDOFF_v20.md`](HANDOFF_v20.md). Rama: `feature/TS-19-productions-crud`, sincronizada con `origin`.

## 1. Estado ejecutivo

TS-19 está **técnicamente completo en backend y frontend** (`ts-08.01`–`ts-08.08` marcadas en Jira). El **PR #33** hacia `develop` salió de borrador, tiene el CI en verde (build, lint, static-analysis, test y preview de Vercel) y espera la review del equipo. La historia sigue **En curso** hasta `ts-08.09`: integración y demostración en staging.

## 2. Jira

- `TS-19`: checklist `ts-08.01`–`ts-08.08` marcado. Comentario con la evidencia del backend (sin referencias a commits ni a puntos del ADR, a petición del humano). El humano añadió un enlace al job de CI que falló a propósito en la fase roja.
- `TS-17`: comentario que deja constancia del **apaño temporal** de §3.
- **Drift menor pendiente:** la descripción de TS-19 todavía dice `docs/specs/{backend,frontend}/HU-08.md (pendientes)`; ambas specs existen. No se corrigió para no tocar la historia fuera de lo pedido.

## 3. Decisiones del humano (2026-10-08)

Todas registradas en [`../../specs/frontend/HU-08.md`](../../specs/frontend/HU-08.md) §1 y §6:

1. **Artista por URL anidada** (`/artistas/:artistId/producciones/nueva`) porque no existe endpoint de listado. **Es un apaño temporal que TS-17 debe sustituir** por selección o navegación desde el listado.
2. Borrado confirmado con `AlertDialog` de shadcn (Base UI), **controlado**: Escape no lo cierra mientras el `DELETE` está en curso; tras un error se cierra y el aviso queda en la página.
3. Tras un 204, vuelta a `/artistas/{artist_id}/editar` con el aviso «Producción eliminada.».
4. Un 422 con `errors.artist_id` (p. ej. artista inactivo) muestra el mensaje del servidor en un aviso general.
5. Se retiró la limpieza manual de caché tras borrar (`removeQueries`): no tenía efecto observable; la consulta repetida da 404 y `gcTime` libera la entrada.
6. `noticeFrom` se extrajo a `src/lib/notice.ts` porque el estado `{ notice }` es un contrato entre `productions` y `artists`.

## 4. Evidencia

- **Suite frontend:** 67/67. `format:check` limpio, `lint` sin errores (3 warnings conocidos de `TS-58`) y `build` correcto. El aviso de *chunk* > 500 kB es una advertencia de tamaño del bundle y no se verificó si es preexistente.
- **TDD:** 18 tests de la spec vistos en rojo por la causa prevista (módulos inexistentes y rutas sin registrar).
- **C3:** 30 mutaciones; 26 en rojo a la primera. Las 4 en verde destaparon código sin especificar y se resolvieron (§3, puntos 2 y 5): se ampliaron los tests 16 y 17 y se repitieron sus mutaciones, ahora en rojo. La mutación de `noticeFrom` tras el refactor puso en rojo 3 tests en 3 flujos.

## 5. Archivos de la sesión

- **Spec:** `docs/specs/frontend/HU-08.md` (nueva, aprobada e implementada); `docs/specs/backend/HU-08.md` (enlace a la contraparte).
- **Tests (agente):** `src/routes/productions/ProductionCreatePage.test.tsx`, `src/routes/productions/ProductionEditPage.test.tsx` y casos nuevos en `src/App.test.tsx`.
- **Código (humano):** rutas en `App.tsx`; `routes/productions/{productionSchema.ts, productionApi.ts, ProductionForm.tsx, ProductionCreatePage.tsx, ProductionEditPage.tsx}`; `components/ui/alert-dialog.tsx` (generado); `lib/notice.ts`; `ArtistEditPage.tsx` (importa `noticeFrom`).

## 6. Trampas operativas

- **`npx shadcn add` metió la dependencia `cn`** (`import { cn } from "cn"`) ignorando el alias `utils` de `components.json`. Se quitó (`npm uninstall cn`) y se usa `@/lib/utils`. **Revisar el diff de `package.json` después de cada generador.**
- Los wrappers de shadcn reenvían props con `{...props}`: la API real está en el tipo de Base UI (`AlertDialogPrimitive.Root.Props`), no en el cuerpo del wrapper. `AlertDialogCancel` cierra solo; `AlertDialogAction` no.
- Un diálogo modal abierto oculta el resto de la página a las consultas por rol de RTL.
- `<select>` con opción vacía: el esquema separa entrada (`string`) y salida (enum) con `z.string().pipe(z.enum(…, 'mensaje'))` y `useForm<Input, unknown, Output>`.
- **Historial:** el commit `60554a1` (feat) importa `@/lib/notice`, que no existe hasta `d8d0015`, así que **no compila por sí solo**. No se reescribió porque la rama ya estaba publicada; desaparece si el PR se integra con *squash*. Para la próxima: `git add -p` cuando un archivo mezcla cambios de dos commits.
- Los mensajes de los tres últimos commits están en inglés; el resto del historial, en español.

## 7. Próximos pasos ordenados

1. Atender la review del equipo en el PR #33 y mergear a `develop` con el CI en verde.
2. **Resolver D9.2** (migraciones en el deploy): bloquea demostrar la migración de `productions` en staging.
3. `ts-08.09`: en staging, CRUD completo con el productor sintético, rechazo con el artista sintético y la asociación válida. Después, marcar TS-19 como Listo.
4. Sprint 2 cierra el 2026-10-16 y quedan `TS-17` (HU-06, absorbe el apaño de la URL), `TS-18` (HU-07) y `TS-20` (HU-09). Si no alcanza, el candidato a recortar es TS-20 o TS-18.
5. Opcional: corregir «(pendientes)» en la descripción de TS-19.
