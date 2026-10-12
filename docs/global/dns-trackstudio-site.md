# DNS — trackstudio.site

> **Tareas:** TS-41 (`ts-30`, Resend y este documento, cerrada el 2026-10-08) · TS-63 (DNS de producción) · **Decisiones:** D4.8 (namespace del claim), 10.1 (Resend), D8.3 (CORS) · **Proveedor DNS:** Namecheap (Domain List → Manage → Advanced DNS).
> **Alcance:** registros de **producción** (frontend, API) y de verificación de Resend.
> **Fuera del alcance:** staging. Se queda en las URLs de los proveedores (`https://trackstudio-staging.vercel.app`, `https://trackstudio-demo-staging.up.railway.app`) y no tiene subdominio propio.
> **Regla:** aquí solo van nombres, tipos y destinos públicos. Nada de API keys, contraseñas ni tokens (repo público, D2.2).

---

## 1. Registros

Estado: `definido` (acordado, sin crear) → `configurado` (creado en Namecheap) → `verificado` (resuelve desde una red externa y, si aplica, con TLS válido o "Verified" en el panel del proveedor).

Los registros de frontend y API dependen de que existan los proyectos de producción en Vercel y Railway (**TS-63**, que bloquea a TS-44). Hasta entonces se quedan en `definido`. Los de Resend ya están verificados (TS-41).

| Host (campo Host en Namecheap) | FQDN                                 | Tipo  | Destino                                                                   | Servicio                  | Estado   |
| ------------------------------ | ------------------------------------ | ----- | ------------------------------------------------------------------------- | ------------------------- | -------- |
| `@`                            | `trackstudio.site`                   | A     | _el que indique Vercel_ (normalmente `76.76.21.21`)                        | Frontend producción       | definido |
| `www`                          | `www.trackstudio.site`               | CNAME | _el que indique Vercel_ (normalmente `cname.vercel-dns.com.`)              | Redirección a la raíz     | definido |
| `api`                          | `api.trackstudio.site`               | CNAME | _el target que indique Railway al añadir el custom domain_                | API producción            | definido |
| `resend._domainkey`            | `resend._domainkey.trackstudio.site` | TXT   | Clave pública DKIM (`p=MIGfMA0…`), copiada del panel de Resend            | Resend (DKIM)             | verificado (2026-10-08) |
| `send`                         | `send.trackstudio.site`              | CNAME | `send.forge.rmta.net.` (de ahí salen el MX `10 feedback.forge.rmta.net.` y el SPF) | Resend (rebotes y SPF)    | verificado (2026-10-08) |
| `_dmarc`                       | `_dmarc.trackstudio.site`            | TXT   | `v=DMARC1; p=none;`                                                       | DMARC                     | verificado (2026-10-08) |

En Vercel, `www` se configura como redirección a `trackstudio.site`, que es la URL canónica.

## 2. Notas de Namecheap

- En **Host** se escribe solo el subdominio (`api`, no `api.trackstudio.site`). La raíz se escribe como `@`.
- **TTL:** Automatic.
- La raíz no admite CNAME: lleva el **A record** que indique Vercel.
- Hay que **borrar los registros de parking** que Namecheap crea por defecto (`CNAME www → parkingpage.namecheap.com`, `URL Redirect @`) antes de crear `@` y `www`. Si no, chocan.
- **`send` es un CNAME**, no un MX y un TXT creados a mano: Resend publica el MX y el SPF detrás de `send.forge.rmta.net`. No hay que tocar *Mail Settings → Custom MX* de Namecheap.

## 3. Identificadores que no dependen del DNS

Usan el dominio, pero son identificadores, no URLs que se visiten. Funcionan aunque el host no resuelva:

- Namespace del claim de roles (D4.8): `https://trackstudio.site/roles`.
- Audience del API en Auth0 (`https://api.trackstudio.site…`, el valor exacto está en el tenant).
- `type` de los errores RFC 9457 (D3.1): `https://trackstudio.site/errors/{code}`.

## 4. Cambios encadenados al activar cada host

Se aplican en cuanto el host esté `verificado` (HANDOFF v5 §45, D8.3 "Revisar"). Staging no se toca.

**Al activar `trackstudio.site` (frontend):**
- [ ] Auth0 (aplicación SPA de producción): poner `https://trackstudio.site` en Allowed Callback URLs, Allowed Logout URLs y Allowed Web Origins.
- [ ] Railway (servicio de producción): `CORS_ALLOWED_ORIGINS` incluye `https://trackstudio.site`.
- [ ] UptimeRobot: crear el monitor `Frontend producción` y rellenar su fila en `runbook-mantenimiento.md` §1 (TS-44).

**Al activar `api.trackstudio.site`:**
- [ ] Vercel (entorno Production): `VITE_API_BASE_URL` = `https://api.trackstudio.site`, y redesplegar.
- [ ] UptimeRobot: crear el monitor `API producción` (`/api/v1/health`) y rellenar su fila en `runbook-mantenimiento.md` §1 (TS-44).

**Al verificar el dominio en Resend:**
- [x] Marcar 10.1 en el ADR. TS-43 ya está en Listo (2026-10-08).

## 5. Verificación (ts-30.03 y TS-63)

Siempre contra un DNS público, no el del router. Repetir desde dnschecker.org o con los datos del móvil.

```fish
dig +short trackstudio.site @1.1.1.1
dig +short www.trackstudio.site @1.1.1.1
dig +short api.trackstudio.site @1.1.1.1
dig +short TXT resend._domainkey.trackstudio.site @1.1.1.1
dig +short CNAME send.trackstudio.site @1.1.1.1
dig +short MX send.trackstudio.site @1.1.1.1
dig +short TXT send.trackstudio.site @1.1.1.1
dig +short TXT _dmarc.trackstudio.site @1.1.1.1

curl -sI https://trackstudio.site | head -1
curl -sI https://www.trackstudio.site | grep -iE "^HTTP|^location"
curl -s  https://api.trackstudio.site/api/v1/health
echo | openssl s_client -servername api.trackstudio.site -connect api.trackstudio.site:443 2>/dev/null | openssl x509 -noout -subject -issuer -enddate
```

Para que un registro pase a `verificado`:
- `dig` devuelve el destino de la tabla.
- La raíz da `200`, `www` redirige (`308`/`301`) a `https://trackstudio.site` y el health devuelve `"status":"ok"`.
- El certificado vale para ese host.
- En los paneles, Vercel y Railway muestran el dominio como válido y Resend lo muestra como *Verified*.

La evidencia (salidas y capturas sin claves) va como comentario en TS-41.
