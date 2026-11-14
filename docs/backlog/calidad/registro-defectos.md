# Registro de defectos y evidencia de RNF (TS-37, HU-26)

**Corte:** 2026-11-02, sobre `develop` en `682c2e0`. **Cubre:** `ts-26.s2.01` y `ts-26.s3.01`.
**Cierre de la historia:** S6. Este registro es evidencia parcial; los criterios de aceptación viven en Jira.

**Fuentes:** handoffs v21 a v33 y revisión del código en este corte. No hubo pruebas en staging. El CORS del bucket y `APP_DEBUG` los comprobó el equipo en sus consolas el 2026-11-02.

**Resultado:** no hay defectos críticos ni altos confirmados.

## Severidad

| Nivel | Criterio |
| --- | --- |
| Crítico | Pérdida de datos, salto de control de acceso o exposición de secretos |
| Alto | Una función principal no se puede usar, o se exponen datos internos |
| Medio | Comportamiento incorrecto con alternativa o impacto limitado |
| Bajo | Cosmético, sin efecto funcional |

## Defectos abiertos

| ID | Sprint | Defecto | Severidad | Estado | Dueño | Qué hacer |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | S2 | Un 405 responde 500 `INTERNAL_ERROR`. `backend/bootstrap/app.php:174` trata como error interno toda excepción sin manejador, y no hay manejador para `MethodNotAllowedHttpException` | Medio | Confirmado en el código; registrado en `TS-83`, sin sprint | Equipo | Decidir el código de error (D3.1 no tiene uno para 405) y responder 405, con su test. Decisión del equipo (2026-11-02): no se agrega ahora al catálogo |

## Riesgos aceptados

| ID | Riesgo | Dónde se decidió |
| --- | --- | --- |
| R-01 | 7 avisos altos de la cadena `shadcn` → `braces`, sin corrección disponible. Solo afectan al desarrollo | `docs/specs/frontend/TS-78.md` §3.4 |
| R-02 | Si se borra una canción con una subida en curso, el objeto queda en S3 sin fila vigente. La confirmación de S4 debe responder 404 | `docs/specs/backend/HU-12.md` §3.4 |
| R-03 | D-04: el menú móvil no se cierra al navegar hacia atrás. `AppShell` lo cierra al pulsar un enlace, no al cambiar de ruta. No afecta al uso | Decisión del equipo, 2026-11-02 |
| R-04 | D-05: quedan clases `dark:` en `frontend/src/components/ui/input.tsx`, componente generado por shadcn. Sin efecto funcional | Decisión del equipo, 2026-11-02 |

## Resueltos

| Defecto | Resolución |
| --- | --- |
| Línea en blanco de más en `SongList.tsx` (handoff v31 §6) | Ya no está en el código |
| PHP y Node en versiones con avisos de seguridad | `TS-77` y `TS-78` |
| D-02: el comentario de `TS-42` decía que el CORS del bucket permitía `PUT/GET`, frente a `POST/GET` en ADR D7.5 | Sin defecto: el equipo comprobó en AWS que permite `POST` y `GET` y que incluye el origen de staging en Vercel (2026-11-02). Queda desactualizado el comentario de `TS-42` |
| D-03: `APP_DEBUG` en staging sin confirmar | Sin defecto: el equipo comprobó en Railway que está en `false` (2026-11-02) |

## Comprobaciones pendientes en staging

Las `.09` no bloquean el Done, pero sin ellas no hay evidencia en staging de estas historias: `TS-17`, `TS-18`, `TS-19`, `TS-20`, `TS-21`, `TS-22`, `TS-23` y `TS-24`.

## Evidencia de RNF

El punto 11.5 del ADR sigue `ABIERTO`, así que no hay instrumento de medición aprobado. **Lo que sigue es evidencia inicial; no certifica ningún RNF.**

### RNF-03: tiempo de respuesta

| Criterio | Evidencia | Falta |
| --- | --- | --- |
| Progreso visible en menos de 3 s en HU-13 (interpretación de D7.1) | La barra aparece a 0 % al iniciar el envío, sin esperar al primer evento de progreso: `frontend/src/routes/versions/VersionUpload.test.tsx`, «muestra el progreso desde el arranque» | Medir el tiempo real en staging. El test prueba el orden de los pasos, no los segundos |
| 95 % de solicitudes por debajo de 2 s | Ninguna | Instrumento (11.5) y medición |

El redactado exacto de RNF-03 en la tesis sigue sin confirmar (ADR 11.5).

### RNF-07: accesibilidad

| Criterio | Evidencia | Falta |
| --- | --- | --- |
| Contraste WCAG 2.1 AA | Calculado y ajustado en `docs/specs/frontend/TS-68.md` §0.6.2, `TS-69.md` §3.1 y `TS-70.md` | Revisión de canciones y subida, que cambian de aspecto en `TS-72` (S4) |
| Nombres y estados accesibles | Los tests de frontend consultan por rol y nombre. Los errores usan `role="alert"`, los avisos `role="status"` y la barra de subida tiene `aria-label` | Auditoría automática: no hay herramienta instalada |
| Foco por teclado | Comprobación manual del equipo en artistas (`TS-70` §6) | Canciones y subida |
| Responsive desde 375 px | Artistas a 390 px, comprobación manual del equipo (`TS-70` §6) | Medir a 375 px y cubrir el resto de pantallas |
| Chrome, Firefox y Safari | Firefox sin interfaz en el review de `TS-70` | Chrome y Safari |

## Siguientes cortes

S4 y S5 actualizan este registro. S6 hace la verificación formal. Cada corte añade filas y cambia estados, sin borrar el historial.
