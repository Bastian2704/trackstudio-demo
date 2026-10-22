# Handoff v27 — Track Studio

**Fecha:** 2026-10-22 · **Sprint:** 3 · **Capa(s):** frontend
**Foco de la sesión:** review de `TS-68` (`ts-39.05`): comparación con Figma, contraste y foco, C3 de los tests; corrección de los hallazgos.

> Continúa [`HANDOFF_v26.md`](HANDOFF_v26.md).

## 1. Resumen ejecutivo

`TS-68` (tokens oscuros de Figma, Inter y `AppShell` con navegación por rol) está implementada y revisada. La cadena de calidad está en verde: Prettier, ESLint (0 errores, solo los 3 avisos de `TS-58`), 193/193 tests y build. Falta que el equipo commitee, abra el PR y mueva `TS-68` en Jira.

## 2. Qué se hizo

- **C3:** las 11 filas de la spec §4 (`AppShell.test.tsx` 1–9, `App.test.tsx` 10–11) dan rojo con su mutación. Se probaron sobre una copia en el scratchpad, sin tocar el árbol de trabajo.
- **Comparación con Figma (marco `1:76`):** el escritorio coincide (aside de 256px, logotipo y subtítulo, ítem activo, barra con saludo y «Cerrar sesión»). Las diferencias son las ya aceptadas en la spec: sin campana, solo «Artistas» y el icono de lucide.
- **Hallazgos corregidos por el agente** (excepción puntual pedida por el equipo, `CLAUDE.md` §0.2):
  1. `--ring: cabeff` sin `#`: los `Button` e `Input` de shadcn no tenían indicador de foco (WCAG 2.4.7).
  2. `--card: #a1a1a1`: el texto quedaba a 2,0:1. Pasa a `rgba(26,26,26,.6)`, como dice la spec.
  3. `--radius` de `0.67rem` a `0.75rem` (§3.1).
  4. Eliminados `--chart-*` y sus `--color-chart-*` (§3.1).
  5. Logotipo móvil partido en dos líneas a 390px → `whitespace-nowrap`.
  6. Prettier fallaba en `AppShell.tsx`; el registro de la spec decía lo contrario y se corrigió.
- **Spec:** `docs/specs/frontend/TS-68.md` §6 con la entrada del review.

## 3. Decisiones tomadas en esta sesión

Ninguna nueva. Las desviaciones de Figma por contraste ya estaban decididas por el equipo en la spec §0.6 y §3.1.

## 4. Trampas y hallazgos (lo que costó tiempo)

1. **Una variable CSS inválida no rompe el build ni los tests.** `--ring: cabeff` pasó la cadena entera. Los enlaces del shell seguían mostrando contorno porque `outline-color` cae a `currentColor`, lo que ocultaba el fallo. Solo se ve midiendo el estilo computado en un navegador.
2. **El Playwright MCP no arranca:** busca Chrome en `/opt/google/chrome/chrome`, que no existe en esta máquina. Funciona con `brave --headless=new --screenshot=…` y `--dump-dom`, usando un harness de Vite en el scratchpad que sustituye `@auth0/auth0-react` por un módulo falso.
3. **Con `--virtual-time-budget`, Brave congela las transiciones:** `transition-all` deja `box-shadow` en 0 y parece que no hay foco. Hay que poner `transition: none` antes de medir. Inter tampoco llega a cargarse en ese modo, así que la tipografía de esas capturas no vale para comparar.

## 5. Drift detectado

- Corregido: el registro de la spec TS-68 decía que Prettier estaba en verde.
- Sin corregir: `sprint-03.md` no tiene subtareas `ts-39.0x`; la checklist vive solo en la spec.

## 6. Bloqueos y pendientes

- **Hueco no exigido por la spec:** el menú móvil se cierra con `onClick` en el `NavLink` y no con `useLocation`. Si se navega hacia atrás, el menú se queda abierto. Si se quiere cubrir, va con un test nuevo en rojo.
- `input.tsx` conserva clases `dark:` que ya no aplican (se eliminó `.dark`). Es inofensivo y le toca a TS-69/TS-70.
- Lo que bloquea en el ADR no cambia: 11.5 y 8.5.

## 7. Próximos pasos

1. El equipo commitea y abre el PR de `feature/TS-68-ui-figma-base`, y mueve `TS-68` en Jira.
2. `TS-69` (login, 403, carga y error) y `TS-70` (artistas), cada una con su spec.
3. Spec backend de `TS-24`, pendiente de HANDOFF_v26 §6.

## 8. Cómo retomar el entorno

`npm ci` en `frontend/`: `@fontsource-variable/geist` sale y entra `@fontsource-variable/inter`. Lo demás, como en HANDOFF_v26.
