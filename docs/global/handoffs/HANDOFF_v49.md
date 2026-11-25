# Handoff v49 — Track Studio

**Fecha:** 2026-11-24 · **Sprint:** 5 (ampliación de alcance) · **Capa(s):** frontend
**Foco de la sesión:** `TS-91`, `ts-amp-analisis.08`: review y C3 del frontend, prueba manual en local con el juego de demo y mensaje de la PR.

## 1. Resumen ejecutivo

`TS-91` queda lista para la PR, en la rama `feature/TS-91-analisis-tecnico`. Último commit: `701f7b6`. Hay 8 commits sin push.

- **C3 del frontend:** 92 mutaciones, todas en rojo, después de cerrar 5 huecos reales con 4 tests nuevos.
- **Prueba manual en local** (equipo): los 13 casos del juego de demo, MP3 incluidos, se ven como dice `esperado.md`.
- **Cambio tras la prueba:** se retiró la nota al pie «Advierte, no bloquea…». La insignia del master sin advertencias sigue siendo «Chequeo sin advertencias».
- **Mensaje de la PR:** listo para pegar en `docs/global/pr-TS-91.md` (sin versionar).

Falta `.09`, del equipo: push, PR a `develop`, CI en verde, migración en staging y prueba allí.

## 2. Qué se hizo

- **`.08`, C3:** script en el scratchpad, que no persiste.
  - **Funcionamiento:** cada mutación es un reemplazo exacto de texto. El script comprueba que el texto aparece una sola vez, corre Vitest solo sobre los archivos de test afectados y restaura desde una copia, sin usar git.
  - **Reparto de las 92:**
    - 41 en `audioAnalysis.ts`;
    - 12 en `startAnalysis.ts`;
    - 17 en la subida (`VersionUpload`, `versionApi` y `ANALYSIS_GRACE_MS`);
    - 20 en la pantalla (`TechnicalCheck` y `formatDb`);
    - 1 en el historial y 1 en el reproductor.
  - **Primera pasada:** 87 en rojo. Sobrevivieron A01, A02 y A04 (compuertas), A07 (solape) y A10 (pico negativo).
  - **Cierre:** 4 casos nuevos en `audioAnalysis.test.ts`, anotados en la spec §4.1 bajo el test 3:
    - EBU Tech 3341, caso 3 (compuerta relativa);
    - seno a −75 dBFS → `null` y a −50 → −50 (compuerta absoluta);
    - 400 ms a −23 y 400 ms a −40 → −25,0, cuando sin solape daría −23;
    - impulso de −0,5 → −6,2 dBTP.
  - **Resultado:** las 92 en rojo y ninguna equivalente.
- **Prueba manual** (equipo): todos los casos de `esperado.md` se ven como se espera.
- **Cambios por la prueba** (agente, por excepción del equipo, «Hazlo tú esta vez»):
  - `TechnicalCheck.tsx` sin la nota al pie. El test #23 comprueba ahora que no aparece; se probó en rojo antes de quitar la nota.
  - La columna «Qué debe verse» de `scripts/audio-demo.sh` y la del `esperado.md` local dicen ahora «Insignia «Chequeo sin advertencias»; las 4 tarjetas con el check verde».
- **Spec frontend:** §3.7 («Sin nota al pie») y dos entradas en §6 (C3 y prueba manual).
- **`docs/global/pr-TS-91.md`:** mensaje de la PR con la plantilla del repo, los pasos para probar en local y la tabla del juego de demo.
- **Commits del equipo:** `07175ae` (C3) y `701f7b6` (nota al pie y textos del demo), además del arreglo de Prettier.

## 3. Decisiones tomadas en esta sesión

Todas son del equipo y están en la spec frontend §3.7 y §6.

1. **Se retira la nota al pie entera**, con sus dos frases: «Advierte, no bloquea: el productor decide.» y «Volumen y pico se juzgan solo en versiones «Master»…». Cada tarjeta ya dice si se revisa.
2. **La insignia de un master correcto sigue siendo «Chequeo sin advertencias».** No hay «Master correcto». Solo cambia el texto de lo esperado en el demo.
3. **El mensaje de la PR incluye los pasos para probar en local**, para que cualquiera del equipo los repita.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **Señales estacionarias y simétricas no prueban BS.1770.** Con un seno constante, quitar las compuertas o el solape da el mismo número. Para cubrir de verdad hacen falta:
  - pasajes a niveles distintos (caso 3 de Tech 3341);
  - una señal entera por debajo de −70 LUFS;
  - una transición corta, para el solape;
  - una señal asimétrica, para el pico negativo.
- **El texto «Correcto» de las tarjetas es `sr-only`:** en pantalla solo se ve el icono de check verde. Un texto de «Qué debe verse» tiene que describir lo visible.
- **Sin firmas de agente en commits ni PRs** (`reglas-git.md` §3, decisión del 2026-10-23). Los bloques de comandos de esta sesión llevaban `Co-Authored-By` por error. El equipo los commiteó sin la firma; hay que revisarlo en cada bloque.

## 5. Drift detectado

- **Marco 12 de `TS-88`:** sigue con «No se revisa en mezclas», viene de v48. Además, si los marcos 11 a 13 llevan la nota al pie que se retiró, quedan desfasados. No se comprobó en Figma. Se ajustan en `TS-73` o los ajusta el equipo.
- **Checklist de Jira `TS-91`:** sigue sin marcar de `.01` a `.08`.

## 6. Bloqueos y pendientes

1. **`.09`, del equipo:**
   - `git push`;
   - abrir la PR a `develop` con el texto de `docs/global/pr-TS-91.md` y adjuntar las capturas;
   - CI en verde;
   - aplicar la migración en staging (solo de expansión, D9.4);
   - repetir la prueba en staging;
   - mover `TS-91` a `Listo`.
2. **Jira:** marcar `.01`-`.08` en la checklist de `TS-91`.
3. **Figma:** el marco 12 (texto de mezcla) y, si la llevan, la nota al pie de los marcos 11-13.
4. **Siguen ABIERTOS en el ADR, sin bloquear:** 5.8, 8.5 y 11.5. Los valores de D7.10 esperan al productor.
5. **`graphify`** sigue sin instalar.

## 7. Próximos pasos

1. Cerrar `.09` (§6.1).
2. Seguir con la ampliación de S5: `TS-92` (flujo de revisión) y `TS-96` (varios productores). Cada una empieza por su marco en `TS-88` y su spec backend.
3. **`TS-93`** (A/B, S6) lee las series que ya se guardan. Al empezarla:
   - añadir su lectura a la API (spec backend `TS-91` §1);
   - reutilizar `formatDb` y `TechnicalCheck`.

## 8. Cómo retomar el entorno (si cambió)

Lo mismo que en `HANDOFF_v48`. El juego de demo se regenera con `cd frontend && bash scripts/audio-demo.sh`: los audios quedan en `frontend/demo-audio/`, que está en `.gitignore`.
