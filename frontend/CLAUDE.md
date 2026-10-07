# CLAUDE.md — Capa Frontend (Track Studio)

Claude Code carga este archivo **automáticamente cuando el trabajo ocurre en `frontend/`**. Complementa el `CLAUDE.md` raíz (reglas duras, git, método SDD/TDD); aquí van las reglas propias del stack React. **No repite el ADR:** las decisiones del cliente (D5.x, D3.1, D11.2) viven en `docs/adr/…` y aquí se referencian por número.

---

## 0. Baseline técnico (no asumir otras versiones)

El pin real lo da `package-lock.json` (D2.1). Esta tabla resume lo que importa al escribir código y tests.

| Componente            | Versión (rango en `package.json`) | Nota                                                                      |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| React                 | **19.x**                          |                                                                           |
| TypeScript            | **~6.0**                          | `strict` vía `tsconfig.app.json`; `verbatimModuleSyntax` → `import type`. |
| Vite                  | **8.x**                           | Alias `@/*` → `src/*`, compartido con Vitest.                             |
| React Router          | **7.x** (`react-router-dom`)      | `BrowserRouter` con `useTransitions={false}` (spec frontend HU-04 §3.4).  |
| TanStack Query        | **5.x**                           | Estado del servidor (ADR, punto 5.1).                                     |
| React Hook Form + Zod | **7.x** + **4.x**                 | Formularios (punto 5.4). Resolver: `@hookform/resolvers`.                 |
| axios                 | **1.x**                           | Cliente único `api` en `src/lib/api.ts` (punto 5.5).                      |
| `@auth0/auth0-react`  | **2.x**                           | Token en memoria (D5.1).                                                  |
| Tailwind + shadcn/ui  | **4.x** + estilo `base-nova`      | Primitivas de `@base-ui/react`, no Radix (punto 5.3, `components.json`).  |
| Vitest + RTL          | **4.1.11** + **16.x**             | D11.2. La 5.x de Vitest exige Node ≥ 22.                                  |

## 1. Comandos (desde `frontend/`)

```bash
npm run dev            # servidor de desarrollo
npm test               # Vitest, una pasada
npm run lint           # ESLint
npm run format:check   # Prettier, sin modificar
npm run format         # Prettier, arregla
npm run build          # tsc -b + vite build
npm ci                 # instalar (nunca `npm install` en CI — D2.1)
npx shadcn add <x>     # añadir un componente de shadcn (código de aplicación: lo ejecuta el humano)
```

## 2. Cadena de calidad antes de pedir commit

Mismo orden que el job de `.github/workflows/frontend-ci.yml`:

1. `npm run format:check` → sin diferencias.
2. `npm run lint` → 0 errores. Los warnings de `react-refresh/only-export-components` ya conocidos están en `TS-58`; uno nuevo se justifica o se arregla.
3. `npm test` → suite en verde, con los tests nuevos **probados en rojo** (C3).
4. `npm run build` → `tsc -b` sin errores y bundle generado.

## 3. Arquitectura del cliente (referencia al ADR)

| Regla               | Fuente              | En una línea                                                                                                                                                           |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token en memoria    | **D5.1**            | `cacheLocation="memory"` + refresh tokens con rotación. Nada escribe tokens en `localStorage`/`sessionStorage`.                                                        |
| Errores por `code`  | **D3.1**            | La lógica ramifica por `error.response.data.code` (`ApiErrorBody`), **nunca por `message`**. 401/403 ya los resuelve el interceptor de `App.tsx` (HU-04).              |
| Cliente HTTP único  | punto 5.5           | Toda llamada sale de `api` (`src/lib/api.ts`), que lleva los interceptores de token y de error. No se crean instancias de axios sueltas.                               |
| Estado del servidor | punto 5.1           | Lecturas con `useQuery`, escrituras con `useMutation`. Claves de caché como arrays con el recurso en plural primero: `['artists', id]`.                                |
| Formularios         | punto 5.4           | React Hook Form + esquema Zod. El servidor es la fuente de verdad de la validación: el cliente solo adelanta lo que la spec de la HU diga, y pinta el 422 en su campo. |
| Rutas por rol       | punto 5.6, **D4.8** | `RequireAuth` (sesión) → `RequireRole(allowed)` (claim de `VITE_AUTH0_ROLE_CLAIM`). Denegar por defecto. El backend sigue siendo quien autoriza de verdad.             |
| Estado global       | punto 5.8 ABIERTO   | **No se introduce** Zustand/Redux/Context global hasta que se decida. Si una HU lo necesita, se señala y se detiene.                                                   |
| Fechas              | **D3.2**            | Llegan en ISO 8601 con offset. Qué zona mostrar sigue **ABIERTO** en D3.2: una HU que pinte fechas lo señala antes de elegir.                                          |
| Pruebas             | **D11.2**           | Vitest + React Testing Library.                                                                                                                                        |

## 4. Reglas de TypeScript y React

- **Sin `any`.** Las respuestas de la API se tipan con la forma del Resource que documenta la spec backend. Los errores de axios se tipan como `AxiosError<ApiErrorBody>`.
- **`import type`** para tipos (lo exige `verbatimModuleSyntax`).
- **Componentes funcionales** y hooks. Nada de clases.
- **Sin `console.log`** (ESLint: `no-console` solo permite `warn`/`error`).
- Las variables de entorno se leen de `import.meta.env.VITE_*` y existen también en `.env.example` sin valores reales (regla dura §0.5 del raíz).
- Contenido visible en **español**. Texto de usuario renderizado siempre como texto de React, nunca con `dangerouslySetInnerHTML` (control complementario de D5.1).

## 5. Pruebas (cómo se escriben aquí)

- Archivo `X.test.ts(x)` **junto al fuente** que prueba.
- Descripciones (`describe`/`it`) **en español**; la cabecera del archivo cita la HU, la tarea y el número de test de la spec.
- **HTTP simulado en el borde de axios:** se sustituye `api.defaults.adapter` y se restaura en `afterEach` (patrón de `src/routes/Me.test.tsx`). Así se ejercitan el cliente real, sus interceptores y la forma real de `AxiosError`. No se mockea `api.get/post`.
- **Auth0 simulado** con `vi.mock('@auth0/auth0-react')` + `contextoAuth0()` de `src/test/auth0.ts`, que deja sin definir lo que el caso no declara.
- **Claim de rol:** `vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', …)` antes de importar el módulo que lo lee (patrón de `RequireRole.test.tsx`).
- **Router:** `MemoryRouter` con `initialEntries`. **Query:** un `QueryClient` nuevo por test con `retry: false`.
- Consultas de RTL por rol y nombre accesible (`getByRole('button', { name: … })`, `getByLabelText`) antes que por texto suelto o `data-testid`.
- Interacción con `@testing-library/user-event`.

## 6. Qué NO hacer todavía (frontend)

> **Dueño único: `CLAUDE.md` raíz §5.** La lista de vetos vigente vive allí y no se copia aquí (metodología §0).

Regla propia de esta capa: una pantalla funcional solo nace de una **spec frontend aprobada** que enlaza su contraparte backend. El frontend no inventa endpoints ni formas de respuesta: si el contrato no está en la spec backend, se para.

## 7. Nomenclatura

Nombres de archivos, componentes, hooks, rutas y tests: **`frontend/docs/nomenclatura.md`**. Este archivo manda sobre _cómo trabajar_; ese, sobre _cómo nombrar_.
