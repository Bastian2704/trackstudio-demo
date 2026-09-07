# Metodología — SDD + TDD (Track Studio)

Documento **global**: aplica por igual a `backend/` (Laravel/Pest) y `frontend/` (React/Vitest). Define **cómo trabajamos con el agente**, no qué se construye. El "qué" vive en las historias de usuario (Jira) y sus specs (`docs/specs/`); las decisiones técnicas cerradas, en el ADR (`docs/adr/decisiones-tecnicas-track-studio.md`).

**Léelo completo al inicio de cada sesión.**

---

## 0. Fuentes de verdad (y quién manda sobre qué)

Cada afirmación tiene un único dueño. Si dos documentos se contradicen, gana el dueño de esa materia:

| Materia                                                            | Fuente de verdad                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Qué se construye (historias, criterios de aceptación)              | **Jira** (backlog de 28 HU). Las specs referencian, no copian.   |
| Decisiones técnicas cerradas (formato de error, RBAC, capas, ERD…) | **ADR** (`docs/adr/…`), por número: `D3.1`, `D4.8`, `D6.7`…      |
| Contrato técnico y tests por capa de una HU                        | **spec de la HU** en `docs/specs/{backend,frontend}/HU-XX.md`    |
| Reglas de comportamiento del agente                                | `CLAUDE.md` (raíz + el de cada capa)                             |
| Convenciones de nombres                                            | `backend/docs/nomenclatura.md` · `frontend/docs/nomenclatura.md` |
| Reglas de git                                                      | `docs/global/reglas-git.md`                                      |
| Estado entre sesiones                                              | `docs/global/handoffs/HANDOFF_vN.md`                             |

**Regla anti-drift:** un valor concreto (un código de error, un nombre de claim, una versión, un criterio de aceptación) se escribe en **un solo archivo**. Los demás lo referencian. Duplicarlo es un bug esperando a que las dos copias se separen en silencio.

---

## 1. El problema que este método ataca

No es "la IA codea rápido". Es esto:

> **El agente produce código y pruebas correctos casi siempre, y cuando se equivoca lo hace con la suite en verde.**

Un test que no puede fallar no prueba nada; una spec que el código ya no cumple deja de ser fuente de verdad; un valor inventado por el agente se propaga sin que nada se ponga rojo. Todo lo que sigue existe para forzar que la verificación **pueda fallar** y que la intención **quede escrita**, no recordada.

---

## 2. Reparto de roles — modo "híbrido SDD" (Opción 3)

Este proyecto es un Capstone: la **autoría del código de aplicación es humana**. El agente es un **socio de SDD/TDD y mentor**, no el implementador. Esta regla tiene prioridad sobre el comportamiento por defecto de Claude Code.

| Paso del ciclo                                           | Quién                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Redactar/actualizar la **spec** de la tarea              | **Agente** (el humano aprueba)                                         |
| Escribir los **tests** que fallan (fase roja)            | **Agente**                                                             |
| Escribir el **código de aplicación** hasta verde         | **Humano** (Adrián / Sebastian)                                        |
| **Ping-pong**: ajustar un test si el diseño lo justifica | **Humano propone → agente re-valida**                                  |
| **Code review** del diff humano (§5)                     | **Agente** (el humano decide qué acepta)                               |
| **Commit / push / PR**                                   | **Humano** (el agente solo entrega los comandos — ver `reglas-git.md`) |

**Qué SÍ puede ejecutar el agente sin pedir permiso:** herramientas de solo lectura (`Read`, `Grep`, `Glob`, `graphify`, `git status/branch/log`), y **escribir/correr archivos de test** (crear el archivo de prueba y ejecutarlo para verlo en rojo es parte de su trabajo).

**Qué NO ejecuta el agente:** código de aplicación del proyecto (controladores, servicios, componentes, migraciones, configuración de infra), ni ningún comando de escritura de git. Si cree que hace falta, lo **explica en pasos** y se detiene.

**Excepción explícita:** si el humano lo pide para una acción puntual ("hazlo tú esta vez", "edítalo directamente"), el agente puede escribir ese código. La excepción es por tarea, no permanente.

