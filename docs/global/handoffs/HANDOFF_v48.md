# Handoff v48 — Track Studio

**Fecha:** 2026-11-24 · **Sprint:** 5 (ampliación de alcance) · **Capa(s):** backend, frontend y diseño (Figma)
**Foco de la sesión:** `TS-91`, análisis técnico de la versión al subir. Checklist `ts-amp-analisis.01` a `.07`: spec, tests en rojo y Green de las dos capas, C3 del backend y marcos de Figma.

## 1. Resumen ejecutivo

`TS-91` está implementada en las dos capas, en la rama `feature/TS-91-analisis-tecnico`.

- **Backend (`.01`-`.04`):**
  - guarda y valida `versions.analysis` y deriva `technical_check` al leer;
  - C3: 51 mutaciones, con un hueco real cerrado (M23) y una equivalente (M26).
- **Frontend (`.05`-`.07`):** calcula el análisis en un Web Worker mientras se sube el archivo, lo envía al confirmar y pinta el chequeo en el historial y en el reproductor.
- **Precisión:** coincide con `ffmpeg ebur128` dentro de ±0,5 en volumen y pico.
- **Suite frontend:** 547 de 547. Lint sin errores y build correcto.

**Ojo:** `format:check` falla ahora en el último commit (§6, primer pendiente), así que el CI del frontend saldrá rojo hasta corregirlo.

Faltan:

- `.08`: review y C3 del frontend;
- `.09`: PR y comprobación en staging, que hace el equipo. Incluye probar a mano los MP3 con el juego de demo.

## 2. Qué se hizo

**Backend**, spec [`docs/specs/backend/TS-91.md`](../../specs/backend/TS-91.md):

- **`.01`:** spec aprobada. ADR enmendado:
  - D7.9: valores en dB de −120 a +20, volumen integrado de −70 o más o nulo, y el contrato del 422 con reintento;
  - D7.10: las advertencias las calcula el backend.
- **`.02`:** tests en rojo.
- **`.03`:** Green:
  - migración `jsonb` con `CHECK`;
  - `ConfirmVersionRequest`, `VersionService::confirmVersion`, `VersionResource` y `App\Support\TechnicalCheck`.
- **`.04`:** C3 con 51 mutaciones: 50 en rojo y 1 equivalente.
  - **Hueco cerrado (M23):** sin la clave `integrated_lufs` o `true_peak_dbtp`, el backend daba 500 al leer. Se cerró con dos casos nuevos en el dataset.
  - **Equivalente (M26):** el `min:0` de `clipped_samples`, porque `after()` ya rechaza los negativos.
- Commits: `19edde5`, `18298a3`, `68ce925`, `78a003c` y `0b17d05`.

**Figma**, `TS-88`, página «TS-88 · Ampliación» (`2162:12`):

- **Marcos nuevos 11-15**:
  - 11: master con advertencias;
  - 12: mezcla;
  - 13: sin análisis;
  - 14: subida analizando;
  - 14b: más de 20 min;
  - 15: móvil en 2 × 2.
- **Reutilizan** la insignia «Insignia de chequeo» (`2173:67`) y las tarjetas del marco 5. No se tocó ningún nodo existente.
- **Nodos:** `2196:165`, `2196:223`, `2196:279`, `2196:290`, `2196:347` y `2196:365`.

**Frontend**, spec [`docs/specs/frontend/TS-91.md`](../../specs/frontend/TS-91.md):

