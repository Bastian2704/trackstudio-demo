# Nomenclatura — Frontend (Track Studio)

Convenciones de **nombres y estructura** del código React. Es la contraparte de `backend/docs/nomenclatura.md` y recoge lo que el código de S1 ya hace; no inventa reglas nuevas.

---

## 0. Quién manda sobre qué

- **Prettier** (`.prettierrc.json`: sin punto y coma, comillas simples, coma final, ancho 100) manda sobre el **formato**. No se formatea a mano.
- **ESLint** (`recommendedTypeChecked` + `react-hooks` + `react-refresh`) y **`tsc`** mandan sobre los **tipos y el uso de hooks**.
- **Este documento** manda sobre los **nombres y la estructura**.

---

## 1. Idioma

**Código en inglés. Contenido de cara al usuario en español.** Igual que en el backend (`backend/docs/nomenclatura.md` §1), con el mismo diccionario de dominio (artista → `Artist`, producción → `Production`…).

- **Inglés:** componentes, hooks, funciones, tipos, variables y claves de caché (`ArtistForm`, `useRoles`, `['artists', id]`).
- **Español:** texto visible, mensajes de error mostrados, comentarios, descripciones de los tests y **helpers de test** (`contextoAuth0`, `renderRutaProductor`), que se leen como prosa del caso.
- **Rutas del navegador en español** (son lo que ve el usuario): `/productor`, `/artistas/nuevo`. Las rutas de la **API** son las del backend, en inglés (`/api/v1/artists`), y no se traducen.
- Los valores de rol `productor` y `artista` son datos (D4.8), no identificadores.

## 2. Tabla de casing

| Elemento              | Convención                                      | Ejemplo                               |
| --------------------- | ----------------------------------------------- | ------------------------------------- |
| Archivo de componente | `PascalCase.tsx`, nombre = componente           | `LoginButton.tsx`, `RequireRole.tsx`  |
| Componente            | `PascalCase`, **export default**                | `export default function RequireRole` |
| Componente de shadcn  | `kebab-case.tsx` en `components/ui/` (generado) | `button.tsx`                          |
| Hook                  | `useX`, `camelCase`, export con nombre          | `useRoles`, `useHasRole`              |
| Archivo de hook       | `useX.ts`                                       | `useRole.ts`                          |
| Módulo de utilidades  | `camelCase.ts` en `lib/`                        | `api.ts`, `queryClient.ts`            |
| Función / variable    | `camelCase`                                     | `attachErrorInterceptor`              |
| Constante de módulo   | `UPPER_SNAKE_CASE`                              | `APP_ROLES`, `ROLE_CLAIM`             |
| Tipo / interface      | `PascalCase`, sin prefijo `I`                   | `ApiErrorBody`, `AppRole`             |
| Variable de entorno   | `VITE_UPPER_SNAKE`                              | `VITE_AUTH0_ROLE_CLAIM`               |
| Ruta del navegador    | `kebab-case`, en español                        | `/artistas/:id/editar`                |

## 3. Estructura de `src/`

| Carpeta             | Qué va                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `routes/`           | Páginas (una por ruta) y guardas de ruta (`RequireAuth`, `RequireRole`).                                                           |
| `routes/<recurso>/` | Páginas y componentes de un módulo funcional cuando son más de uno (p. ej. `routes/artists/`), en inglés y plural como el recurso. |
| `components/`       | Componentes reutilizables entre páginas. `components/ui/` es solo para lo generado por shadcn.                                     |
| `hooks/`            | Hooks compartidos.                                                                                                                 |
| `lib/`              | Infraestructura sin UI: cliente `api`, `queryClient`, `utils`.                                                                     |
| `test/`             | Helpers exclusivos de test (`contextoAuth0`).                                                                                      |

**Páginas:** el componente de una página lleva el sufijo `Page` cuando el nombre corto choca o es ambiguo (`MePage` en `Me.tsx`); un módulo nuevo lo usa siempre: `{Recurso}{Acción}Page` → `ArtistCreatePage`, `ArtistEditPage`. Un formulario compartido entre páginas: `{Recurso}Form` → `ArtistForm`.

## 4. Datos remotos

- **Clave de caché:** array con el recurso de la API en plural primero, y luego el id o el filtro: `['me']`, `['artists', id]`.
- **Tipos de respuesta:** el nombre del recurso en singular, con la forma del Resource de la spec backend (`Artist`). La envoltura `data` se quita en la `queryFn`/`mutationFn`, no en el componente.

## 5. Tests

- Archivo `X.test.ts(x)` junto a `X`. Un test de integración de la app real va en `App.test.tsx` o `main*.test.tsx`.
- `describe` con el nombre del componente o módulo; `it` con una frase en español que diga **qué afirma**, idéntica a la columna «Test» de la spec (`'artista no accede a una ruta de productor'`).
- `it.each` para datasets, con el caso como primer argumento (`'un claim %s deniega acceso'`).

## Fuentes

Código de `frontend/src` en `develop` a 2026-10-06 (S1: HU-02, HU-03, HU-04), `.prettierrc.json`, `eslint.config.js`, `components.json` y `backend/docs/nomenclatura.md`.
