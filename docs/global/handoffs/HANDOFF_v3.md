# Handoff v3 — Track Studio

**Fecha:** 2026-09-24 · **Sprint:** 1 · **Capa:** backend
**Foco de la sesión:** cierre de TS-27 mediante correlación del `trace_id` con Sentry.

> Continúa [`HANDOFF_v2.md`](HANDOFF_v2.md). Este documento reemplaza su estado operativo; los handoffs anteriores permanecen como historial.

---

## 1. Estado ejecutivo

**TS-27 queda cerrado a nivel de código.** Los errores API conservan el contrato RFC 9457 ya implementado y, ante un 500 inesperado, el mismo ULID aparece en la respuesta como `trace_id` y en el evento de Sentry como tag `trace_id`.

Se instaló `sentry/sentry-laravel` 4.28.0, con `sentry/sentry` 4.32.0 resuelto por Composer. La integración usa `Sentry\Laravel\Integration::handles($exceptions)`; no existe una captura manual adicional que duplique eventos.

El proyecto real de Sentry y su DSN todavía no están disponibles. `.env.example` incluye `SENTRY_LARAVEL_DSN=` vacío y la ausencia del DSN desactiva el envío sin alterar la respuesta. `sentry:test` queda como validación operativa pendiente, no como bloqueo del código de TS-27.

TS-28 y TS-29 continúan deliberadamente en Red.

## 2. Evidencia SDD/TDD

| Compuerta | Evidencia |
| --- | --- |
| Spec | Contrato de correlación aprobado y registrado en `docs/specs/backend/HU-03.md` |
| Primer Red | 23 tests focalizados: 22 verdes y 1 rojo porque el SDK no existía |
| Segundo Red | Con el SDK instalado: 22 verdes y 1 rojo porque Sentry recibió cero eventos |
| Green | Dentro de Sail: **23 tests, 101 assertions, todo verde** |
| C3 | Quitar el SDK o retirar `Integration::handles()` reproduce los dos rojos observados |
| Formato | `sail pint --test` pasa |
| Análisis estático | PHPStan nivel 5 pasa con cero errores |
| Dependencias | `composer validate --strict` y `composer audit` pasan; cero advisories conocidos |
| Review | Cero hallazgos abiertos; se corrigió un comentario obsoleto del test antes del cierre |

La suite global ejecutó 39 casos: 25 pasan y quedan 14 no verdes exclusivos de TS-28/TS-29 (`auth0-api`, `UserRepository` y `/api/v1/me` aún no implementados). No son regresiones de TS-27.

## 3. Implementación cerrada

- Un resolvedor único obtiene o genera el ULID y lo guarda en los atributos del `Request`.
- El callback reportable se registra antes que la integración oficial y añade el tag `trace_id` al scope actual de Sentry.
- El renderer reutiliza el ULID del request al construir el Problem Details.
- El test usa un cliente real del SDK con un `TransportInterface` en memoria; no usa red ni credenciales.
- `.env.example` documenta la variable sin valor. El `.env` real continúa ignorado por Git.

## 4. Pendientes operativos

Cuando el equipo confirme o cree el proyecto de Sentry:

1. Copiar el DSN en `backend/.env` o en las variables del ambiente, nunca en el repositorio.
2. Ejecutar `./vendor/bin/sail artisan config:clear`.
3. Ejecutar `./vendor/bin/sail artisan sentry:test` en un ambiente autorizado y comprobar el evento en Sentry.

## 5. Estado Git y siguiente tarea

Rama actual:

```text
feature/TS-27-manejador-excepciones
```

Commit sugerido para la unidad pendiente:

```text
feat(backend): TS-27 correlacionar trace_id con Sentry
```

La rama ya contiene, desde `c53d03d`, los tests rojos de TS-28 y TS-29. Por ello, un CI que ejecute toda la suite seguirá rojo aunque TS-27 esté cerrado. Antes de fusionar hacia `develop`, el equipo debe implementar esas tareas o separar sus tests futuros en las ramas correspondientes; no se deben relajar ni borrar silenciosamente.

El siguiente trabajo funcional es TS-28 (`auth0/login:^7`, guard `auth0-api` y extracción del rol). Debe comenzar revisando `HU-03.md` §3.2 y los rojos existentes, sin volver a modificar el contrato ya cerrado de TS-27.

## 6. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
