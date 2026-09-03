# PLANTILLA — Handoff entre sesiones

Copia a `docs/global/handoffs/HANDOFF_vN.md` (N incremental; **no se sobrescribe** el anterior). Es **memoria entre sesiones**, no una spec. Las specs viven en `docs/specs/`; las decisiones cerradas en el ADR.

**Por qué versionado y por qué largo:** el contexto de un chat no persiste y una sesión de agente se reinicia. Todo lo que importa vive en archivos. Cada handoff anota no solo lo que se hizo, sino **la trampa que costó tiempo**, para que la siguiente sesión no la repita.

---

# Handoff vN — Track Studio

**Fecha:** AAAA-MM-DD · **Sprint:** N · **Capa(s):** backend / frontend / global
**Foco de la sesión:** <una frase>

## 1. Resumen ejecutivo

<2-4 frases: dónde quedó el trabajo, qué está en verde, qué falta para cerrar.>

## 2. Qué se hizo

<Lista de tareas/HU tocadas, con su estado. Enlaza a la spec y al AC de Jira.>

## 3. Decisiones tomadas en esta sesión

<Cada decisión con su porqué. Si cierra o abre una decisión del ADR, dilo y anota el número (Dx.y). Si el acuerdo cambió, el documento dueño ya debió cambiar primero (regla anti-drift).>

## 4. Trampas y hallazgos (lo que costó tiempo)

<El bug concreto, la causa real (reproducida, no supuesta), y cómo evitarla. Este apartado es el que más ahorra a la siguiente sesión.>

## 5. Drift detectado

<Cualquier contradicción entre docs, o entre doc y código. Qué archivo es el dueño y qué hay que corregir. No dejarlo sin registrar.>

## 6. Bloqueos y pendientes

<Qué está ABIERTO en el ADR y qué bloquea. Dependencias externas (dominio, tenant, bucket). Qué NO es "Ready" por esto.>

## 7. Próximos pasos

<La primera cosa que haría la siguiente sesión, en orden de dependencia.>

## 8. Cómo retomar el entorno (si cambió)

<Solo si algo del setup cambió respecto al handoff anterior. Si no, referenciar el handoff previo.>

## 9. Regla

<Cada 10 sesiones de Handoff crear uno nuevo unificando todos los 10 previos nada más>
