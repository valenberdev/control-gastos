# Control de Gastos

[![CI](https://github.com/valenberdev/control-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/valenberdev/control-gastos/actions/workflows/ci.yml)

Aplicación web instalable (PWA) para registrar gastos e ingresos personales, también desde un chat de Telegram. Monorepo con una API REST (Express + PostgreSQL), un bot de Telegram y un frontend en React. Es un proyecto personal de portfolio.

**Demo:** https://control-gastos-roan-eight.vercel.app · **Bot:** [@control_gastos_valen_bot](https://t.me/control_gastos_valen_bot) · **Despliegue:** [docs/deployment.md](docs/deployment.md)

## En 2 minutos

- **Qué es:** una API REST (Express y PostgreSQL), un bot de Telegram que usa esa misma API y una PWA en React, desplegados en planes gratuitos.
- **Qué mirar:** la [arquitectura](#arquitectura), las [decisiones técnicas](#decisiones-técnicas-y-trade-offs) y los [tests de integración](#tests-y-ci).

## Probar la demo

1. Abre la demo y crea una cuenta con un email y una contraseña de al menos 8 caracteres. No se pide confirmar el email.
2. Toca el botón **+**, elige gasto o ingreso y carga un movimiento.
3. En **Inicio** mira el saldo, la tendencia (por día, semana o mes) y el gasto por categoría. En **Historial** puedes cambiar de mes, editar y borrar.
4. Instala la app: en Chrome o Edge desde el botón de instalar; en iPhone, desde Safari con *Compartir > Agregar a pantalla de inicio*.
5. Activa las notificaciones con la campana y crea un movimiento: llega un aviso push. En iPhone esto solo funciona con la PWA instalada (paso anterior).
6. En **Perfil**, genera un código de vínculo y mándalo al bot con `/vincular 123456` (con tu código). Después escribe `500 comida` o `+50000 sueldo`.

> **Primera carga lenta.** La API y el bot corren en el plan gratuito de Render, que duerme el servicio tras 15 minutos sin tráfico: el primer pedido puede tardar cerca de un minuto.
>
> **Recuperación de contraseña.** El servicio de mails (Resend) está en modo de prueba: sin un dominio propio verificado, solo entrega a la dirección de la cuenta de Resend. Hoy el mail de recuperación no le llega a cualquier persona.
>
> **Es una demo.** Usa una contraseña que no uses en otros sitios: no se verifica el email y los datos pueden borrarse en cualquier momento.

## Capturas

Capturas de la app con datos de ejemplo.

<p align="center">
  <img src="docs/screenshots/inicio-claro.jpg" alt="Inicio en tema claro: saldo, tendencia y gasto por categoría" width="260">
  <img src="docs/screenshots/inicio-oscuro.jpg" alt="Inicio en tema oscuro" width="260">
</p>
<p align="center">
  <img src="docs/screenshots/historial.jpg" alt="Historial de un mes, con editar y borrar" width="200">
  <img src="docs/screenshots/agregar-movimiento.jpg" alt="Hoja para agregar un movimiento" width="200">
  <img src="docs/screenshots/perfil-telegram.jpg" alt="Perfil con un código para vincular Telegram" width="200">
</p>

## Qué hace

- **Cuentas:** registro, inicio de sesión y recuperación de contraseña por email.
- **Movimientos:** gastos (con una de seis categorías fijas: comida, transporte, entretenimiento, salud, servicios y otros) e ingresos, con descripción opcional. Se pueden crear, editar y borrar.
- **Resumen:** saldo total, tendencia por día, semana o mes (14, 8 y 6 períodos), gasto por categoría del mes elegido y últimos movimientos. Se actualiza solo cada 20 segundos mientras la pestaña está visible.
- **Zona horaria por usuario:** define qué día es «hoy» al cargar un movimiento.
- **Bot de Telegram:** acepta `500 comida`, `1.500 super` (el punto es separador de miles), `+50000 sueldo` para ingresos y `/saldo`. Si el gasto no trae una categoría reconocida, pregunta con botones. Solo responde en chats privados.
- **Notificaciones push** al registrar un gasto o un ingreso, desde la web o desde el bot.
- **PWA:** instalable, con service worker propio que guarda en caché los archivos de la aplicación (los datos no están disponibles sin conexión). Tema claro y oscuro.
- **Eliminar la cuenta** desde Perfil, con confirmación de contraseña: borra también los movimientos, el vínculo con Telegram y las suscripciones push.

## Arquitectura

```mermaid
flowchart LR
  U["Usuario"]
  W["PWA (React) en Vercel"]
  A["API (Express) en Render"]
  D[("PostgreSQL en Supabase")]
  T["Telegram"]
  B["Bot (grammY) en Render"]
  P["Servicio push del navegador"]
  R["Resend (API HTTPS)"]

  U -->|"HTTPS"| W
  W -->|"REST con JWT"| A
  A -->|"SQL por Session pooler (TLS)"| D
  U -->|"mensajes"| T
  T -->|"webhook con token secreto"| B
  B -->|"REST con clave interna y JWT por chat"| A
  A -->|"Web Push (VAPID)"| P
  P -.->|"notificación"| U
  A -->|"HTTPS"| R
  R -.->|"mail de recuperación"| U
```

- El bot no accede a la base: todo pasa por la API, así que las validaciones y el aislamiento por usuario son los mismos para la web y para el chat.
- En local, el bot funciona por *polling* y todo corre con `docker compose`; en producción recibe los mensajes por webhook.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 5, TypeScript, react-router 7, Recharts 2, vite-plugin-pwa (service worker propio con Workbox `injectManifest`) |
| API | Node 24, Express 4, `pg`, TypeScript, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `web-push` |
| Bot | grammY, TypeScript |
| Base de datos | PostgreSQL (16 en local y en CI; Supabase en producción) |
| Tests | Vitest 5 (API y bot), supertest (API) |
| CI | GitHub Actions |
| Infraestructura | Docker multi-stage, Render (API y bot), Vercel (web), Supabase (base), Resend (mails) |

## Decisiones técnicas y trade-offs

- **PWA en lugar de app nativa.** Se instala en iPhone sin cuenta de Apple Developer. Costo: sin datos offline y, en iOS, las notificaciones push exigen la PWA instalada y HTTPS.
- **Telegram en lugar de WhatsApp para cargar gastos por chat.** Descarté WhatsApp por la fricción de su API para uso personal.
- **El saldo no se guarda, se calcula en SQL con `NUMERIC(12,2)`.** Evita errores de coma flotante y un contador que se desincronice. Antes se restaba en JavaScript (corregido en `c2733a8`). Costo: una suma por consulta, apoyada en el índice por usuario y fecha.
- **Fechas como `DATE`, sin hora.** La fecha de cada movimiento se calcula en SQL con la zona horaria del usuario y la API devuelve los `DATE` como texto `AAAA-MM-DD` (`apps/api/src/db/pool.ts`) para evitar corrimientos de día al serializar.
- **Filtro por mes con rango de fechas** en lugar de `date_trunc`, para que Postgres pueda usar el índice `(user_id, fecha)`: aplicarle una función a la columna lo impide.
- **Autenticación propia con `bcryptjs` y JWT.** `bcryptjs` es JavaScript puro: no necesita compilar módulos nativos en la imagen Alpine (costo: es más lento que `bcrypt`). El JWT (7 días) vive en `localStorage` y no en una cookie `httpOnly` porque frontend y API están en dominios distintos. Costo: un XSS podría leerlo y la sesión no se revoca.
- **Recuperación de contraseña sin filtrar qué cuentas existen.** Token aleatorio de un solo uso (solo se guarda su hash), vence a la hora, el link lleva el token después del `#` (el navegador no lo envía al servidor) y la respuesta es idéntica exista o no la cuenta.
- **Bot autenticado con clave interna.** El bot se identifica ante la API con `x-internal-key` y obtiene un JWT por cada chat vinculado. El vínculo es un código de 6 dígitos de un solo uso. Descarta los `update_id` repetidos porque Telegram reenvía si la API tarda por un *cold start*.
- **Express detrás de los proxies de Render.** La cantidad de saltos de confianza (`TRUST_PROXY_HOPS`) se midió de forma empírica con una ruta temporal, ya eliminada. Sin ese ajuste, todos los clientes compartirían la misma IP en los límites de intentos.
- **Session pooler de Supabase.** La conexión directa es solo IPv6 y Render no soporta IPv6 saliente.
- **Mails por la API HTTPS de Resend.** El plan gratuito de Render bloquea el tráfico saliente a los puertos SMTP.
- **La app de Express está separada del arranque** (`app.ts` e `index.ts`) para poder probarla con supertest sin abrir un puerto.
- **Tests de integración contra Postgres real**, no contra mocks de la base, para que cubran las consultas SQL (fechas, zonas horarias, atomicidad). Al diseñar los casos de prueba aparecieron bugs reales, que se corrigieron antes de escribir los tests que los cubren. Algunos ejemplos:
  - Un monto escrito `1.500` se registraba como 1,5 (`8d8a978`).
  - Un `month` con formato inválido llegaba a la consulta y terminaba en un error 500; hoy responde 400 (`9b5a8aa`).
  - El canje del código de Telegram hacía un `SELECT` y después un `DELETE` por separado: dos pedidos simultáneos con el mismo código podían pasar los dos. Hoy es un `DELETE ... RETURNING` dentro de una transacción (`acbbe12`).

## Seguridad

Lo que está implementado:

- Contraseñas con `bcryptjs` (costo 10), mínimo de 8 caracteres. El login compara contra un hash ficticio cuando el email no existe y responde igual, para no filtrar qué cuentas hay.
- Validación de entrada en la API: montos positivos con hasta 2 decimales y un máximo, descripciones de hasta 200 caracteres (el bot recorta las más largas), meses con formato `AAAA-MM` e ids con formato UUID.
- Sesiones con JWT de 7 días. Todas las consultas de datos filtran por el `user_id` del token (un `userId` en el cuerpo se ignora) y hay tests de aislamiento entre usuarios.
- Límites de intentos (`express-rate-limit`, en memoria):

  | Acción | Límite |
  |---|---|
  | Login | 5 fallos cada 15 min por IP y email; 30 fallos cada 15 min por IP |
  | Registro | 10 por hora por IP |
  | Pedir recuperación de contraseña | 3 por hora por email; 5 por hora por IP |
  | Restablecer contraseña | 10 fallos cada 15 min por IP |
  | Generar código de Telegram | 10 por hora por cuenta |
  | Canjear código de Telegram | 5 fallos cada 15 min por chat |

- Endpoints del bot protegidos con una clave interna comparada en tiempo constante (`crypto.timingSafeEqual`). Si la clave no está configurada, nadie entra.
- Webhook de Telegram validado con token secreto.
- Consultas parametrizadas; el link de recuperación se arma con `FRONTEND_URL`, no con el encabezado `Host` del pedido.
- CORS limitado a un único origen (`FRONTEND_URL`). Conexión a la base cifrada con TLS en producción (`DATABASE_SSL`).
- La Data API automática de Supabase está desactivada: la única puerta a los datos es la API propia, con su autenticación y sus límites.
- Los `.env` están en `.gitignore`; las claves viven solo en las variables de entorno de cada servicio.
- Cada pedido autenticado verifica que la cuenta siga existiendo (con un cache de 30 segundos): al eliminar una cuenta, sus sesiones dejan de valer en segundos y no a los 7 días.

Lo que **no** está: encabezados de seguridad (por ejemplo `helmet`), revocación de sesiones, doble factor de autenticación. Ver [Limitaciones](#limitaciones-conocidas-y-próximos-pasos).

## Tests y CI

**Qué se prueba.** La API tiene tests de integración contra una base PostgreSQL real: registro, login y sesiones (incluidos tokens vencidos o firmados con otro secreto), zona horaria, aislamiento entre usuarios, gastos e ingresos (alta, edición, borrado, bordes de mes, «hoy» según la zona de cada usuario), saldo y tendencia, recuperación de contraseña (un solo uso, vencimiento, concurrencia), vínculo de Telegram y límites de intentos. El envío de mails se simula. El bot tiene tests del parser de mensajes (montos, categorías, ingresos, entradas inválidas). El frontend no tiene tests: el CI solo comprueba tipos y que compile.

**Cómo correrlos.** Ver [Tests](#tests) más abajo.

**Qué corre el workflow** (`.github/workflows/ci.yml`, en cada push a `main` y en cada pull request):

| Job | Qué hace |
|---|---|
| `api` | `npm ci`, `npm run build` y `npm test` con un servicio PostgreSQL 16 |
| `bot` | `npm ci`, `npm run build` y `npm test` |
| `web` | `npm ci`, `npm run typecheck` (incluye el service worker) y `npm run build` |
| `docker` | Construye las imágenes de producción de la API y del bot, sin publicarlas |

## Correrlo en local

**Requisitos:** Docker con Compose y Node 24, que es la versión que usan los Dockerfiles y el CI (hay un `.nvmrc`). Node se necesita para el frontend y para ejecutar los tests fuera de Docker.

```bash
# 1. Variables de entorno
cp .env.example .env
# Completar .env. Para generar las claves VAPID (hace falta antes de levantar la API):
cd apps/api && npm ci && npx web-push generate-vapid-keys && cd ../..

# 2. Base de datos, API y bot
docker compose up --build
```

El compose levanta tres servicios: `db` (PostgreSQL 16, expuesto en `127.0.0.1:5433`; carga `db/init.sql` solo la primera vez que se crea el volumen), `api` (puerto 3000, con `tsx watch`) y `bot` (en modo *polling*). Para el bot usa el token de un bot de desarrollo creado con @BotFather, distinto del de producción. Sin `RESEND_API_KEY`, el link de recuperación de contraseña se imprime en el log de la API.

> **Recarga en caliente en Windows.** En Docker Desktop para Windows, `tsx watch` puede no detectar los cambios de archivos montados desde el disco de Windows. Si un cambio en `api` o `bot` no se refleja, reinicia el servicio con `docker compose restart api`. Si cambias dependencias, usa `docker compose up --build -V` para renovar el volumen de `node_modules`.

```bash
# 3. Frontend (otra terminal)
cd apps/web
cp .env.example .env     # VITE_API_URL=http://localhost:3000 y VITE_VAPID_PUBLIC_KEY
npm ci
npm run dev              # http://localhost:5173
```

`npm run dev:mobile` expone el servidor de Vite en la red local para probar desde un celular.

### Tests

```bash
# API: crear una vez la base de prueba y correr los tests dentro del contenedor
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" "${POSTGRES_DB}_test"'
docker compose exec api npm test

# Bot (no necesita base de datos)
cd apps/bot && npm ci && npm test

# Frontend: chequeo de tipos
cd apps/web && npm run typecheck
```

Los tests de la API recrean el esquema (`DROP SCHEMA public CASCADE`) y por eso se niegan a correr contra una base cuyo nombre no termine en `_test`. Fuera de Docker: `cd apps/api && TEST_DATABASE_URL=postgresql://USUARIO:CLAVE@127.0.0.1:5433/control_gastos_test npm test`.

## Endpoints de la API

Las rutas marcadas «Sesión» exigen `Authorization: Bearer <JWT>`; «Clave interna» exige el encabezado `x-internal-key` (solo las usa el bot).

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/health` | Pública (estado y commit desplegado) |
| POST | `/auth/register`, `/auth/login` | Pública |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Pública |
| GET | `/auth/me` | Sesión |
| PATCH | `/auth/timezone` | Sesión |
| POST | `/auth/link-code` | Sesión |
| POST | `/auth/link-telegram`, `/auth/telegram-token` | Clave interna |
| GET | `/categories` | Sesión |
| GET, POST | `/expenses`, `/incomes` (`GET` acepta `?month=AAAA-MM`) | Sesión |
| PATCH, DELETE | `/expenses/:id`, `/incomes/:id` | Sesión |
| GET | `/balance` | Sesión |
| GET | `/reports/trend?period=day\|week\|month` | Sesión |
| POST, DELETE | `/push/subscribe` | Sesión |
| DELETE | `/auth/me` | Sesión (pide la contraseña) |

## Estructura del repositorio

```
apps/
  api/        API REST. src/app.ts arma Express; src/index.ts la arranca
    src/      routes/ middleware/ services/ lib/ db/ config/ test/
  bot/        Bot de Telegram (grammY). src/parser/ interpreta los mensajes
  web/        PWA (React + Vite). src/ pages/ components/ hooks/ context/ lib/ api/ y sw.ts
db/
  init.sql    Esquema completo y categorías iniciales
  migrations/ Scripts para bases creadas antes de cada cambio
docs/         Guía de despliegue
.github/workflows/ci.yml
.nvmrc                Versión de Node (24)
docker-compose.yml    Entorno local: db, api y bot
PRODUCT.md, DESIGN.md Documentos de producto y de diseño del frontend
```

## Limitaciones conocidas y próximos pasos

- La API, el bot y la base viven en planes gratuitos, con *cold starts* de hasta cerca de un minuto.
- Los límites de intentos están en memoria: se reinician con cada reinicio del servicio. El bot también guarda en memoria los `update_id` vistos y las categorías pendientes de elegir.
- Los tokens de sesión (7 días) no se revocan al cambiar la contraseña ni al cerrar sesión; cerrar sesión solo borra el token del navegador. Sí dejan de valer cuando se elimina la cuenta.
- La conexión a la base va cifrada pero sin verificar el certificado del servidor (se puede activar con `DATABASE_CA_CERT`).
- La recuperación de contraseña por email no llega a cualquier persona hasta verificar un dominio en Resend.
- No hay verificación de email.
- No se configuraron respaldos propios de la base de datos.
- No hay login con Google, presupuestos, gastos recurrentes ni exportación a CSV. La tabla `recurring_expenses` y la columna `monthly_budget` existen en el esquema, pero ninguna funcionalidad las usa.
- Las categorías son fijas y compartidas por todas las cuentas, y la interfaz muestra los montos en pesos argentinos.
- No hay tests del frontend ni de la entrega real de push, del webhook del bot o de Resend.
- Las migraciones se aplican a mano y en orden; no hay una herramienta que registre cuáles se corrieron.

Próximos pasos posibles: verificar un dominio en Resend, verificación de email, revocar sesiones al cambiar la contraseña, guardar los límites de intentos fuera de la memoria del proceso, agregar tests del frontend y encabezados de seguridad.

## Licencia

[MIT](LICENSE). Puedes usar, copiar y modificar el código; solo hay que conservar el aviso de copyright.

## Autor

Valentino Berdini · [GitHub](https://github.com/valenberdev) · [LinkedIn](https://www.linkedin.com/in/valenberdini/)