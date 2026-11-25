# Handoff v51 — Track Studio

**Fecha:** 2026-11-25 · **Sprint:** 5 · **Capa(s):** global (infraestructura)
**Foco de la sesión:** configurar producción (`TS-44`) y su DNS (`TS-63`), guiando al equipo paso a paso.

## 1. Resumen ejecutivo

Producción quedó configurada en Railway, Vercel, Auth0, S3 y DNS. El equipo hizo todos los cambios en los paneles y el agente no tocó infraestructura (regla 6). `main` sigue en el esqueleto del Sprint 0, así que todavía no hay health en verde. Por decisión del equipo, eso se valida en HU-27, y los monitores de UptimeRobot se separaron en `TS-98` (S6). `TS-44` y `TS-63` pueden cerrarse.

## 2. Qué se hizo

- **Railway:** entorno `production` del mismo proyecto, rama `main`, Postgres propio (`DB_*` por referencia), `APP_KEY` nueva, `APP_ENV=production`, `APP_DEBUG=false`, Healthcheck `/api/v1/health` y Serverless apagado. `APP_URL=https://api.trackstudio.site`, `FRONTEND_URL=https://trackstudio.site`, `CORS_ALLOWED_ORIGINS=https://trackstudio.site,https://trackstudiodemofront.vercel.app`. Dominio generado: `trackstudio-demo-prod.up.railway.app`.
- **Vercel:** el mismo proyecto. *Production* sale de `main` (`https://trackstudiodemofront.vercel.app`) y staging es el dominio de la rama `develop`. `VITE_AUTH0_CLIENT_ID` y `VITE_API_BASE_URL` están separadas por entorno; `VITE_API_BASE_URL` de Production = `https://api.trackstudio.site`. No se redesplegó.
- **Auth0:** SPA `Track Studio (producción)` en el mismo tenant, con Client ID `ttGZ5rKC1yj0iEu16Ah7m3iO7ZA3ZaLg` (público). Tiene la misma conexión, la API autorizada en *user delegated access* con 0/2 permisos, rotación de refresh tokens, y callbacks, logout y web origins en `https://trackstudio.site` y la URL de Vercel.
- **S3:** el CORS del bucket compartido suma `https://trackstudio.site` y `https://trackstudiodemofront.vercel.app` (siguen solo `POST` y `GET`).
- **DNS (`TS-63`):** se crearon `@` A `216.198.79.1`, `www` CNAME de Vercel, `api` CNAME `u9avl1at.up.railway.app.` y el TXT `_railway-verify.api`. Se comprobaron con `dig @1.1.1.1`; la raíz da `200`, `www` da `308 → https://trackstudio.site/` y `api` tiene su propio certificado. El DKIM de Resend sigue intacto.
- **Criterio «merge a `main` con aprobación manual»:** ya lo cumplía el ruleset `protect-main` (1 aprobación más los checks `lint`, `static-analysis`, `test` y `build`; sin push directo ni borrado).
- **Jira:** se creó `TS-98` (Tarea, padre `TS-1`, `TS Sprint 6`), bloqueada por `TS-38` y relacionada con `TS-44`.
- **Docs:** `dns-trackstudio-site.md` (destinos reales, estados, `rsend`, casillas del §4), `runbook-mantenimiento.md` §1, ADR (fila 9.5 y D9.5) y `jira-key-map.md`.

## 3. Decisiones tomadas en esta sesión

Todas son decisiones del equipo y están registradas en el ADR **D9.5**:
- **Mismo tenant de Auth0** con una SPA nueva, frente a un tenant aparte. Se reutilizan la API, los roles y la Action del claim.
- **Mismo bucket S3** para staging y producción. Riesgo aceptado: los datos de prueba conviven con los reales (las keys son UUID, D7.3).
- **Configurar ahora y validar en HU-27.** Se descartaron un smoke temporal con `develop` y adelantar el merge a `main`.
- **UptimeRobot en pausa** hasta HU-27, para no recibir alertas: se movió a `TS-98`.

## 4. Trampas y hallazgos

- **Vercel cambió sus destinos DNS:** ahora da `216.198.79.1` y un CNAME por proyecto (`…vercel-dns-017.com.`), no `76.76.21.21` / `cname.vercel-dns.com.`. Manda siempre el panel.
- **Vercel deja `www` como dominio principal** y redirige la raíz hacia él. Hubo que invertirlo: la raíz conectada a Production y `www` con 308 a la raíz.
- **El certificado de Railway tarda más que el DNS.** Durante unos minutos sirve `CN=*.up.railway.app`; no hay que tocar nada.
- **Railway → Generate Domain pide un puerto:** el mismo que staging.
- **Con un solo proyecto de Vercel**, las variables marcadas para «Production and Preview» se heredan entre entornos. Solo hubo que partir las que cambian de valor.

## 5. Drift detectado

- `dns-trackstudio-site.md` no listaba el CNAME `rsend → rsend-sae1.forge.rmta.net.` de Resend. Ya está añadido.
- La SPA de staging tiene autorizada `Auth0 Management API` con todos los permisos. El frontend no la usa: es superficie de ataque innecesaria. Hay que quitarla en una tarea aparte (el equipo, regla 6). No se tocó.

## 6. Bloqueos y pendientes

- `TS-98` depende del primer merge `develop → main` (HU-27, `TS-38`).
- `TS-63` y `TS-44` siguen en Jira como *Por hacer* / *En curso*: el equipo los mueve a Listo con la evidencia (capturas de variables con los valores ocultos, salidas de `dig`/`curl` y el ruleset).
- En el primer build de `main` hay que comprobar que la app de producción usa el Client ID y el API correctos (las `VITE_*` se hornean en ese build).

## 7. Próximos pasos

1. El equipo commitea esta rama (`chore/TS-44-configurar-produccion`) y abre un PR a `develop`.
2. Comentario de evidencia en `TS-44` y `TS-63`, y mover ambas a Listo.
3. En HU-27, el health de producción y después `TS-98`.

## 8. Cómo retomar el entorno

No cambió el setup local. Las URLs de producción están en `docs/global/dns-trackstudio-site.md` §1 y en el ADR, D9.5.
