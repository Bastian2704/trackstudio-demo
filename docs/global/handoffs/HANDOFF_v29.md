# Handoff v29 — Track Studio

**Fecha:** 2026-10-22 · **Sprint:** 3 · **Capa(s):** backend e infraestructura (CI)
**Foco de la sesión:** `TS-77`, hotfix de seguridad. PHP sube a 8.4.27 por PHP2Shell y se corrigen los avisos de `composer audit`, todo en la misma tarea por decisión del equipo. Rama `fix/TS-77-php-8-4-27`, con base en `develop`.

> Continúa [`HANDOFF_v28.md`](HANDOFF_v28.md) (TS-23).

## 1. Resumen ejecutivo

En local se cumplen los AC que dependen del repo:
- Sail corre `php -v` 8.4.27.
- `composer validate` pasa y `composer audit` no da avisos.
- Pint y Larastan, limpios.
- Pest: 400 pasados y 1 omitido.

Faltan el CI verde en el PR y lo que hace el equipo en Railway: comprobar `php -v` en staging y producción, y el smoke test de login y listados.

## 2. Qué se hizo

- **Jira:** la descripción de TS-77 se reescribió con el ajuste del CI, la ampliación a las dependencias y el AC «`composer audit` sin avisos».
- **ADR D2.1:**
  - En la tabla, PHP pasa a 8.4.27 y Laravel Framework a 13.35.0.
  - Nota de TS-77: CVE, cómo se fija el runtime en Sail, CI y Railway, la actualización dirigida de dependencias y el drift.
- **Tests guardianes** (en `backend/tests/Unit/`, vistos en rojo antes del Green):
  - `PhpRuntimeTest.php`: el runtime y `config.platform.php` deben estar en `>= 8.4.27, < 8.5`.
  - `DependencyAdvisoriesTest.php`: mínimos corregidos de `symfony/http-foundation` (8.1.7), `laravel/framework` (13.30.0) y `league/commonmark` (2.10.2).
- **Green del equipo:**
  - `config.platform.php` en 8.4.27 y `composer update --lock`.
  - `sail build --no-cache`.
  - `env: update: true` en los 3 jobs del CI.
  - `composer update` dirigido a los 3 paquetes, sin `-W`: framework 13.35.0, http-foundation 8.1.9 y commonmark 2.10.4.

## 3. Decisiones tomadas en esta sesión

1. **Parche dentro de la rama 8.4**, sin pasar a 8.5 (decisión del equipo, ya propuesta en el ticket).
2. **CI con `"8.4"` + `update: true`**, porque `setup-php` no acepta versión de parche. El mínimo lo hace cumplir el test guardián.
3. **Los avisos de `composer audit` entran en TS-77** (decisión del equipo), con un `composer update` dirigido y solo a esos 3 paquetes.

## 4. Trampas y hallazgos

1. **`setup-php` ignora versiones de parche** en `php-version`. Además, `env:` va al nivel del step, como hermano de `with:`. Si queda dentro de `with:`, se lee como un input desconocido y no tiene efecto.
2. **`docker exec` sin `-u sail` corre como root.** Una ejecución de PHPStan como root dejó `/tmp/phpstan` a nombre de root dentro del contenedor, y luego `sail … phpstan` falló con «Unable to create file … Container_*.php.lock». Se arregla borrando `/tmp/phpstan` en el contenedor. Para que no vuelva a pasar: usar siempre `docker exec -u sail` o `sail`.
3. **Drift de la versión de PHP:** el ADR decía 8.4.24, pero el contenedor ya corría 8.4.26. La imagen de Sail no fija el parche (usa el PPA `ondrej/php`), así que cada `sail build` puede cambiarlo. Ahora lo detecta el test guardián.
4. **El `composer.lock` cambió la URL de `phpdotenv`** de `vlucas/` a `phpdotenv/`. Es el mismo commit (`301c079…`) y la misma versión; Packagist movió el repositorio. Es benigno.
5. **El `composer update --dry-run` dirigido** resolvió framework 13.35.0 y no la última 13.38.0. Las versiones posteriores necesitan dependencias más nuevas, y sin `-W` no se suben. Cumple el mínimo de seguridad.

## 5. Drift detectado

- Sin corregir y fuera de alcance: `.nvmrc` = `20.20.0`, una versión de Node en fin de vida y con vulnerabilidades altas (un hook avisó de CVE-2026-111497). Queda registrado en **`TS-78`**, junto con los 25 avisos de `npm audit` del frontend: 1 crítico y 18 altos. Los únicos que llegan al bundle son `axios` y `react-router-dom`. La nota de Vitest en D2.1 enlaza ese salto con `.nvmrc`.
- Sin corregir, heredado: lo listado en v28 §5.

## 6. Bloqueos y pendientes

- **Equipo (regla 6):** comprobar `php -v` en Railway (staging y producción) y fijar 8.4.27 en el panel si hace falta. Después, el smoke test.
- El título de TS-77 en Jira solo menciona PHP. Se puede ampliar con «+ dependencias».

## 7. Próximos pasos

1. Abrir el PR de TS-77 hacia `develop`, con CI verde y el cierre en Railway.
2. `TS-78`: subir Node a 24.22.1 y corregir los avisos de `npm audit`. Falta que el equipo decida sobre `shadcn`, porque `npm audit fix` propone bajarlo a 1.0.0.
3. Lo que quedó pendiente en v28 §7: el `.09` de staging de TS-20, TS-22, TS-23 y TS-24, y el cierre del sprint 3.

## 8. Cómo retomar el entorno

Imagen nueva: `sail build --no-cache && sail up -d` y después `sail composer install`. No hay migraciones nuevas.