---

## 3. SDD — Spec-Driven Development (spec-anchored)

La spec vive junto al código y evoluciona con él. El objetivo es evitar el _intent drift_: que el agente (o el humano) derive lejos de la intención acordada.

**Qué es una "spec" en Track Studio.** Un archivo por HU y por capa: `docs/specs/backend/HU-XX.md`, `docs/specs/frontend/HU-XX.md`. **No** reescribe la historia ni sus criterios de aceptación (esos están en Jira). Elabora, para su capa:

1. **Alcance** de esta HU en esta capa (y qué queda fuera / diferido, con motivo).
2. **Contrato técnico**: endpoints, formas de request/response, tipos, componentes, estados — anclado al ADR por número (`D3.1`, `D4.8`…), sin copiar el ADR.
3. **Criterios de aceptación de capa** traducidos a **tests concretos** (nombre del test → qué afirma → cómo se prueba que falla).
4. **Dependencias**: qué HU/tareas/decisiones ABIERTAS del ADR bloquean esta.
5. **Enlace a la contraparte** en la otra capa, si la HU cruza.

**Anclaje sin duplicación.** Una HU cross-capa (p. ej. HU-04 RBAC) se describe en dos archivos enlazados; el criterio a nivel de historia ("un artista recibe 403…") vive en Jira; cada spec de capa tiene **sus** criterios de capa (backend: forma del 401/403; frontend: mapeo del `code` a pantalla). Nada se repite entre las dos.

**La spec se mantiene viva.** Si al implementar aparece algo que la spec no contemplaba (un caso borde, un cambio de contrato), se actualiza el `.md` **en la misma sesión**. Una spec desactualizada es peor que no tenerla. Regla operativa: **cuando cambia el acuerdo, cambia el documento primero.**

---

## 4. El ciclo por tarea

Orden fijo. Cada tarea de una HU recorre:

1. **Specify.** El agente lee la HU en Jira, sus criterios de aceptación, el ADR relevante y el código existente (`graphify` primero — §6). Redacta o actualiza la spec de capa. El humano la aprueba.
2. **Red.** El agente escribe los tests derivados de los criterios de aceptación. **Deben fallar** al correrlos (aún no hay implementación). El agente los corre y muestra el rojo.
3. **Green.** El **humano** implementa el código de aplicación hasta que los tests pasan. Puede consultar al agente ("¿cómo abordarías esta Policy?") — el agente guía, no teclea.
4. **Ping-pong (si aplica).** Si el humano ve que un test choca con un diseño mejor, **lo dice y justifica**; el agente ajusta el test y re-confirma que sigue cubriendo el criterio de aceptación. Los tests no son intocables, pero no se relajan en silencio.
5. **Review.** Con la suite en verde, el agente audita el diff humano (§5) y verifica que cada test **puede fallar**.
6. **Commit.** El humano commitea; el agente solo entrega el bloque de comandos (ver `reglas-git.md`). El agente **se detiene**.

Iteraciones pequeñas: un diff revisable por vez, una tarea por vez. No "de paso" se tocan otras cosas.

---

## 5. Las compuertas TDD (no negociables)

**C1 — No hay tests sin spec aprobada.** Si la spec no está, se escribe primero (§3).

**C2 — No hay implementación sin un test que ya falle.** El rojo se ve antes de teclear código de aplicación. Si un test nace verde sin implementación, está mal escrito.

**C3 — Todo test nuevo se prueba rompiéndolo.** Esta es la mitad que casi nadie hace y la razón de ser del método. Por cada test que afirme algo no trivial, en el **Review** se rompe a propósito lo que afirma (se revierte el arreglo, o se muta el valor) y se comprueba que **se pone rojo**. Un test que sigue verde con el código roto se corrige o se borra. Se documenta en el reporte: _"probado en rojo revirtiendo X"_.

**C4 — Se testea contra la frontera real cuando el contrato es externo.** Un test que mockea la dependencia prueba nuestro código, no el contrato. Los tests de Service mockean las interfaces externas (`AudioStorageContract`, `MailerContract`, Auth0), pero al menos un test de integración ejercita el endpoint real (p. ej. `migrate` contra el PostgreSQL de servicio en CI, el JWT real de Auth0 verificado en jwt.io antes del middleware).

