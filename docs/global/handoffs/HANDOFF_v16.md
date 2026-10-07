# Handoff v16 — Track Studio

**Fecha:** 2026-10-07 · **Sprint:** 2 · **Capa(s):** backend y frontend
**Foco de la sesión:** `TS-16` (HU-05), implementar la enmienda §3.8 (mensajes de validación en español) y el Green del frontend.

> Continúa [`HANDOFF_v15.md`](HANDOFF_v15.md). Rama: `feature/TS-16-artistas-frontend`. El humano tecleó el código de aplicación e hizo todas las escrituras de git. El agente escribió la guía, auditó los diffs y actualizó las dos specs.

## 1. Resumen ejecutivo

HU-05 está implementada en las dos capas. El backend responde los 422 en español (enmienda §3.8) y el frontend tiene el alta y la edición de artistas. Las cadenas de calidad de las dos capas están en verde. También se probó a mano en local, con el backend en Sail y el frontend en Vite a la vez. La rama está subida (`17639ba`); falta el PR hacia `develop`.

## 2. Qué se hizo

| Capa | Entregable | Estado |
|---|---|---|
| Backend | `config/app.php` y `.env.example` → `APP_LOCALE=es`; `lang/es/validation.php`; `StoreArtistRequest::messages()` (`email.unique`) | Commit `042d9e9`. Pint, PHPStan y Pest en verde (137 pasan, 1 omitido). #26 y #27 en verde. |
| Frontend | Rutas en `App.tsx`; `routes/artists/` con `ArtistForm`, `ArtistCreatePage`, `ArtistEditPage`, `artistApi.ts` y `artistSchema.ts` | Commit `17639ba`. Format, lint (solo los 3 warnings de `TS-58`), Vitest 40/40 y build. Tests 1–12 en verde. |
| Specs | `docs/specs/backend/HU-05.md` y `docs/specs/frontend/HU-05.md`: estado «implementada» y entrada en el registro de cambios | Incluidas en los commits anteriores. |

## 3. Decisiones tomadas en esta sesión

- **Una sola definición del formulario:** `ArtistInput` se deriva del esquema Zod (`artistSchema.ts`) con `z.infer`. El esquema solo es fuente de verdad del formulario. Las reglas de negocio siguen en el backend (spec frontend §3.3), así que no se comparten esquemas entre capas.
- **Las respuestas de la API no se validan en ejecución:** `Artist` también se tipa con `z.infer`, pero el código nunca llama a `.parse()`. Validarlas cambiaría el comportamiento y exigiría enmendar la spec frontend §3.4 y escribir su test.
- **Los errores de envío se tratan en `ArtistForm`:** el mapeo del 422 a cada campo y los avisos generales viven en un solo sitio, que usan el alta y la edición.

## 4. Trampas y hallazgos

- **Los tests del backend leen el `.env` local:** `phpunit.xml` no fija `APP_LOCALE`. Sin `APP_LOCALE=es` en el `.env` local, #26 y #27 siguen en rojo aunque la CI pase.
- **`lang/es/validation.php` con una línea en blanco antes de `<?php`:** provoca un error fatal de `strict_types`.
- **Sail ocupa el puerto 5173** (`VITE_PORT` en `compose.yaml`) y choca con `npm run dev`. En local se resolvió con `VITE_PORT=5175` en `backend/.env`.
- **La API local está en el puerto 80**, no en el 8000 de `APP_URL`. Para probar contra el backend local, el frontend necesita `VITE_API_BASE_URL=http://localhost`. Con `:8000` falla con un error de red, que la pantalla muestra como «No se pudo guardar el artista. Inténtalo de nuevo.».
- **`frontend/.env` apuntaba a staging** (`VITE_API_BASE_URL` de Railway).

## 5. Incertidumbre: migraciones en Railway

Este PR no trae migraciones: la diferencia con `develop` en `backend/database/` está vacía. La migración de `artists` llegó a `develop` con el PR #30 (`ea75a43`), pero **no se sabe si se ejecutó en la base de staging**. Tampoco hay en el backend ningún script de despliegue que ejecute `migrate`. **Cómo se migra en Railway sigue sin decidir:** es el punto **9.2 del ADR** («Migraciones en deploy»), que sigue `ABIERTO`.

## 6. Bloqueos y pendientes

- Abrir el PR de `feature/TS-16-artistas-frontend` → `develop`.
- Observación de la auditoría, no bloqueante: `artistSchema` (la respuesta) existe como esquema de Zod, pero el código no lo ejecuta. Falta un comentario que lo aclare o volver a una `interface`.
- Tras el deploy a staging: comprobar que el 422 sale en español. Railway no define `APP_LOCALE`, así que vale el valor por defecto.
- Opcional, lo decide el humano: rotar `AUTH0_CLIENT_SECRET`. Su valor apareció en la salida local de esta sesión (no en el repo).
- Siguen abiertos en el ADR: 9.2, 9.4, 11.5 y 8.5.

## 7. Próximos pasos

1. PR de TS-16 hacia `develop`, revisión e integración.
2. HU-06 (`TS-17`, listado de artistas): spec backend y frontend. Referencia visual en Figma, marco `1:373`.
3. Spec backend de HU-08 (`TS-19`), pendiente desde v15.

## 8. Cómo retomar el entorno

- Backend: `cd backend && ./vendor/bin/sail up -d && ./vendor/bin/sail artisan migrate`. La base local estaba vacía.
- Frontend contra el backend local: `VITE_API_BASE_URL=http://localhost` en `frontend/.env` y `VITE_PORT=5175` en `backend/.env`; luego `npm run dev` en `http://localhost:5173`.

## 9. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más. Próxima consolidación: al cerrar v20 (v11–v20).
