# Operacion de Jira - App_Med

## Fuente de verdad

- Sitio: medihealthec.atlassian.net.
- Space vigente: Medi-Health-EC.
- Key oficial: MHE.
- Tipo: Jira Software team-managed.
- Tablero: MHE board, ID 2.
- Sprint vigente de planificacion: MHE Sprint 1, ID 3.
- Archivo inicial de referencia: [mhe-scaffolding-s1.csv](mhe-scaffolding-s1.csv).
- Resultado inicial: [mhe-s1-setup.md](mhe-s1-setup.md).
- Archivo especifico de S2: [mhe-s2-tickets.csv](mhe-s2-tickets.csv).
- Resultado S2: [mhe-s2-setup.md](mhe-s2-setup.md).

Los documentos locales de producto, la constitucion y las specs aprobadas gobiernan el alcance. Jira registra unidades de trabajo, dependencias y avance; no autoriza implementacion por si solo.

## Convenciones

- Una Epic representa una capacidad transversal.
- Story y Task son las unidades normales de seguimiento.
- Los pasos pequenos viven como Action items dentro de Description.
- Description sigue la plantilla minima de `backlog-format.md`; los campos nativos y enlaces no se duplican como texto.
- Subtask se crea solo cuando necesita responsable, estado o seguimiento propio.
- Cada ticket conserva una etiqueta `local-*` como identificador estable.
- La etiqueta `backlog-official` identifica el catalogo y los tickets de la baseline vigente; no equivale a Ready.
- `sprint-s1` identifica los once tickets seleccionados en MHE Sprint 1; `target-s2` identifica MHE-24 y MHE-26 a MHE-37 mientras permanecen en backlog.
- La etiqueta `mhec-s1-full` identifica el lote ya importado. Se conserva por trazabilidad aunque la key oficial sea MHE.
- La etiqueta `mhe-s2-tickets` identifica los doce tickets nuevos del lote S2.
- Parent expresa pertenencia a una epica.
- Blocks expresa una dependencia entre entregas; el predecesor bloquea al sucesor.
- Estado, casillas y criterios de aceptacion son controles distintos. Completar casillas no mueve el ticket a Done.
- No se asignan estimaciones, personas, fechas ni estados por inferencia.
- Todo contenido usa datos sinteticos y respeta los limites clinicos del proyecto.

## Flujo de trabajo

1. Crear o actualizar la spec, el plan y las tareas locales antes de implementar.
2. Reconciliar el ticket Jira con RF y Tn aprobados.
3. Mover el ticket a In Progress al comenzar la tarea autorizada.
4. Marcar Action items solo cuando su condicion Hecho cuando se cumpla.
5. Registrar evidencia saneada de tests, revision y gates.
6. Usar In Review durante la revision requerida.
7. Mover a Done unicamente cuando cumpla Definition of Done.
8. Actualizar HANDOFF.md al cerrar el bloque.

## Importaciones

El CSV de creacion es de un solo uso. Antes de importar:

- seleccionar exactamente el archivo CSV, no esta documentacion;
- usar el importador administrativo de sistemas externos;
- confirmar UTF-8, separador coma y comillas dobles;
- mapear Work item ID, Work type, Summary, Description, Parent y todas las columnas Labels;
- comprobar el conteo y los tipos en la vista previa;
- detenerse si el importador ofrece una sola columna o un conteo inesperado.

No reimportar el archivo completo despues de un exito parcial o total. Consultar Jira, identificar faltantes y preparar un archivo o una actualizacion minima.

El importador conserva los pasos como texto. La conversion a Action items nativos se realiza despues mediante el conector y se verifica con una lectura posterior.

El lote S2 se materializo mediante el conector porque esta sesion no disponia de importacion CSV ni navegador. El CSV sigue siendo la fuente exacta de sus doce filas y no debe reimportarse.

## Sprint 1

MHE Sprint 1 permanece en estado futuro. Periodo configurado:

- inicio: 2026-09-21 08:00 America/Guayaquil;
- fin: 2026-10-02 18:00 America/Guayaquil;
- objetivo: registro sintetico, verificacion, login, ruta protegida y logout con gates aprobados.

Contiene MHE-14 a MHE-23 y MHE-25. MHE-24, recuperacion por correo, permanece en backlog con objetivo S2. El sprint no se inicia automaticamente.

## Objetivo Sprint 2

MHE-24 y MHE-26 a MHE-37 permanecen en backlog con `target-s2`. No existe todavia un sprint Jira S2 ni una seleccion comprometida. El alcance se estima y selecciona despues de aprobar specs, planes y tareas.

## Consultas utiles

Lote importado:

```text
project = MHE AND labels = "mhec-s1-full" ORDER BY key ASC
```

Tickets oficiales de S1:

```text
project = MHE AND labels = "sprint-s1" ORDER BY Rank ASC
```

Lote creado para S2:

```text
project = MHE AND labels = "mhe-s2-tickets" ORDER BY key ASC
```

Objetivo completo de S2, incluido MHE-24:

```text
project = MHE AND labels = "target-s2" ORDER BY Rank ASC
```

Trabajo activo:

```text
project = MHE AND statusCategory = "In Progress" ORDER BY Rank ASC
```

## Cambios sensibles

Los cambios de auth, permisos, datos clinicos, cifrado, documentos, offline, telemetria o infraestructura requieren los gates definidos en `docs/engineering/security-gates.md`. No incluir secretos, tokens, PHI ni datos reales en tickets, comentarios, adjuntos o logs de importacion.