- **`.05`:** spec en borrador. Seis decisiones del equipo (§3) y aprobada.
- **`.06`:** tests en rojo en 7 archivos (#1-#28), con estos ayudantes:
  - `src/test/wav.ts`: señales y WAV en memoria;
  - `src/test/analisis.ts`: dobles con los números de `datosDeAnalisis`;
  - referencias de `ffmpeg` en `src/test/fixtures/ebur128/` (3,3 MB), generadas con `scripts/ebur128-fixtures.sh`;
  - juego de demo de 12 casos con `scripts/audio-demo.sh`, en `frontend/demo-audio/` (317 MB, en `.gitignore`).
- **`.07`:** Green:
  - nuevos: `audioAnalysis.ts`, `audioAnalysis.worker.ts`, `startAnalysis.ts` y `TechnicalCheck.tsx`;
  - cambian: `VersionUpload`, `VersionHistory`, `VersionPlayer`, `versionSchema` y `versionApi`.
- Commits: `41bca69`, `50cb61d`, `26d4281` y `186d944`.

**Resultados medidos** (están en la spec frontend §6):

- **Referencias:** el volumen coincide exactamente con `ffmpeg`. El pico difiere como mucho 0,3 dB.
- **Juego de demo (WAV):** ±0,1 LU en volumen y ±0,4 dB en pico.
- **Rendimiento en Node:** unos 7 s para una canción de 4 min y unos 36 s para el tope de 20 min.

## 3. Decisiones tomadas en esta sesión

Todas son del equipo y ya están en su documento dueño.

**Backend y ADR** (spec backend §6; ADR D7.9 y D7.10):

1. **D7.9:** el rango de dB se amplía hasta +20, porque un master saturado supera 0 dBTP.
2. **422 por el análisis:** el frontend reintenta la confirmación sin `analysis`. Así «rechaza un resumen inválido» y «nunca bloquea» se cumplen a la vez.
3. **Advertencias:** las calcula el backend en `VersionResource`, de modo que `TS-95` contará con la misma regla.
4. **Orden de trabajo:** `TS-90` antes del Green de `TS-91`.
5. **Forma del análisis:**
   - la spec no fija el número de claves (antidrift);
   - las series no se devuelven hasta `TS-93`;
   - los silencios cuentan desde 1 s;
   - el tope es de 20 min (1200 tramos);
   - los estados son `ok`, `warning` y `not_applicable`.

**Frontend** (spec frontend §6):

6. **Espera de 15 s** tras S3; pasado ese tiempo, la versión se confirma sin análisis.
7. **Tope de 10 min para el MP3**, por memoria (unos 230 MB decodificado).
8. **Silencio** por pico de muestra por debajo de −60 dBFS.
9. **Silencios listados:** el frontend filtra cuáles enseña, pero el estado viene siempre del backend.
10. **Texto para lo que no es master:** «Solo se revisa en el master», en lugar del «No se revisa en mezclas» del marco 12.
11. **Dos juegos de audio:**
    - A, versionado, para la prueba automática;
    - B, de demo, generado por script.

    El MP3 se verifica a mano en staging.

El punto **7.10 sigue PARCIAL**: los valores del chequeo esperan al productor, pero no bloquean porque llegan en `thresholds`.

## 4. Trampas y hallazgos (lo que costó tiempo)

**Medición y referencias:**

- **`ffmpeg ebur128` sobrestima el pico real de un seno puro a fs/4:** +2,2 dBTP, cuando el valor exacto es +1,58, con el FIR del anexo 2 de BS.1770. Una implementación correcta habría fallado la tolerancia de ±0,5. **No uses senos puros de alta frecuencia como referencia de pico**: usa ruido o material realista.
- **Comprobar las referencias antes de escribir el test:** sin numpy en el equipo, un prototipo en Node con el FIR de la norma, en el scratchpad, sirvió para validarlas. Así se evitó escribir un test imposible de pasar.
- **Butterworth de 2.º orden:** atenúan solo unos 12 dB por octava. Con 100 Hz y 8 kHz, el test de bandas no llegaba a 20 dB; se pasó a 50 Hz y 12 kHz con 10 dB. **Calcula la atenuación antes de fijar un margen.**
- **Mono frente a estéreo:** BS.1770 suma la energía de los canales, así que pasar a mono baja unos 3 dB (−17 LUFS frente a −14). No es un fallo.
- **Rendimiento:** el bucle del pico real era lento porque leía y escribía variables del closure en cada muestra. Copiarlas a locales dentro de un bucle por canal lo bajó de 3,3 a 2,7 s. Aplanar los coeficientes no cambió nada.

**Tests:**

- **Temporizadores falsos y Testing Library:** con `setTimeout` falso, `waitFor` y `findBy` se cuelgan, porque al terminar esperan un `setTimeout(0)`. Avanza el reloj con `act` y `vi.advanceTimersByTimeAsync`, y vuelve a los temporizadores reales antes de cualquier `waitFor`.
- **`vi.mock` de un módulo que aún no existe** impide cargar todo el archivo de tests. Los tests nuevos de un componente que ya tiene tests van en un archivo aparte (`VersionUpload.analysis.test.tsx`).
- **`erasableSyntaxOnly`** prohíbe las propiedades en el constructor (`constructor(private x)`), tanto en el código como en los dobles de test.
- **`tsconfig.app.json`** no carga los tipos de Node: un test que use `node:fs` necesita `/// <reference types="node" />`.

**Scripts y entorno:**

- **`set -o pipefail` con `grep -q`:** cuando `grep -q` cierra la tubería, el comando anterior muere por SIGPIPE y el script falla. Además, `read` devuelve error si la línea no termina en salto de línea, y con `set -e` el script se corta sin avisar.
- **Prettier y ediciones a mano:** las ediciones posteriores al Green dejaron dos problemas de formato (§6). Hay que pasar `npm run format:check` antes de cada commit del frontend.
- **`graphify`** no está instalado en este equipo (`command not found`), así que el grafo no se actualizó.

## 5. Drift detectado

- **Spec frontend §3.3, cabecera del WAV:** decía que se leían 64 KB; el código lee cada chunk con su propio `slice`. Ya se corrigió la spec.
- **Spec frontend §3.1, firmas:** se añadió el parámetro `clipLevel`. Ya está corregido.
- **Marco 12 de `TS-88`:** dice «No se revisa en mezclas» y el código, «Solo se revisa en el master» (decisión 10). El marco no se ha actualizado; puede hacerlo el equipo o `TS-73`.
- **Checklist de Jira `TS-91`:** en esta sesión no se marcó ningún paso. Falta comprobar y marcar de `.01` a `.07`.

## 6. Bloqueos y pendientes

1. **`format:check` falla en `186d944`**, por las ediciones a mano posteriores al Green:
   - `src/routes/versions/VersionUpload.tsx:131` tiene un espacio al final de un comentario;
   - `src/routes/versions/audioAnalysis.worker.ts:4` tiene una línea en blanco doble.

   Se arregla con `cd frontend && npx prettier --write src/routes/versions/VersionUpload.tsx src/routes/versions/audioAnalysis.worker.ts` y un commit `style`.
2. **`.08`:** review y C3 del frontend. Tomar `c3.py` del backend como base; el script del scratchpad no persiste.
3. **`.09`, del equipo:**
   - crear el PR;
   - aplicar la migración en staging (es solo de expansión, D9.4);
   - subir los 12 casos de `demo-audio/` y anotar en la spec §6 lo que se ve frente a `esperado.md`. Sobre todo los MP3: #10, #11 y #12.
4. **Checklist de Jira `TS-91`** (§5).
5. **Siguen ABIERTOS en el ADR, sin bloquear:** 5.8, 8.5 y 11.5. Los valores de 7.10 esperan al productor.

## 7. Próximos pasos

1. Corregir el formato (§6.1).
2. **`ts-amp-analisis.08`**, review y C3 del frontend. Una mutación por cada causa de la columna C3 de la spec §4. Lo más importante:
   - las compuertas de BS.1770: la absoluta y la relativa;
   - el umbral de saturación y el conteo de rachas entre bloques;
   - el recorte y el filtro de silencios;
   - la longitud de las series;
   - los topes de duración y de MP3;
   - la espera de 15 s;
   - la condición del reintento (`analysis` y `analysis.*`);
   - los textos de `not_applicable` y el filtro de silencios listados.

   Si una mutación sobrevive, quita todas las copias a la vez (truco de v47 §4).
3. **`.09`** (equipo).

## 8. Cómo retomar el entorno (si cambió)

Lo mismo que en `HANDOFF_v45`, más:

- **`ffmpeg n9.1` con `libmp3lame`:** solo hace falta para regenerar `src/test/fixtures/ebur128/` (`scripts/ebur128-fixtures.sh`) o el juego de demo (`scripts/audio-demo.sh`, unos 35 s). El CI no lo necesita.
- **Sail:** el backend de `TS-91` necesita `./vendor/bin/sail up -d` para su suite. Al empezar la sesión no estaba levantado.
