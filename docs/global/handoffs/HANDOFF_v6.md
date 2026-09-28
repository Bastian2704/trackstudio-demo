# Handoff v6 — Track Studio

**Fecha:** 2026-09-28 · **Sprint:** 1 · **Capa(s):** backend / global
**Foco de la sesión:** TS-44: endpoint de salud `/api/v1/health` para UptimeRobot (D9.3) y su exención de D3.1.

> Continúa `HANDOFF_v5.md` (smoke test de staging, 2026-09-27). **v5 todavía no está en esta rama ni en `develop`**; el enlace funcionará cuando se integre. Los handoffs anteriores permanecen como historial.

---

## 1. Resumen ejecutivo

Se revisó la guía externa de UptimeRobot contra el ADR y el repo, y se corrigieron varios choques. El más importante es la ruta: `/api/v1/health`, no `/api/health`. Se decidió que health queda **exento de D3.1** y que `/up` se justifica como segunda ruta pública frente a RNF-01. Primero se escribió la spec y los tests en rojo; después el humano tecleó el controlador y la ruta. Dentro de Sail pasan la suite completa (**40 tests, 133 assertions**), Pint y PHPStan (0 errores). **Nada está commiteado todavía.** La configuración de Railway y de UptimeRobot sigue pendiente.

## 2. Qué se hizo

| Tarea | Estado | Evidencia |
| --- | --- | --- |
| Spec `docs/specs/backend/HU-02.md` (TS-44) | Hecho (el agente) | Contrato 200/503, fuera de alcance y tabla de tests |
| ADR D9.3: contrato de health, exención de D3.1 y rutas públicas frente a RNF-01 | Hecho (el agente) | `docs/adr/decisiones-tecnicas-track-studio.md` §9 |
| ADR D3.1: párrafo de exención limitado a `/api/v1/health` | Hecho (el agente) | §3, tras "Distinción 401 vs 403" |
| `backend/tests/Feature/HealthCheckTest.php`: 8 casos en Pest | Hecho (el agente) | Rojo con 404 → verde |
| `HealthController.php` (sin `environment`, `report($e)`) y la ruta en `routes/api.php` sin throttle | Hecho (el humano) | Auditado: un hallazgo menor, ver §4 |

**Evidencia SDD/TDD:**

| Compuerta | Evidencia |
| --- | --- |
| Rojo (C3) | 8/8 fallan con 404 (ruta inexistente) antes de registrar la ruta. |
| Verde | 8/8 en `HealthCheckTest`. |
| Formato | `sail pint` corrigió 2 detalles de estilo en el controlador y la ruta; después pasa. |
| Análisis estático | PHPStan nivel 5: 0 errores. |
| Suite | 40 tests, 133 assertions, todo verde. |
| Review del diff | Coincide con la spec. Hallazgo menor: falta `declare(strict_types=1)`. |

## 3. Decisiones tomadas en esta sesión

- **Health exento de D3.1** (registrado en D9.3, con referencia cruzada en D3.1). Health es un reporte de estado y no un error. En RFC 9457 `status` es un entero, mientras que aquí es `"ok"`/`"degraded"`: mezclarlos rompería el keyword del monitor. La forma es la misma en 200 y en 503. La exención es **solo para esta ruta**, y su 503 no cuenta como violación de "ningún controlador formatea errores".
- **Contrato:** las claves son exactamente `status`, `checks` y `timestamp`. Sin `environment` (repo público, D2.2). El fallo de BD se reporta con `report()` para que llegue a Sentry con `trace_id`, y el mensaje nunca va al cuerpo.
- **Rutas públicas frente a RNF-01:** `/up` (Laravel, fuera de `api/*`) y `/api/v1/health`. Las dos quedan justificadas en D9.3.
- **Sin throttle** en health mientras 8.5 siga ABIERTO.
- **Fuera de TS-44:**
  - El rollback (9.4) y las migraciones en deploy (9.2): tareas propias.
  - El correo de mantenimiento por Resend: se sustituye por un correo manual y un runbook.
- **No** se añade `SERVICE_UNAVAILABLE` al catálogo de D3.1.

## 4. Trampas y hallazgos

