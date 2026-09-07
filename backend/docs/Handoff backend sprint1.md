# Handoff — Track Studio / Backend (Sprint 1)

**Fecha de la sesión:** 31 de agosto de 2026
**Foco de la sesión:** Levantar y contenerizar el backend Laravel en el monorepo, y montar la cadena de calidad (Pest + Larastan + Pint) antes de tocar Auth0.
**Repositorio:** https://github.com/Bastian2704/trackstudio-demo (PÚBLICO)
**Ruta local:** `/home/shared/Projects/trackstudio-demo`
**Máquina de desarrollo:** CachyOS (Arch-based)

---

## 1. Resumen ejecutivo

El backend quedó **scaffoldeado, contenerizado y reproducible** sobre la Alternativa 2 del stack. La cadena de calidad está casi cerrada: Pest y Larastan operativos y en verde; **falta solo configurar y probar Pint** para cerrar el bloque de herramientas. Después de eso empieza el primer trabajo con peso real del Sprint 1: el manejador de excepciones con el formato de error de D3.1 y su primer test (evidencia de RNF-01).

Aún **no se ha tocado Auth0, S3, ni ninguna migración de negocio.** Eso es intencional y correcto según el plan del Sprint 1.

---

## 2. Estado de la cadena de calidad

| Herramienta              | Estado   | Notas                                                         |
| ------------------------ | -------- | ------------------------------------------------------------- |
| Laravel + Sail (Docker)  | ✅ Listo | PHP 8.4 fijo en el contenedor, Postgres en el mismo compose   |
| Pest (runner de pruebas) | ✅ Listo | Suite de ejemplo en verde (2 passed)                          |
| Larastan / PHPStan       | ✅ Listo | Nivel 5, `[OK] No errors` sobre el esqueleto                  |
| Pint (formateo)          | ✅ Listo | Ya instalado; pint --test probado y config de pint.json hecha |

---

## 3. Stack confirmado con versiones exactas (para D2.1)

**Estas versiones ya están instaladas y verificadas. Actualizar la tabla de versiones de la tesis (D2.1) con ellas.**

| Componente                             | Versión              | Dónde corre                                   |
| -------------------------------------- | -------------------- | --------------------------------------------- |
| PHP (contenedor)                       | **8.4.24**           | Runtime real del backend                      |
| PHP (host CachyOS (Maquina de adrián)) | 8.5.9                | Solo conveniencia local; NO es el runtime     |
| Laravel Framework                      | **13.29.0**          | (esqueleto `laravel/laravel` 13.10.1)         |
| PostgreSQL                             | **18-alpine**        | Contenedor Sail                               |
| Laravel Sail                           | 1.67.0               | Entorno Docker de desarrollo                  |
| Composer                               | 2.10.3               | —                                             |
| Pest                                   | **5.1.3**            | + `pest-plugin-laravel` 5.0.1                 |
| PHPUnit                                | **13.3.1**           | Transitivo (lo exige Pest 5)                  |
| Larastan                               | 3.10                 | + PHPStan 2.x                                 |
| Pint                                   | 1.30.5               | Vino con el esqueleto                         |
| Auth0 Laravel SDK                      | `auth0/login` **^7** | ⚠️ PENDIENTE de instalar (Sprint 1, HU-03/04) |

---

## 4. Decisiones tomadas en esta sesión

1. **Backend contenerizado con Docker/Sail**, no instalación nativa. Razón: reproducibilidad entre los dos devs + CI, e inmunidad a la deriva de Arch rolling. Sail es oficial y documentable en la tesis.
2. **PHP 8.4 fijo en el contenedor**, aunque el host tenga 8.5. Razón: paridad con Railway (producción corre 8.4) y con la matriz probada de Auth0. El host se queda en 8.5; no vale la pena pelear contra Arch para bajarlo.
3. **Pin de plataforma** en `composer.json`: `config.platform.php = "8.4.24"`. Fija la resolución de Composer a la versión real del contenedor. **OJO (trampa):** cuando el contenedor suba de parche (p. ej. 8.4.25 en un rebuild), hay que actualizar este número al mismo valor, o Composer volverá a fallar la resolución.
4. **Postgres en el mismo `compose.yaml`** de Sail (servicio `pgsql`), no instancia nativa.
5. **Larastan en nivel 5** (intermedio), no el máximo. Subir a 6 es un cambio de una línea si se quiere más adelante.
6. **Pest 5 reemplaza a PHPUnit** como runner (decisión técnica previa del proyecto), lo que forzó subir PHPUnit de 12 → 13.

---

## 5. Cómo retomar el entorno en otra sesión / otra máquina

**Prerrequisitos en la máquina (una sola vez):** Docker funcionando sin `sudo`. En Arch/CachyOS:

```bash
sudo pacman -S docker docker-compose docker-buildx
sudo systemctl enable --now docker.service
sudo usermod -aG docker $USER   # luego cerrar sesión y volver a entrar
docker run --rm hello-world     # verificar
```

**Levantar el backend (ya scaffoldeado, tras clonar el repo):**

```bash
cd trackstudio-demo/backend
cp .env.example .env             # si no existe .env local (NUNCA commitear .env)
./vendor/bin/sail up -d          # primera vez construye la imagen 8.4 (~8 min)
./vendor/bin/sail composer install
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
```

**Verificar que todo está sano:**

```bash
./vendor/bin/sail php -v                              # PHP 8.4.24
./vendor/bin/sail pest                                # suite en verde
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G   # [OK] No errors
```

---

## 6. Cheat sheet de comandos (todo corre DENTRO del contenedor)

