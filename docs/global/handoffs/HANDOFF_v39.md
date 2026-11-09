# Handoff v39 — Track Studio

**Fecha:** 2026-11-09 · **Sprint:** 4 · **Capa(s):** frontend
**Foco de la sesión:** ciclo completo de `TS-71` (UI Figma de producciones, `ts-42.01`..`ts-42.05`): inventario, spec, rojo, Green del equipo y review C3.

## 1. Resumen ejecutivo

`TS-71` recorrió su ciclo completo en la sesión y está en PR (rama `feature/TS-71-ui-figma-producciones`). La spec se aprobó con una decisión clave: los marcos del listado de producciones (`1:604`, `106:746`) se registran como «sin pantalla» y quedan como idea futura. Suite 311/311 en verde; Prettier y build limpios; ESLint con 0 errores y los 3 avisos de `TS-58`. El C3 puso en rojo 16 de 17 mutaciones (una era control de estilo) y destapó un hueco de test, ya cerrado. Falta el PR, la comprobación a 390 px con foco por teclado y marcar `ts-42.xx` en Jira.

## 2. Qué se hizo

- **Inventario (`ts-42.01`)** del archivo de Figma `uDajU3zIBNlPk6a2ZKUgIc`: `1:876` y su móvil `106:345` (detalle de producción) existen; `1:604` y `106:746` (listado de producciones) no tienen pantalla ni endpoint. Detalle en [`TS-71.md`](../../specs/frontend/TS-71.md) §0.
- **Spec** [`TS-71.md`](../../specs/frontend/TS-71.md): creada, aprobada el 2026-11-09. Enmiendas de presentación en HU-08 (§6) y HU-09 (§3.3, «Ubicación» del aviso y del enlace «Nueva canción»).
- **Tests (agente):** `ProductionFormatBadge.test.tsx` (nuevo) y tres casos en `ProductionEditPage.test.tsx`, más uno añadido en el review. Rojo visto por la causa prevista.
- **Green (equipo):** `ProductionFormatBadge.tsx` (nuevo), `ProductionEditPage.tsx`, `ProductionForm.tsx`, `ProductionFormatNotice.tsx` y `ProductionCreatePage.tsx`. Los bloques de código los entregó el agente por excepción de la regla 2 («dame todos los bloques tecleados»), y el equipo los tecleó.
- **Review (`ts-42.05`):** comprobación visual del equipo en escritorio y a 713 px; C3 con 17 mutaciones (detalle en `TS-71.md` §6). El script restauraba cada archivo desde una copia, sin git; está en el scratchpad y no se versiona.
- **Commits del equipo:** `73e99da` (spec), `eb9bb0e` y `d708082` (tests), `faaf0ca` (Green) y `b954861` (registro del Green y del review).
- **Jira:** `TS-26` y `TS-27` pasaron a `Listo` por el equipo (2026-11-09). `TS-71` no se tocó: sus casillas `ts-42.01`..`ts-42.05` siguen sin marcar.

## 3. Decisiones tomadas en esta sesión

Todas son decisiones del equipo:

1. **`1:604` y `106:746` sin pantalla.** El listado global de producciones es funcionalidad nueva (sin RF, sin endpoint). Queda en `TS-71.md` §7 como idea futura, con lo que exigiría: endpoint, portada, estado, avance, y el filtro «Remix», que no existe porque los formatos son `sencillo`, `ep` y `album`.
2. **El `h1` sigue siendo «Editar producción»** y no el nombre de la producción, para no tocar HU-08 §3.2 ni sus tests.
3. **Etiqueta neutra del formato** sobre el título, con el formato guardado.
4. **«Nueva canción» sube a la cabecera** como botón primario. Se oculta en el máximo del formato (HU-09 §3.3).
5. **Alta como página, sin modal** (a diferencia de artistas).
6. **Orden de las Tasks de UI:** una por una. `TS-72` empieza cuando `TS-71` esté en `Listo`.
7. **Excepción de la regla 2 solo para `TS-71`:** el agente entrega los bloques de código; el equipo los teclea. `TS-72` requiere pedirla otra vez.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **«Nueva canción» desaparece al guardar un sencillo con 1 canción.** No es un defecto: es el máximo del formato y HU-09 §3.3 oculta el enlace. Parece un fallo al probarlo a mano. Antes de abrir un defecto por un botón que desaparece, comprobar el aviso de formato.
- **Mover un elemento fuera de una rama condicional cambia sus guardas.** El enlace pasó de estar dentro de la rama «producción cargada» a la cabecera, y dejó de exigir `query.isSuccess`. Lo cazó la mutación M9, que sobrevivió: ningún test cubría «sin enlace mientras carga». Ya está el test 4.
- **Una mutación de estilo puro debe quedar en verde.** M17 (quitar las clases del panel) se mantuvo en verde a propósito; es el control de C2, no un fallo.
- **`get_metadata` de la página completa de Figma devuelve unos 580 000 caracteres.** Se guarda en un archivo; hay que filtrar con `jq` (por ejemplo, los marcos de 390 px de ancho para encontrar los móviles). `get_screenshot` devuelve una URL de vida corta que hay que bajar con `curl`.
- **El marco del detalle mezcla dos pantallas de la app.** `1:876` contiene la cabecera (`TS-71`) y la «Lista de Pistas» (`TS-72`); la columna «Versión» es de `TS-73`. Antes de empezar `TS-72`, fijar esa frontera.
- **Gates del entorno de la sesión (hooks).** Varias primeras escrituras y ediciones pidieron justificar el archivo antes de aplicarse, y en operaciones en paralelo una pudo aplicarse y otra no. Tras un bloqueo, comprobar qué se aplicó antes de reintentar.