1. **La guía externa usaba `/api/health`.** `bootstrap/app.php` pone `apiPrefix: 'api/v1'`, así que la ruta real es **`/api/v1/health`**. Hay que usarla también en el Healthcheck Path de Railway y en los monitores de UptimeRobot.
2. **La guía también ponía `throttle:60,1`.** Eso es decidir 8.5 por la puerta de atrás. Se retiró.
3. **Los tests de BD caída usan `DB::shouldReceive('select')`.** Si el controlador cambia a otra API de `DB` (p. ej. `getPdo()`), el mock deja de interceptar la llamada. Hay que mantener `DB::select('SELECT 1')`.
4. **Aviso `fopen(.../pestphp/pest/.temp/test-run-history): Permission denied`** al correr Pest. Es solo el historial de Pest y no afecta al resultado. Se arregla con `sudo chown -R $USER backend/vendor/pestphp/pest/.temp`.
5. **Hallazgo del review:** `HealthController.php` no tiene `declare(strict_types=1)`, que el resto del código sí lleva. Añadirlo antes del commit `feat`.
6. **`sail stop.`** (con punto) falla con "unknown docker command". Es solo un error de tecleo.

## 5. Drift detectado

- **`CLAUDE.md` raíz §1.1** (heredado de v4 y v5) sigue diciendo "**8.3** CORS y rate limiting". Debe decir **8.5** rate limiting.
- **RNF-04, medición "mensual" frente a "por sprint":** la guía externa habla de "≥ 95 % mensual", mientras que D9.3 dice "por sprint, en cada Sprint Review". Hay que contrastarlo con el texto real de RNF-04 en la tesis y corregir el dueño que esté mal.
- **Criterios de aceptación de TS-44 en Jira:** no se contrastaron con `HU-02.md` §4 porque el agente no tiene acceso a Jira.

## 6. Bloqueos y pendientes

- **Commits y PR** (los hace el humano; los comandos están en §8).
- **Infraestructura** (la hace el humano, regla §0.6):
  1. Railway, en staging y prod: Healthcheck Path = `/api/v1/health` y la suspensión por inactividad desactivada.
  2. UptimeRobot: contacto de alerta con los dos correos del equipo; monitor de tipo Keyword `"status":"ok"` sobre `/api/v1/health` y monitor HTTP(s) del frontend, en staging y en prod.
  3. Prueba de alerta en staging (correos de caída y de recuperación, con captura).
  4. Status page pública.
- **Lo escribirá el agente cuando haya URLs:** `runbook-mantenimiento.md` (aviso con 24 h de anticipación, pausar y reactivar monitores) y la tabla de disponibilidad de RNF-04.
- **HANDOFF_v5 fuera del repo:** versionarlo junto a este.
- Sigue **ABIERTO** en el ADR: 8.5 rate limiting, 9.2 migraciones en deploy, 9.4 rollback y 11.5 plan de medición de RNF (RNF-04 ya tiene instrumento).
- `docs/global/Prompts-fase.md` sigue sin seguimiento en Git.

## 7. Próximos pasos

1. Añadir `declare(strict_types=1)` al controlador, volver a correr `sail pest --filter=HealthCheck`, commitear y abrir el PR contra `develop`.
2. Tras el merge y el deploy: `curl -i https://trackstudio-demo-staging.up.railway.app/api/v1/health` debe dar 200 con `"status":"ok"`.
3. Configurar Railway y UptimeRobot, y hacer la prueba de alerta (§6).
4. El agente: runbook de mantenimiento y tabla de RNF-04.
5. Corregir el drift de `CLAUDE.md` §1.1.

## 8. Comandos git

```fish
cd ~/repositories/trackstudio-demo

git add docs/adr/decisiones-tecnicas-track-studio.md docs/specs/backend/HU-02.md backend/tests/Feature/HealthCheckTest.php
git commit -m "docs(adr): TS-44 contrato de health y exencion de D3.1" -m "Spec HU-02 y tests de /api/v1/health (rojo verificado en Sail)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

git add backend/app/Http/Controllers/HealthController.php backend/routes/api.php
git commit -m "feat(backend): TS-44 agregar endpoint GET /api/v1/health"

git add docs/global/handoffs/HANDOFF_v5.md docs/global/handoffs/HANDOFF_v6.md
git commit -m "docs(global): TS-44 agregar HANDOFF_v5 y HANDOFF_v6" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

git push -u origin feature/TS-44-uptime-config
```

## 9. Cómo retomar el entorno

```fish
cd backend
./vendor/bin/sail up -d
./vendor/bin/sail pint --test; and ./vendor/bin/sail php vendor/bin/phpstan analyse --no-progress; and ./vendor/bin/sail pest
./vendor/bin/sail stop
```

## 10. Regla

Cada 10 handoffs, crear uno nuevo que unifique los 10 previos y nada más.
