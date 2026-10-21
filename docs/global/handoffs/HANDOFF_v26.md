# Handoff v26 — Track Studio

**Fecha:** 2026-10-20 · **Sprint:** 3 · **Capa(s):** infraestructura (AWS)
**Foco de la sesión:** `TS-42` (bucket S3 e IAM en `us-east-1`), ejecutado por el equipo en la consola con un checklist del agente (`CLAUDE.md` §0.6). Falta la decisión de versioning y lifecycle.

> Continúa [`HANDOFF_v25.md`](HANDOFF_v25.md). Sin código de aplicación en esta sesión.

## 1. Estado ejecutivo

- **TS-42:** bucket, IAM de la API, cifrado y CORS hechos y verificados (§4). Versioning y lifecycle de D7.8 aplicados (§3.1). **Pendiente:** la evidencia en Jira.
- **TS-24 (HU-13):** ya puede escribir su spec contra un bucket real. Antes del Red/Green tiene que resolver §6, trampa 1.

## 2. Configuración aplicada

| Elemento | Valor |
|---|---|
| Bucket | `trackstudio-audio-staging`, `us-east-1`, general purpose, namespace global |
| Acceso público | Block all public access (las 4), ACLs deshabilitadas |
| Cifrado | SSE-S3 (`AES256`) |
| Versioning | Activado (D7.8) |
| Lifecycle | `d7-8-housekeeping`, todo el bucket: versiones no actuales a 30 días, delete markers huérfanos, multipart incompleto a 7 días; sin acciones sobre las versiones actuales (D7.8) |
| CORS (D7.5) | Orígenes `http://localhost:5173` y `https://trackstudio-staging.vercel.app`; métodos `PUT`, `GET`; header `Content-Type`; expone `ETag`; `MaxAgeSeconds` 3000 |
| Usuario de la API | `trackstudio-api`, sin consola, una access key («application running outside AWS») |
| Política | `trackstudio-api-s3`: `Allow s3:PutObject, s3:GetObject` en `bucket/*`; `Deny s3:*` en `bucket/db-backups/*` (D6.10) |
| Credenciales | `AWS_*` en las variables de Railway y en `backend/.env` local. `.env.example` sin valores |

Sin `s3:DeleteObject`: el audio se conserva hasta la purga (D4.5, ERD §3.4). Sin `s3:ListBucket`: no lo necesita ningún flujo de S3.

## 3. Decisiones

1. **D7.8 — versioning y lifecycle (aprobada por el equipo el 2026-10-20, registrada en el ADR):** versioning activado; SSE-S3; una regla de lifecycle para todo el bucket que expira las versiones no actuales a los 30 días, borra los delete markers huérfanos y aborta las subidas multipart incompletas a los 7 días. Los objetos actuales no expiran nunca (audio hasta la purga, backups según D6.10). Aplicada en la consola.
2. **IAM user y no rol:** Railway corre fuera de AWS y no puede asumir un rol sin federación.
3. **Namespace global y no «Account Regional»:** no está verificado que el SDK de PHP y Flysystem firmen bien las URLs con el sufijo regional.

## 4. Evidencia (ejecutada por el equipo con el perfil `trackstudio-api`)

- `sts get-caller-identity` → `user/trackstudio-api`.
- `PutObject` en `test/` ✅; `HeadObject` ✅ devuelve `ETag` (MD5 del archivo, válido para D7.4) y `ServerSideEncryption: AES256`.
- `PutObject` en `db-backups/` → `AccessDenied` por el *explicit deny*.
- `DeleteObject` → `AccessDenied`. El objeto de prueba se borró desde la consola.
- Escaneo del repo y del historial: sin access keys ni secretos de AWS. `backend/.env` y `frontend/.env` están ignorados.

## 5. Archivos de la sesión

- `docs/global/handoffs/HANDOFF_v26.md` (este archivo).
- `docs/adr/decisiones-tecnicas-track-studio.md`: nueva D7.8 y su fila en la tabla del bloque 7.
- `docs/backlog/sprints/sprint-03.md`: marcados los puntos de TS-42 de bucket privado, IAM, configuración (CORS, versioning, cifrado y lifecycle) y credenciales.

## 6. Trampas operativas

1. **D7.7 no se puede aplicar tal cual con presigned PUT.** `content-length-range` es una condición de presigned **POST**; un PUT solo firma un `Content-Length` exacto. La spec de HU-13 (`TS-24`) tiene que elegir entre firmar el tamaño declarado exacto o pasar a POST, y actualizar D7.7 en la misma sesión.
2. **`HeadObject` sobre una key inexistente da 403, no 404,** porque la API no tiene `s3:ListBucket`. Hay que tenerlo en cuenta en la verificación de `TS-25`/`TS-27` (S4).
3. **El backend todavía no puede hablar con S3:** falta `league/flysystem-aws-s3-v3` en `composer.json`. Entra con `TS-24`.
4. **El `!` de Claude Code ejecuta zsh, no fish,** y cada comando arranca un shell nuevo. `set -x` activa el modo de traza y las variables no se conservan.
5. **CORS:** si el dominio de staging cambia o llega el de producción, se añade el origen al bucket a la vez que en Auth0 y en `CORS_ALLOWED_ORIGINS` (D7.5, HANDOFF_v5).

## 7. Próximos pasos ordenados

1. Comentario de evidencia no sensible en TS-42 (sin Account ID ni claves) y mover TS-42 a «Listo».
2. Spec backend de `TS-24`, resolviendo antes §6, trampa 1.