## 5. Drift detectado

| Drift | Dueño | Estado |
| --- | --- | --- |
| HU-09 §3.3 («Ubicación» del aviso) contradecía la cabecera nueva | `HU-09.md` | Corregido |
| `sprint-04.md` solo existía en la rama `chore/TS-84-planificar-sprint-4` | Backlog | **Resuelto:** el PR #56 está en `develop` (v36 y v37 lo daban por pendiente) |
| Barra superior móvil (`AppShell.tsx:60`/`:67`): el `ml-auto` está en el saludo, que se oculta por debajo de `md`, así que «Cerrar sesión» queda pegado al logotipo, y la barra usa `px-8` frente al `px-4` del contenido | `AppShell` (`TS-68`) | **Nuevo, sin corregir.** Anotado en `TS-71.md` §6; decidir si se abre un defecto |
| «humano» en 32 tickets de Jira | Jira | Sin cambios (v32) |
| Correcciones de Auth0 v7 y D2.1 sin llevar a la tesis | Tesis | Pendiente (v22–v25) |

Nota de coherencia: en esta sesión se dijo por error que HU-15 no tenía spec. Existía, con su ciclo completo, en `feature/TS-26-reproductor` y no estaba en `develop`. La numeración de handoffs sigue de ahí: **v38 está solo en esa rama** y este v39 lo sucede. Si el PR de `TS-26` aún no está integrado, v38 debe llegar a `develop` antes o junto con este.

## 6. Bloqueos y pendientes

- **Git:** abrir el PR de `TS-71` hacia `develop` (la descripción va en el reporte de cierre) y responder su review.
- **Comprobación manual (equipo):** `106:345` a 390 px y foco por teclado en el `select` y en «Nueva canción». A 713 px todo respondió bien.
- **Jira:** marcar `ts-42.01`..`ts-42.05` en `TS-71` cuando el equipo lo confirme; comentar el hueco del `AppShell` si se decide abrir un defecto.
- **De v37/v38, sin tocar:** el #10 (C4) de `TS-27` contra el bucket real; `ts-14.09`, `ts-15.09` y `ts-16.09` en staging; comprobaciones de `TS-70`; evidencia de `TS-35`..`TS-37` y de `TS-46`; `TS-45`; el arrastre del S3 (`sprint-04.md`, «Arrastre del S3»); `graphify` fuera del PATH.
- **ABIERTOS en el ADR:** 8.5 (rate limiting) y 11.5 (plan de medición de RNF), sin cambios y sin bloquear.
- **Idea futura (no es trabajo):** listado de producciones, en `TS-71.md` §7. Si el equipo lo quiere, se registra como Story candidata bajo `TS-2`, como `TS-80`.

## 7. Próximos pasos

1. PR de `TS-71` y su integración.
2. `TS-72` (UI Figma de canciones, `ts-43.01`..`ts-43.05`): inventario de `1:876` (solo la «Lista de Pistas») y de `106:345`, y pedir de nuevo la excepción de la regla 2 si el equipo quiere los bloques de código. Fijar antes la frontera con `TS-73`: la columna «Versión», el historial y el reproductor quedan fuera.
3. Gate de mitad del sprint (2026-11-09) y cierre (2026-11-13): `TS-45`, `TS-46` y las casillas `.s4` de `TS-35`..`TS-37` siguen pendientes.

## 8. Cómo retomar el entorno

Sin cambios respecto a v36 §8: tests de frontend con `npx vitest run --maxWorkers=2`. Código nuevo de esta sesión: `src/routes/productions/ProductionFormatBadge.tsx`.
