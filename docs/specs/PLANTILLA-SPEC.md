# PLANTILLA — Spec de HU por capa

Copia este archivo y rellénalo. **Dónde vive la spec:**

- **Por defecto, una sola spec en la carpeta de su capa:** `docs/specs/backend/HU-XX.md` **o** `docs/specs/frontend/HU-XX.md`. No es obligatorio crear las dos.
- **Solo si la HU cruza capas de verdad** (p. ej. RBAC: Policy en backend + rutas protegidas en frontend), crea una en cada carpeta y **enlázalas** entre sí.
- **Si la spec es transversal/global** (no pertenece a una capa concreta), va en `docs/specs/` (raíz), sin carpeta.

**Reglas al rellenar:**

- **No copies** los criterios de aceptación a nivel de historia: viven en Jira. Aquí van los criterios **de esta capa**, traducidos a tests.
- **Referencia el ADR por número** (`D3.1`, `D4.8`…). No pegues su contenido.
- Un valor concreto (código de error, versión, nombre de claim) se escribe en su dueño y se referencia; no se duplica.
- Borra los comentarios `<!-- … -->` de guía antes de dar la spec por lista.

---

# HU-XX ([backend|frontend]) — <título corto de la historia>

> **Jira:** `TS-XXX` · **Sprint:** N · **RF/RNF que cubre:** RF-0X, RNF-0X
> **Contraparte:** [`../frontend/HU-XX.md` | `../backend/HU-XX.md` | — (no cruza capas)]
> **Estado:** `[ ]` borrador · `[ ]` aprobada · `[ ]` implementada

## 1. Alcance en esta capa

<!-- Qué construye ESTA capa para esta HU. Una o dos frases. -->

**Dentro:**

- …

**Fuera / diferido (con motivo):**

- … <!-- p. ej. "el disparo automático de X → depende de la decisión ABIERTA del bloque 7 del ADR" -->

## 2. Dependencias

<!-- Qué debe estar DECIDIDO/hecho antes de que esta tarea sea Ready. -->

- **ADR:** decisiones `Dx.y` en estado DECIDIDO. <!-- si alguna está ABIERTA, esta HU no es Ready -->
- **HU/tareas previas:** …
- **Externas:** … <!-- dominio, tenant de Auth0, bucket S3, etc. -->

## 3. Contrato técnico

<!-- El "cómo" de esta capa, anclado al ADR. Endpoints/tipos/componentes/estados. -->
<!-- Backend: método + ruta, Form Request, Service, Policy, forma de la respuesta y del error (por D3.1), API Resource por rol. -->
<!-- Frontend: rutas, componentes, estado (TanStack), manejo del campo `code`, token en memoria (D5.1). -->

## 4. Criterios de aceptación de esta capa → tests

<!-- Cada fila es un test que el AGENTE escribirá en rojo. -->
<!-- "Cómo se prueba que falla" es obligatorio: es la compuerta C3 de la metodología. -->

| #   | Test (archivo::caso) | Qué afirma | Cómo se prueba que FALLA (C3) |
| --- | -------------------- | ---------- | ----------------------------- |
| 1   | `…`                  | …          | …                             |
| 2   | `…`                  | …          | …                             |

## 5. Notas de implementación (para el humano)

<!-- Pistas del agente para la fase Green: qué helper reutilizar (graphify), qué orden, qué trampa evitar. NO es el código. -->

## 6. Registro de cambios de la spec

<!-- Cada vez que la implementación revele algo no previsto, se anota aquí y se corrige la sección afectada, en la misma sesión. -->

- `AAAA-MM-DD` — creada.
