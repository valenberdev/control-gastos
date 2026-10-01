# Despliegue

Guía para desplegar cada pieza de Control de Gastos y comprobar que quedó en vivo. Todas las variables aparecen solo por nombre: los valores van en los paneles de cada servicio, nunca en el repositorio.

La infraestructura de la demo es toda de planes gratuitos (Vercel Hobby, Render gratuito, Supabase gratuito). Lo que depende de esos planes está indicado en cada sección.

## 1. Mapa de servicios y orden

| Pieza           | Dónde corre                   | Qué se despliega                       |
| --------------- | ----------------------------- | -------------------------------------- |
| Base de datos   | Supabase (PostgreSQL)         | `db/init.sql` aplicado a mano          |
| API             | Render (servicio web, Docker) | `apps/api`, imagen `Dockerfile.prod`   |
| Bot de Telegram | Render (servicio web, Docker) | `apps/bot`, imagen `Dockerfile.prod`   |
| Frontend (PWA)  | Vercel                        | `apps/web`                             |
| Mails           | Resend (API HTTPS)            | Solo una API key, no se despliega nada |

Orden recomendado:

1. Supabase: crear el proyecto y aplicar el esquema.
2. Resend: crear la API key (opcional, solo para la recuperación de contraseña).
3. API en Render. `FRONTEND_URL` todavía no existe: se carga un valor provisorio y se corrige en el paso 5.
4. Bot en Render.
5. Frontend en Vercel con la URL de la API. Después, volver a la API y poner la URL real en `FRONTEND_URL`.
6. Comprobar con la sección [Verificar un despliegue](#8-verificar-que-un-despliegue-quedó-en-vivo).

Las dos imágenes de producción (`apps/api/Dockerfile.prod` y `apps/bot/Dockerfile.prod`) son multi-stage: una etapa compila TypeScript y la imagen final solo lleva las dependencias de producción y `dist/`. El workflow de CI construye ambas en cada cambio (sin publicarlas), así que un Dockerfile roto se detecta antes de desplegar.

## 2. Variables de entorno por servicio

Los archivos `.env.example` (raíz y `apps/web`) listan todas con un comentario. Resumen para producción:

### API (Render)

| Variable                                | Obligatoria      | Para qué sirve                                                                                                                                           |
| --------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Sí               | Cadena de conexión a Postgres (Session pooler de Supabase)                                                                                               |
| `DATABASE_SSL`                          | Con Supabase     | `true` activa TLS hacia la base                                                                                                                          |
| `DATABASE_CA_CERT`                      | No               | Certificado raíz en PEM, con los saltos de línea como `\n`. Si se define, se verifica el servidor; si falta, la conexión va cifrada pero sin verificarlo |
| `JWT_SECRET`                            | Sí               | Firma de los tokens de sesión                                                                                                                            |
| `INTERNAL_API_KEY`                      | Sí               | Clave que el bot manda en `x-internal-key`. Tiene que ser idéntica en el bot                                                                             |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Sí               | Claves de las notificaciones push. Sin ellas la API no arranca                                                                                           |
| `VAPID_SUBJECT`                         | No               | Contacto VAPID (`https:` o `mailto:`). Si falta se usa `FRONTEND_URL` cuando es https                                                                    |
| `FRONTEND_URL`                          | Sí en producción | Origen que acepta CORS y base de los links de recuperación. Sin barra final (la API la quita)                                                            |
| `TRUST_PROXY_HOPS`                      | Sí en Render     | Cantidad de proxies delante de la API; ver [más abajo](#trust_proxy_hops)                                                                                |
| `RESEND_API_KEY`                        | Para mails       | Sin ella, en producción no se envía ningún mail y se registra un error en el log                                                                         |
| `EMAIL_FROM`                            | No               | Remitente. Por defecto `Control de Gastos <onboarding@resend.dev>`                                                                                       |
| `NODE_ENV`                              | Recomendada      | Con `production` los límites de intentos no se pueden desactivar y el link de recuperación nunca se imprime en el log                                    |
| `APP_TIMEZONE`                          | No               | Zona horaria por defecto de las cuentas nuevas (por defecto `America/Argentina/Buenos_Aires`)                                                            |
| `PORT`                                  | No               | Render la define (10000 por defecto); fuera de Render, 3000                                                                                              |
| `RENDER_GIT_COMMIT`                     | —                | La define Render. `/health` la informa como `commit`                                                                                                     |

### Bot (Render)

| Variable                      | Obligatoria   | Para qué sirve                                                                          |
| ----------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`          | Sí            | Token del bot de producción (otro distinto del de desarrollo)                           |
| `INTERNAL_API_KEY`            | Sí            | La misma que la API                                                                     |
| `API_URL`                     | Sí            | URL pública de la API. Por defecto `http://api:3000`, que solo sirve con docker compose |
| `BOT_MODE`                    | Sí            | `webhook` en producción. Por defecto `polling`                                          |
| `WEBHOOK_SECRET`              | Sí en webhook | Secreto con el que Telegram firma cada llamada                                          |
| `WEBHOOK_URL`                 | No            | URL completa del webhook. Si falta se arma con `RENDER_EXTERNAL_URL` + `/webhook`       |
| `RENDER_EXTERNAL_URL`, `PORT` | —             | Las define Render                                                                       |

### Frontend (Vercel)

| Variable                | Obligatoria | Para qué sirve                                              |
| ----------------------- | ----------- | ----------------------------------------------------------- |
| `VITE_API_URL`          | Sí          | URL pública de la API (por defecto `http://localhost:3000`) |
| `VITE_VAPID_PUBLIC_KEY` | Para push   | La misma clave pública VAPID que usa la API                 |

Vite incrusta estas variables al compilar: si se cambian, hay que volver a desplegar.

Para generar los secretos:

```bash
# JWT_SECRET, INTERNAL_API_KEY, WEBHOOK_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Par VAPID (desde apps/api, después de `npm ci`)
npx web-push generate-vapid-keys
```

## 3. Supabase (base de datos)

1. Crear un proyecto en Supabase y guardar la contraseña de la base. Al crearlo conviene desactivar la Data API automática (la aplicación no usa `supabase-js`): así la única puerta a los datos es la API propia, con su autenticación y sus límites.
2. En el botón **Connect** del proyecto, copiar la cadena **Session pooler** y completar la contraseña. Esa cadena es el valor de `DATABASE_URL` en la API.
   - Se usa el Session pooler y no la conexión directa porque la conexión directa de Supabase es solo IPv6 y Render no soporta IPv6 saliente.
3. En la API definir `DATABASE_SSL=true`. La API abre el pool con `connectionTimeoutMillis` de 10 segundos.
4. Opcional: descargar el certificado raíz del proyecto (en la configuración de la base, sección de SSL; el nombre exacto del botón puede variar) y cargarlo en `DATABASE_CA_CERT` para que la API verifique el servidor.

### Aplicar el esquema

No hay herramienta de migraciones: los scripts SQL se aplican a mano y en orden.

- **Base nueva (caso normal):** ejecutar `db/init.sql` completo, una sola vez. Crea todas las tablas y las seis categorías iniciales. Ya incluye lo que hace la migración 001, así que no hay que correrla.
- **Base creada antes de la migración 001:** ejecutar `db/migrations/001_recuperacion_de_contrasena.sql`. Pasa los emails a minúsculas, agrega el `CHECK` correspondiente y crea la tabla `password_resets`. Corre en una transacción; si dos emails existentes solo difieren en mayúsculas, el `UNIQUE` falla y no se aplica nada.

`init.sql` no es idempotente (usa `CREATE TABLE` sin `IF NOT EXISTS`): correrlo dos veces sobre la misma base falla.

Dos formas de ejecutarlo:

```bash
# Con psql, usando la cadena del Session pooler
psql "$DATABASE_URL" -f db/init.sql
```

o pegando el contenido del archivo en el **SQL Editor** del panel de Supabase.

Los tests nunca se deben apuntar a esta base: preparan el esquema con `DROP SCHEMA public CASCADE`. Por eso solo aceptan bases cuyo nombre termina en `_test`.

## 4. API en Render

Crear un **Web Service** conectado al repositorio con esta configuración:

| Campo             | Valor                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| Runtime           | Docker                                                                                  |
| Root Directory    | `apps/api`                                                                              |
| Dockerfile Path   | `./Dockerfile.prod`                                                                     |
| Health Check Path | `/health`                                                                               |
| Puerto            | Lo define Render (10000 por defecto) y la API lo lee de `PORT`; no hay que configurarlo |

Es el mismo contexto y archivo que construye el job `docker` del CI (`./apps/api` con `Dockerfile.prod`). Cargar las variables de la tabla de la API, con `NODE_ENV=production`.

### `TRUST_PROXY_HOPS`

La API está detrás del proxy de Render. Con `TRUST_PROXY_HOPS` sin definir, Express toma como IP del cliente la del proxy y todos los usuarios comparten el mismo cupo en los límites de intentos. El valor correcto es la cantidad de proxies que hay delante de la API y se midió de forma empírica en Render: se agregó temporalmente una ruta, protegida con la clave interna, que devolvía `req.ip`, el encabezado `X-Forwarded-For` y la dirección del socket (commits `5f71488` y `eaf573c`; la ruta ya se eliminó), y se ajustó el valor hasta que `req.ip` coincidiera con la IP real del cliente. Si cambia la infraestructura (otro proveedor, un CDN delante), hay que volver a medirlo.

En Render el valor medido fue `3` (octubre de 2026): `X-Forwarded-For` traía la IP del cliente seguida de otras dos de la infraestructura de Render.

### Plan gratuito de Render

El servicio se duerme tras 15 minutos sin tráfico y el primer pedido siguiente puede tardar cerca de un minuto. Además, Render gratuito bloquea el tráfico saliente a los puertos SMTP, por eso los mails salen por la API HTTPS de Resend y no por SMTP.

## 5. Bot en Render

Segundo **Web Service**, con la misma configuración pero apuntando a `apps/bot`:

| Campo             | Valor               |
| ----------------- | ------------------- |
| Runtime           | Docker              |
| Root Directory    | `apps/bot`          |
| Dockerfile Path   | `./Dockerfile.prod` |
| Health Check Path | `/health`           |

Variables: `TELEGRAM_BOT_TOKEN`, `INTERNAL_API_KEY` (igual a la de la API), `API_URL`, `BOT_MODE=webhook` y `WEBHOOK_SECRET`.

En modo webhook el bot abre un servidor HTTP con dos rutas (`POST /webhook` para Telegram y `GET /health`) y, al arrancar, registra el webhook en Telegram con `setWebhook`, usando `WEBHOOK_SECRET` como token secreto. Si el registro falla, el proceso termina con error en vez de quedar vivo sin recibir mensajes. La URL del webhook es `WEBHOOK_URL` o, si falta, `RENDER_EXTERNAL_URL` + `/webhook`.

Como el servicio gratuito se duerme, un mensaje puede llegar mientras el bot (o la API) arranca. Telegram reenvía las actualizaciones que no se confirman a tiempo. Por eso, cuando el procesamiento supera el tiempo límite de grammY (10 segundos por defecto), el bot igual responde a Telegram (`onTimeout: "return"`), y descarta los `update_id` que ya vio (guarda los últimos 500 en memoria).

## 6. Frontend en Vercel

1. Importar el repositorio en Vercel con **Root Directory** `apps/web` (Vercel detecta Vite: comando de build `vite build`, salida en `dist`).
2. Cargar `VITE_API_URL` (URL de la API) y `VITE_VAPID_PUBLIC_KEY`.
3. `apps/web/vercel.json` reescribe todas las rutas a `/index.html`. Sin esa regla, recargar `/historial` o abrir el link de recuperación de contraseña daría 404, porque son rutas del router del cliente.
4. Volver a la API y definir `FRONTEND_URL` con la URL que asignó Vercel, sin barra final. Si no coincide exactamente con el origen del navegador, las llamadas fallan por CORS.

La PWA se registra con un service worker propio (`apps/web/src/sw.ts`, vite-plugin-pwa con `injectManifest`) que precachea los archivos de la aplicación y atiende las notificaciones push. Las notificaciones push en iOS solo funcionan con la PWA instalada en la pantalla de inicio y servida por HTTPS.

## 7. Resend y el webhook de Telegram

### Resend

1. Crear una cuenta en Resend y una API key. Cargarla como `RESEND_API_KEY` en la API. Conviene usar una API key distinta en desarrollo y en producción, para poder revocar una sin afectar a la otra.
2. `EMAIL_FROM` es opcional. Sin ella, el remitente es `Control de Gastos <onboarding@resend.dev>`.

La cuenta está en modo de prueba: sin un dominio propio verificado, Resend solo entrega mails a la dirección de la propia cuenta. Hoy la recuperación de contraseña por email no le llega a cualquier persona. Para levantar la restricción hay que verificar un dominio en Resend y poner en `EMAIL_FROM` una dirección de ese dominio.

La API envía con `POST https://api.resend.com/emails` y un timeout de 10 segundos. Si Resend rechaza el pedido o falla la red, el error queda en el log y el usuario recibe de todos modos la misma respuesta genérica (así no se revela si el email existe).

### Bot y webhook de Telegram

1. En Telegram, hablar con `@BotFather` y crear el bot de producción (`/newbot`). Guardar el token como `TELEGRAM_BOT_TOKEN` en el servicio del bot. Para desarrollo local usar siempre otro bot con otro token: el modo polling de grammY borra el webhook del bot al arrancar, así que correrlo en local con el token de producción desconectaría el bot desplegado.
2. El bot registra el webhook solo al arrancar (ver sección 5). Para comprobarlo:

```bash
# TELEGRAM_BOT_TOKEN exportado en la terminal; no pegar el token en el comando
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

En la respuesta, `url` debe ser la del servicio del bot terminada en `/webhook`, y no debe haber `last_error_message`. `pending_update_count` en 0 indica que no quedan mensajes sin entregar.

## 8. Verificar que un despliegue quedó en vivo

```bash
# API: devuelve el estado y los primeros 7 caracteres del commit desplegado
curl https://<URL_DE_LA_API>/health
# {"status":"ok","commit":"abc1234"}

# Bot: solo informa el estado
curl https://<URL_DEL_BOT>/health
# {"status":"ok"}
```

- El campo `commit` de la API viene de `RENDER_GIT_COMMIT`. Para saber si lo desplegado es lo último, compararlo con el commit local: `git rev-parse --short=7 HEAD`. En desarrollo local `/health` devuelve `"commit":"local"`.
- Con el servicio dormido, el primer pedido puede tardar cerca de un minuto. Repetirlo hasta recibir la respuesta.
- Frontend: abrir la URL de Vercel, entrar a una ruta interna (por ejemplo `/historial`) y recargar; no debe dar 404. El manifest se sirve en `/manifest.webmanifest`.
- Flujo completo: registrar una cuenta, cargar un gasto y comprobar que aparece en el saldo; después generar un código en Perfil y vincularlo desde Telegram con `/vincular <código>`.

## 9. Problemas frecuentes

| Síntoma                                                          | Causa probable                                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La API no arranca y el log menciona una clave VAPID              | Faltan `VAPID_PUBLIC_KEY` o `VAPID_PRIVATE_KEY`, o el contacto VAPID es inválido (tiene que ser `https:` o `mailto:`)                                                                                                     |
| Errores de red o timeout al conectar con la base                 | Se usó la conexión directa de Supabase (IPv6) en lugar del Session pooler                                                                                                                                                 |
| El navegador bloquea las llamadas por CORS                       | `FRONTEND_URL` no coincide con el origen del frontend                                                                                                                                                                     |
| El navegador sigue mostrando un error de CORS que ya se corrigió | La consola de DevTools no se limpia al navegar dentro de una app de una sola página: recargar con Ctrl+Shift+R y limpiar la consola antes de repetir la prueba                                                            |
| Cambié una variable en Render y no tuvo efecto                   | Las variables se aplican con un despliegue nuevo: elegir la opción que despliega al guardar, o hacer un Manual Deploy. Revisar también que esté cargada en el servicio correcto: la API y el bot tienen paneles idénticos |
| Todos los usuarios reciben «Demasiados intentos»                 | `TRUST_PROXY_HOPS` sin definir detrás de Render: todos comparten una IP                                                                                                                                                   |
| El bot no puede vincular chats (401)                             | `INTERNAL_API_KEY` distinta entre la API y el bot                                                                                                                                                                         |
| El bot no responde                                               | El webhook no quedó registrado o `WEBHOOK_SECRET` cambió; revisar `getWebhookInfo` y el log del bot                                                                                                                       |
| El mail de recuperación no llega                                 | Resend en modo de prueba (solo entrega a la dirección de la cuenta), o falta `RESEND_API_KEY`                                                                                                                             |
| No se activan las notificaciones                                 | `VITE_VAPID_PUBLIC_KEY` distinta de la clave de la API, o en iOS la PWA no está instalada                                                                                                                                 |
| El primer pedido tarda                                           | El servicio gratuito de Render estaba dormido                                                                                                                                                                             |
