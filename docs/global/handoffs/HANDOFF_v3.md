# Handoff v3 — Track Studio

**Fecha:** 2026-09-24 · **Sprint:** 1 · **Capa:** backend
**Foco de la sesión:** cierre de TS-27 mediante correlación del `trace_id` con Sentry.

> Continúa [`HANDOFF_v2.md`](HANDOFF_v2.md). Este documento reemplaza su estado operativo; los handoffs anteriores permanecen como historial.

---

## 1. Estado ejecutivo

**TS-27 queda cerrado a nivel de código.** Los errores API conservan el contrato RFC 9457 ya implementado y, ante un 500 inesperado, el mismo ULID aparece en la respuesta como `trace_id` y en el evento de Sentry como tag `trace_id`.

Se instaló `sentry/sentry-laravel` 4.28.0, con `sentry/sentry` 4.32.0 resuelto por Composer. La integración usa `Sentry\Laravel\Integration::handles($exceptions)`; no existe una captura manual adicional que duplique eventos.

El proyecto real de Sentry y su DSN todavía no están disponibles. `.env.example` incluye `SENTRY_LARAVEL_DSN=` vacío y la ausencia del DSN desactiva el envío sin alterar la respuesta. `sentry:test` queda como validación operativa pendiente, no como bloqueo del código de TS-27.

Los contratos y los rojos ya observados de TS-28/TS-29 permanecen en la spec y en `c53d03d`, pero sus archivos de prueba se separaron de la rama TS-27 para mantener un PR por tarea.

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

Antes de separar los tests futuros, la suite global ejecutó 39 casos: 25 pasaban y los otros 14 correspondían exclusivamente a TS-28/TS-29. Después de retirar de esta rama esos tests y sus helpers, la suite completa de TS-27 pasa dentro de Sail con **25 tests y 103 assertions**.

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

Los tests futuros que entraron originalmente en `c53d03d` se retiraron mediante un commit posterior de separación, sin reescribir la historia. El PR de TS-27 queda así limitado a sus pruebas verdes. Los contratos no se relajaron: el commit original conserva los archivos para recuperarlos en sus tareas.

El siguiente trabajo funcional es TS-28 (`auth0/login:^7`, guard `auth0-api` y extracción del rol). Debe comenzar desde `develop` después de fusionar TS-27, recuperar de `c53d03d` `TokenGuardTest.php` y `UserRepositoryTest.php`, y reintroducir únicamente el helper `claimsDeToken()`. TS-29 recuperará después `MeEndpointTest.php` y `impersonarToken()`. No se debe volver a modificar el contrato ya cerrado de TS-27.

## 6. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