```bash
./vendor/bin/sail up -d          # levantar
./vendor/bin/sail down           # bajar
./vendor/bin/sail pest           # correr pruebas
./vendor/bin/sail pest --version # versión de Pest
./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G   # análisis estático
./vendor/bin/sail pint --test    # verificar formato (no modifica)
./vendor/bin/sail pint           # arreglar formato
./vendor/bin/sail artisan ...    # comandos artisan
./vendor/bin/sail composer ...   # composer
```

> El binario `pest`/`phpstan`/`pint` NO existe en el host (CachyOS/fish dará "Unknown command"). Siempre con `sail` delante. Recomendado: crear un alias/función `sail` en `~/.config/fish/`.

---

## 7. Siguiente paso: El manejador de errores D3.1 (primer trabajo con peso real)

Este es el arranque de la evidencia auditable de RNF-01 para la Sprint Review. **Antes de escribir código**, hay que cerrar dos decisiones ABIERTAS del ADR, porque el manejador de excepciones no se puede dar por "hecho" sin ellas (la DoR exige dependencias en estado DECIDIDO):

- **D3.7 — origen del `trace_id`** (frontend `X-Trace-Id` vs solo backend). Recomendación pendiente de aprobar: generarlo en backend como ULID por request (default que no bloquea nada).
- **D3.6 — nivel de RFC 9457** (completo con `type`/`instance` vs pragmático). Recomendación pendiente: arrancar pragmático (sin `type`, porque su URL apunta al dominio aún no comprado) y añadir `type`/`instance` cuando exista el dominio.

Una vez cerradas: construir el manejador centralizado con el formato y catálogo de códigos de D3.1, y su primer test Pest (validando la **forma del JSON de error**, no solo el status code).

---

## 8. Hallazgos de backend para aplicar al construir Auth (HU-03/HU-04)

Detectados en la revisión de esta sesión; tenerlos a mano cuando se instale `auth0/login`:

1. **Corrección a la tesis:** la restricción decía "Auth0 SDK v4.x para Laravel". El paquete real es `auth0/login` en **v7.x** (namespace `Auth0\Laravel`). Corregir en el documento. Instalar con `composer require auth0/login:^7` (NO usar la beta de la v8).
2. **Usar el guard token-based / stateless del SDK, NO el flujo de sesión.** El quickstart oficial documenta por defecto el flujo web con sesión — es el patrón equivocado para su arquitectura SPA + API.
3. **No escribir a mano la validación del JWT** (firma, JWKS, `iss`, `aud`, expiración). El SDK lo hace. Solo se escribe la lectura del claim de rol namespaced.
4. **Sobreescribir el `unauthenticated()` de Laravel** para que el 401 emita el cuerpo `UNAUTHENTICATED` de D3.1 (el 401 por defecto del SDK no tiene esa forma).
5. **Resolver la fuente de verdad del rol:** claim namespaced (recomendado) vs. permisos nativos de Auth0 RBAC vs. columna `users.role`. Decidir uno y documentarlo. El claim debería ser autoritativo para autorización; la columna, si se conserva, solo para display.
6. **Provisión del usuario local (JIT):** definir cómo el endpoint de humo resuelve un `users` local desde el `sub` del token cuando aún no hay flujo de registro (Sprint 1). Opciones: crear-si-no-existe, o seed de usuarios de prueba.
7. **`auth0_sub` debe ser único e indexado** (omisión en D6.7). Es la clave de búsqueda por request.
8. **Centralizar el namespace del claim en UNA sola clave de config** (`config('auth0.roles_claim')` desde `.env`), porque depende del dominio aún no comprado y debe ser idéntico en la Action de Auth0, el middleware y el frontend.

---

## 9. Bloqueos y pendientes globales a recordar

- **Bloque 7 del ADR (subida de audio a S3) sigue ABIERTO.** Mientras siga así, el ERD no se puede cerrar y **ninguna historia de audio (HU-13 a HU-16) es "Ready".**
- **Dominio aún no comprado** (`trackstudio` + TLD más barato). De él dependen: el namespace del claim de roles de Auth0 (D4.8) y la verificación DNS de Resend. NO fijar esos valores todavía.
- **Repo público:** disciplina innegociable. `.env` está correctamente ignorado (verificado con `git check-ignore backend/.env`). Nunca commitear secretos ni datos reales del cliente; revisar cada PR antes de mergear.
- **Git Flow:** el plan CI/CD es `feature/* → develop (staging) → main (prod)`. Ahora mismo el trabajo está en `main`. **Pendiente: crear la rama `develop` y confirmar/hacer el primer commit del backend** (`chore(backend): scaffold Laravel 13 + Sail`).
- **ClickUp:** poblar las 28 historias (parte de HU-01) y confirmar fecha de inicio del sprint.

---

## 11. Gotchas del entorno (CachyOS / Arch / fish) (Esto es solo en maquina de Adrián)

- **Extensiones PHP no se auto-habilitan** en Arch: hay que descomentarlas manualmente en `/etc/php/php.ini`. (Ya resuelto para el host; el contenedor las trae listas.)
- **Avisos `dubious ownership in repository at '/opt'`** durante el scaffold: son **inofensivos**, ocurrieron dentro del contenedor. NO correr el `git config --global --add safe.directory /opt` que sugiere (esa ruta no existe en el host). De hecho evitaron un `.git` anidado en `backend/` — que es lo que queríamos en el monorepo.
- **Heredoc (`<<'EOF'`) falla en fish con oh-my-posh.** Usar el editor o `printf` para crear archivos de config.
- **Pin de plataforma vs. parche de PHP:** ver punto 4.3 arriba — actualizar `platform.php` cuando el contenedor suba de parche.