**C5 — Un test verde es un criterio de aceptación válido.** Una tarea no está terminada sin tests que la cubran. "0 hallazgos" en el review es un resultado válido y se dice tal cual; no se inventa trabajo para parecer diligente.

### Qué busca el Review (§4 paso 5), acotado al diff de la tarea

- **Código muerto o de más**: exports, props, constantes que no usa nadie; abstracciones de un solo uso.
- **Lo mismo escrito dos veces**: el peor, porque se separa sin ponerse rojo (§0 anti-drift).
- **Bugs estáticos**: nulos sin cubrir, errores tragados, entrada del usuario/cliente sin validar en la frontera, trabajo en el cliente que iba en el servidor.
- **Tests que no pueden fallar** (C3).
- **Drift docs↔código**: si la spec, el ADR o el handoff afirman algo que la implementación desmintió, se corrige en la misma pasada.

El agente entrega la lista de hallazgos con `archivo:línea`, cada uno **arreglado** (por el humano, guiado) o **justificado por escrito**.

---

## 6. Herramientas por capa

El ciclo es el mismo; las herramientas cambian según dónde ocurra el trabajo. El `CLAUDE.md` de cada carpeta las detalla; resumen:

|                           | Backend (`backend/`)                     | Frontend (`frontend/`)     |
| ------------------------- | ---------------------------------------- | -------------------------- |
| Runner de tests           | **Pest** (`sail pest`)                   | **Vitest** (`npm test`)    |
| Tipos / análisis estático | **Larastan** nivel 5 (`phpstan analyse`) | `tsc --noEmit`             |
| Formato                   | **Pint** (`pint --test`)                 | ESLint + Prettier          |
| Test de flujo de usuario  | Feature tests de Pest (endpoint + RBAC)  | (E2E cuando aplique)       |
| Instalación en CI         | `composer install` (nunca `update`)      | `npm ci` (nunca `install`) |

Regla común (D2.1): el pin real lo dan los lockfiles versionados; CI respeta el lockfile.

---

## 7. `graphify` — buscar antes de escribir

Antes de escribir un test o proponer una implementación, el agente consulta el grafo de conocimiento del código (`graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concepto>"`). Sirve para **reutilizar en vez de reescribir** (¿ya existe este helper, este Service, esta interfaz?) y para que los tests referencien símbolos reales, no inventados. Tras modificar código, `graphify update .` mantiene el grafo al día (solo AST, sin costo de API).

Es memoria **del código**, no de la conversación. La memoria entre sesiones la cargan los archivos versionados: las specs y el `HANDOFF_vN.md`.

---

## 8. Lo que este método NO cambia

- **Las puertas ABIERTAS del ADR siguen cerrando.** Si una tarea toca algo marcado `ABIERTO` (hoy: bloque 7, subida de audio a S3), no se escribe ni su spec de implementación ni sus tests todavía: se señala la decisión pendiente. Ninguna historia de audio (HU-13..HU-16) es "Ready" mientras siga abierto.
- **"Qué NO hacer todavía"** del `CLAUDE.md` manda por encima de este ciclo. Aunque el método permita escribir tests, no se escriben para módulos vetados en ese bloque.
- **Definition of Done** del proyecto (código en rama principal sin fallos de pipeline, tests pasando, AC cumplidos, RNF verificados, revisado en Sprint Review) sigue siendo el criterio de cierre. Este método es cómo se llega ahí, no un sustituto.

---

## 9. Definición de "Ready" y "Done" para el agente

**Ready (una tarea puede entrar al ciclo) si:** su HU tiene criterios de aceptación en Jira; sus dependencias del ADR están en estado `DECIDIDO`; no cae en "Qué NO hacer todavía".

**Done (el agente puede entregar el bloque de commit) si:** spec de capa escrita/actualizada; tests en verde; cada test probado en rojo (C3); review sin hallazgos abiertos; AC de capa cubiertos; docs sin drift. Sin esto, la tarea no está entregada aunque "funcione".
