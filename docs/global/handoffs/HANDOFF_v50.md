# Handoff v50 — Track Studio

**Fecha:** 2026-11-25 · **Sprint:** 5 (ampliación de alcance) · **Capa(s):** docs y backlog (Jira)
**Foco de la sesión:** descartar «varios productores» (`TS-96`, `TS-89`) en Jira y en los docs del repo.

## 1. Resumen ejecutivo

Se descarta tener varios productores. Lo decidió el equipo el 2026-11-23, de acuerdo con el productor de Millenium Sound: el estudio no lo necesita.

- **Jira:** `TS-96` (Story, 1 SP) y `TS-89` (Task, segunda cuenta de productor en Auth0) llevan un comentario y la etiqueta `descartado`, salieron del `TS Sprint 5` al backlog y están cerradas en `Listo`. El objetivo del sprint 73 ya dice 28 SP y no menciona la autoría.
- **Repo:** rama `chore/TS-96-descartar-varios-productores`, con PR a `develop` abierta y `develop` ya fusionado (`ec9f941`).
- **Alcance:** el S5 pasa de 29 a 28 SP y la ampliación de 27 a 26 SP.
- **Sin código:** no hay nada que revertir en el modelo; `artists.created_by` y `versions.uploaded_by` se quedan.

## 2. Qué se hizo

- **Búsqueda en Jira:** solo `TS-96` y `TS-89` están ligadas a varios productores, y solo se enlazan entre sí (`TS-89` bloquea a `TS-96`). `TS-95` salió en la búsqueda por la frase «varios artistas» y no tiene relación.
- **Jira** (agente):
  - un comentario con la decisión en cada una;
  - la etiqueta `descartado`, sin quitar las anteriores salvo `target-s5`;
  - salida al backlog del tablero 3 y transición a `Listo`;
  - el objetivo del sprint 73 reescrito, con el mismo nombre y las mismas fechas.
- **Docs** (commit `be5dc41`):
  - `CLAUDE.md` §5: se quita de la lista del S5 y se añade a «Siguen fuera»;
  - `docs/backlog/ampliacion-alcance-2026-11.md`: §5.7 marcada como DESCARTADO, y §8 y §9 tachadas, con 26 SP;
  - `docs/backlog/sprints/sprint-05.md`: 28 SP, registros, cortes, DoD y riesgos;
  - `docs/backlog/roadmap.md`: decisión nueva en «Reglas de alcance» y nota en la línea del S5;
  - `docs/backlog/jira-key-map.md`: ambas como «Descartada (2026-11-23)»;
  - `docs/specs/backend/HU-17.md`: la presentación del autor ya no depende de `TS-96`;
  - `docs/specs/backend/HU-20.md` («Pendiente si se agregan varios productores») y `docs/erd/modelo-completo.md` §3.7: `revoked_by` queda fuera de alcance; la lista de cambios se conserva por si se reabre.
- **Sincronización con Jira** marcada en `sprint-05.md` (commit `170c697`).
- **Merge de `develop`:** había un conflicto add/add en `docs/specs/backend/TS-91.md`, porque la rama nació con `19edde5`, la spec de `TS-91` antes de integrarse. Se resolvió con la versión de `develop` (PR #71). El ADR quedó igual que en `develop`.

## 3. Decisiones tomadas en esta sesión

1. **Se descarta tener varios productores** (equipo, 2026-11-23, con el productor de Millenium Sound). `TS-96` y `TS-89` salen del alcance.
2. **Cierre en Jira con `Listo` + etiqueta `descartado`**, porque el flujo no tiene un estado de descarte (Por hacer, En curso, Pendiente de Verificacion, Listo). Salieron del sprint antes de cerrarse, así que no suman a la velocidad.
3. **`revoked_by` queda fuera de alcance**, ya no solo diferido.

## 4. Trampas y hallazgos (lo que costó tiempo)

- **El MCP de Atlassian falló** con un HTTP 503 de OAuth, y volvió solo después de limpiar la autenticación con `/mcp`.
- **`manageJiraSprint` con `update` reescribe todo el sprint:** si falta el nombre, las fechas o el objetivo, se borran. Siempre hay que reenviar los cuatro.
- **Para buscar con `text ~` en Jira**, la frase «varios productores» también encuentra «varios artistas», así que cada resultado se revisa antes de tocarlo.
- **Firmas:** se repite lo de v49 §4. El agente volvió a incluir `Co-Authored-By` y «Generated with Claude Code» en los bloques, y el equipo los commiteó sin la firma. Ningún bloque debe llevarla (`reglas-git.md` §3).

## 5. Drift detectado

- **Prueba de HU-19:** `sprint-05.md` («Fronteras de alcance», viñeta «Artista») dice que la prueba de «solo borra los suyos» usa dos productores. Son usuarios de factory en el test, no una segunda cuenta real, y no se cambió. Si la spec de HU-19 prefiere productor y artista, se ajusta allí.
- **`HANDOFF_v49` §7.2** apunta a `TS-96` como siguiente paso. Queda corregido aquí (ver §7).

## 6. Bloqueos y pendientes

1. **PR de esta rama a `develop`:** CI y merge, a cargo del equipo.
2. **Consolidación:** v50 es múltiplo de 10. Hay que crear `HANDOFF_v41-v50_consolidado.md` y mover v41..v50 a `trackstudio-documentacion/Handoffs`, comparando antes con `cmp` (plantilla §9). Se hace en una tarea aparte.
3. **Siguen pendientes de v49 §6:** `.09` de `TS-91`, la checklist de Jira de `TS-91`, el marco 12 de `TS-88` y `graphify` sin instalar.
4. **Siguen ABIERTOS en el ADR, sin bloquear:** 5.8, 8.5 y 11.5.

## 7. Próximos pasos

1. Integrar la PR de esta rama.
2. Hacer la consolidación v41-v50 (§6.2).
3. Seguir con la ampliación de S5: `TS-92` (flujo de revisión), empezando por su marco en `TS-88` y su spec backend. `TS-96` ya no está.

## 8. Cómo retomar el entorno (si cambió)

Sin cambios respecto a `HANDOFF_v48`.
