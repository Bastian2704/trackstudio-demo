# Runbook — Mantenimiento programado y monitoreo de uptime

> **Dueño de la decisión:** D9.3 (UptimeRobot, plan gratuito, intervalo de 5 min). **Tarea:** TS-44 · **Spec:** `docs/specs/backend/HU-02.md`.
> **Alcance:** cómo avisar de una ventana de mantenimiento, cómo pausar y reactivar los monitores, y cómo registrar la disponibilidad para RNF-04.
> **Fuera del alcance de este runbook:** rollback (9.4, ABIERTO), migraciones en deploy (9.2, ABIERTO), rate limiting (8.5, ABIERTO) y aviso automático por Resend (planificado para S5 mediante TS-43).

---

## 1. Estado actual del monitoreo

| Monitor (UptimeRobot)                | Tipo                                             | URL                                                             | Intervalo |
| ------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------- | --------- |
| `Track Studio – API staging`         | Keyword `"status":"ok"`, alerta si **no existe** | `https://trackstudio-demo-staging.up.railway.app/api/v1/health` | 5 min     |
| `Track Studio – Frontend staging`    | HTTP(s)                                          | `https://trackstudio-staging.vercel.app`                        | 5 min     |
| `Track Studio – API producción`      | Keyword (igual que staging)                      | _pendiente: producción aún no existe_                           | 5 min     |
| `Track Studio – Frontend producción` | HTTP(s)                                          | _pendiente: producción aún no existe_                           | 5 min     |

- **Cuenta:** `trackstudioec@outlook.com`, plan Free. Las credenciales están en el gestor de contraseñas del equipo, nunca en el repo.
- **Alertas:** el plan Free solo permite **un contacto de alerta**, el correo de la cuenta. Las alertas llegan únicamente al buzón del equipo, y **los dos integrantes lo revisan**. El productor no recibe alertas técnicas. Hay una mejora opcional pendiente: una regla de reenvío en Outlook (`De` contiene `uptimerobot.com` → correo personal).
- **Railway:** el Healthcheck Path es `/api/v1/health` y Serverless (suspensión por inactividad) está **desactivado**. En staging se verificó el 2026-09-28.
- **SSL:** no hay monitor de vencimiento (es de pago). Vercel y Railway renuevan los certificados solos, y un certificado inválido haría fallar igualmente el monitor HTTP(s). Para comprobarlo a mano:
    ```fish
    echo | openssl s_client -servername <host> -connect <host>:443 2>/dev/null | openssl x509 -noout -enddate
    ```
- **Status page pública:** no se creó porque no la exige el criterio de aceptación de TS-44. Se creará si hace falta.
- **Si UptimeRobot suspende la cuenta** (riesgo de Términos de Servicio aceptado en D9.3): el plan B es un workflow de GitHub Actions con `schedule: cron` que consulte `/api/v1/health`.

---

## 2. Ventana de mantenimiento programado

### 2.1 Aviso al productor (≥ 24 h antes)

Un integrante manda un **correo manual** desde `trackstudioec@outlook.com` al productor **con al menos 24 horas de anticipación**. No se usa Resend.

Plantilla:

> **Asunto:** Track Studio — mantenimiento programado el <fecha> de <hora inicio> a <hora fin> (hora de Ecuador)
>
> Hola,
>
> Te avisamos de que el <fecha>, entre las <hora inicio> y las <hora fin> (hora de Ecuador, UTC-5), Track Studio no estará disponible por mantenimiento programado.
>
> **Motivo:** <breve, sin detalles técnicos sensibles>.
> **Impacto:** durante la ventana no se podrá acceder a la plataforma. No se pierde ningún dato.
>
> Te escribiremos al terminar. Si la fecha no te conviene, respóndenos antes del <fecha límite>.
>
> Equipo Track Studio

### 2.2 Al empezar la ventana

1. En UptimeRobot, **pausa solo los monitores de producción** (`Track Studio – API producción` y `Track Studio – Frontend producción`) con **Pause**. Los de staging no se tocan.
2. Anota la ventana en el registro (§2.4) con la hora real de pausa.

Pausar los monitores evita alertas falsas. Además, el tiempo que un monitor está en pausa **no cuenta como caída** en el % de uptime. Por eso cada pausa tiene que quedar registrada: así el % se puede justificar en la Sprint Review.

### 2.3 Al cerrar la ventana

1. Comprueba desde fuera que la API responde:
    ```fish
    curl -i https://<backend-prod>/api/v1/health
    ```
    Tiene que devolver `HTTP 200` y un cuerpo con `"status":"ok"` y `"database":true`. Si devuelve `503` / `"degraded"`, **no reactives todavía**: la base de datos no responde.
2. Comprueba el frontend: `curl -sS -o /dev/null -w "%{http_code}\n" https://<frontend-prod>` tiene que dar `200`.
3. En UptimeRobot, **reactiva** los dos monitores de producción con **Resume**.
4. Espera un ciclo (≤ 5 min) y comprueba que los dos están **Up** (verde).
5. Completa el registro (§2.4) con la hora de reactivación y el resultado.
6. Avisa al productor por correo de que el servicio está restablecido.

### 2.4 Registro de ventanas de mantenimiento

| Fecha | Aviso enviado (fecha/hora) | Pausa (hora) | Reactivación (hora) | Motivo | Monitores en verde tras reactivar | Responsable |
| ----- | -------------------------- | ------------ | ------------------- | ------ | --------------------------------- | ----------- |
| —     | —                          | —            | —                   | —      | —                                 | —           |

---

## 3. Registro de disponibilidad (RNF-04)

> _Pendiente: fijar la periodicidad (mensual o por sprint) contrastando con el texto real de RNF-04 de la tesis. Registrar la decisión en `TS-53`._
