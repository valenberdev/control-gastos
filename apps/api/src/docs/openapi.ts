// Especificación OpenAPI 3.0 de la API. Describe el comportamiento actual del
// código (rutas en src/routes), incluidas sus inconsistencias, que se marcan en
// la descripción de cada endpoint con "Inconsistencia conocida".

type Json = Record<string, unknown>;

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });

const json = (schema: Json, example?: unknown): Json => ({
  "application/json": example === undefined ? { schema } : { schema, example },
});

// Respuesta de error con el cuerpo { error }. Con varios mensajes posibles se
// muestran todos como ejemplos.
function error(description: string, ...messages: string[]): Json {
  const content: Json =
    messages.length <= 1
      ? json(ref("Error"), messages[0] ? { error: messages[0] } : undefined)
      : {
          "application/json": {
            schema: ref("Error"),
            examples: Object.fromEntries(
              messages.map((message, i) => [
                `mensaje${i + 1}`,
                { value: { error: message } },
              ]),
            ),
          },
        };
  return { description, content };
}

const unauthorized: Json = { $ref: "#/components/responses/Unauthorized" };
const tooManyRequests: Json = { $ref: "#/components/responses/TooManyRequests" };

const bearer = [{ bearerAuth: [] }];
const internalKey = [{ internalKey: [] }];

const idParam = (what: string): Json => ({
  name: "id",
  in: "path",
  required: true,
  description: `Identificador (UUID) ${what}. Si no es un UUID válido la API responde 404, no 400.`,
  schema: { type: "string", format: "uuid" },
});

const monthParam: Json = {
  name: "month",
  in: "query",
  required: false,
  description:
    "Mes con formato AAAA-MM (entre 1900 y 2099). Con `month` devuelve todos los movimientos de ese mes; sin `month`, los 100 más recientes.",
  schema: { type: "string", pattern: "^(19|20)\\d{2}-(0[1-9]|1[0-2])$" },
  example: "2026-10",
};

const MONTH_ERROR =
  "El mes tiene que tener el formato AAAA-MM (por ejemplo 2026-09).";

const SHARED_NOTE_SNAKE =
  "**Inconsistencia conocida:** el request usa camelCase (`categoryId`) pero la respuesta usa snake_case (`category_id`, `expense_date`, `created_at`); `/balance` y `/auth/telegram` responden en camelCase.";

export const openapi: Json = {
  openapi: "3.0.3",
  info: {
    title: "Control de Gastos API",
    version: "1.0.0",
    description: [
      "API REST (Node.js, Express y PostgreSQL) de la aplicación Control de Gastos: registro de gastos e ingresos, saldo y reportes.",
      "",
      "**Autenticación.** Después de `POST /auth/register` o `POST /auth/login`, enviar el token en el encabezado `Authorization: Bearer <token>`. El token es un JWT HS256 que vence a los 7 días y se invalida si la cuenta cambia de contraseña o se elimina.",
      "",
      "**Límites de intentos (429).** Solo algunos endpoints los tienen (se indican en cada uno). La respuesta incluye `Retry-After` y los encabezados `RateLimit` del borrador 7 del IETF.",
      "",
      "**Errores.** Todos los errores tienen la forma `{ \"error\": \"mensaje\" }`. Cualquier endpoint con cuerpo JSON puede responder además 400 si el JSON es inválido y 413 si el cuerpo es demasiado grande; cualquier ruta inexistente responde 404 `No encontrado`.",
      "",
      "**Inconsistencias conocidas.** Esta especificación describe el comportamiento real del código, sin corregirlo; las diferencias entre endpoints se marcan en cada descripción.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Servidor actual" }],
  tags: [
    { name: "Sistema", description: "Estado de la API y de la base." },
    { name: "Autenticación", description: "Registro, inicio de sesión y recuperación de contraseña." },
    { name: "Cuenta", description: "Datos de la cuenta autenticada y vínculo con Telegram." },
    { name: "Categorías", description: "Categorías de gastos (solo lectura)." },
    { name: "Gastos", description: "CRUD de gastos del usuario autenticado." },
    { name: "Ingresos", description: "CRUD de ingresos del usuario autenticado." },
    { name: "Saldo y reportes", description: "Saldo total y tendencia por período." },
    { name: "Notificaciones push", description: "Suscripciones Web Push del navegador." },
    {
      name: "Interno (bot de Telegram)",
      description:
        "Endpoints que usa el bot de Telegram con la clave interna `x-internal-key`. No están pensados para clientes externos.",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "Estado de la API",
        description:
          "No consulta la base. `commit` son los primeros 7 caracteres del commit desplegado en Render, o `local` en desarrollo.",
        responses: {
          "200": {
            description: "La API responde.",
            content: json(
              {
                type: "object",
                required: ["status", "commit"],
                properties: {
                  status: { type: "string", example: "ok" },
                  commit: { type: "string", example: "973ca2f" },
                },
              },
              { status: "ok", commit: "local" },
            ),
          },
        },
      },
    },
    "/health/db": {
      get: {
        tags: ["Sistema"],
        summary: "Estado de la API y de la base",
        description:
          "Ejecuta una consulta real contra Postgres. Límite: 30 pedidos por minuto.",
        responses: {
          "200": {
            description: "API y base funcionan.",
            content: json(ref("HealthDb"), { status: "ok", db: "ok" }),
          },
          "503": {
            description: "La base no respondió (el detalle del error no se expone).",
            content: json(ref("HealthDb"), { status: "error", db: "error" }),
          },
          "429": tooManyRequests,
        },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Autenticación"],
        summary: "Crear una cuenta",
        description: [
          "Crea la cuenta y devuelve un token de sesión. Límite: 10 registros por hora por IP.",
          "",
          "La contraseña debe tener entre 8 caracteres y 72 bytes, no ser un solo carácter repetido ni una de las contraseñas más comunes.",
          "",
          "**Inconsistencia conocida:** la respuesta incluye `user.timezone`, pero la de `POST /auth/login` no. Además, una `timezone` inválida se reemplaza en silencio por la zona por defecto (no da 400), a diferencia de `PATCH /auth/timezone`, que sí responde 400.",
        ].join("\n"),
        security: [],
        requestBody: {
          required: true,
          content: json(
            {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email", maxLength: 254, description: "Se normaliza a minúsculas." },
                password: { type: "string", format: "password", minLength: 8 },
                timezone: {
                  type: "string",
                  description: "Zona horaria IANA. Opcional; si falta o no existe se usa la zona por defecto de la API.",
                  example: "America/Argentina/Buenos_Aires",
                },
              },
            },
            { email: "demo@example.com", password: "Demo-Gastos-2026", timezone: "America/Argentina/Buenos_Aires" },
          ),
        },
        responses: {
          "201": {
            description: "Cuenta creada.",
            content: json(ref("RegisterResponse")),
          },
          "400": error(
            "Email inválido o contraseña que no cumple las reglas.",
            "Email inválido",
            "La contraseña es obligatoria",
            "La contraseña es muy corta (mínimo 8 caracteres)",
            "La contraseña es muy larga (máximo 72 bytes)",
            "La contraseña es demasiado simple",
            "Esa contraseña es muy común: elige otra",
          ),
          "409": error("Ya existe una cuenta con ese email.", "Ya existe una cuenta con ese email"),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al registrar el usuario"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión",
        description: [
          "Devuelve un token de sesión (JWT, 7 días). Responde igual con una contraseña incorrecta que con un email inexistente.",
          "",
          "Límites (solo cuentan los intentos fallidos): 30 por IP cada 15 minutos, 5 por IP y email cada 15 minutos y 50 por email cada hora.",
          "",
          "**Inconsistencia conocida:** `user` trae solo `id` y `email`; `POST /auth/register` también devuelve `timezone`.",
        ].join("\n"),
        security: [],
        requestBody: {
          required: true,
          content: json(
            {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string", format: "password" },
              },
            },
            { email: "demo@example.com", password: "Demo-Gastos-2026" },
          ),
        },
        responses: {
          "200": { description: "Sesión iniciada.", content: json(ref("LoginResponse")) },
          "400": error("Email o contraseña faltantes o con formato inválido.", "Datos inválidos"),
          "401": error("Credenciales inválidas.", "Credenciales inválidas"),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al iniciar sesión"),
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Autenticación"],
        summary: "Pedir el link para restablecer la contraseña",
        description:
          "Responde siempre 200 con el mismo mensaje, exista o no la cuenta (incluso con un email inválido). El mail se envía en segundo plano. Límites: 5 por IP por hora y 3 por email por hora.",
        security: [],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["email"],
            properties: { email: { type: "string", format: "email" } },
          }),
        },
        responses: {
          "200": {
            description: "Pedido recibido.",
            content: json(
              { type: "object", properties: { message: { type: "string" } } },
              { message: "Si existe una cuenta con ese email, te mandamos un link para restablecer la contraseña." },
            ),
          },
          "429": tooManyRequests,
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Autenticación"],
        summary: "Restablecer la contraseña con el token del mail",
        description:
          "El token sirve una sola vez y vence a la hora. Al cambiar la contraseña se cierran todas las sesiones, los chats de Telegram vinculados, las suscripciones push y los códigos de vínculo pendientes. No inicia sesión. Límite: 10 intentos fallidos cada 15 minutos por IP.",
        security: [],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["token", "password"],
            properties: {
              token: { type: "string", minLength: 20, maxLength: 200 },
              password: { type: "string", format: "password", minLength: 8 },
            },
          }),
        },
        responses: {
          "200": { description: "Contraseña cambiada.", content: json(ref("Success"), { success: true }) },
          "400": error(
            "Token con formato inválido, contraseña que no cumple las reglas, o link inválido o vencido.",
            "Datos inválidos",
            "El link no es válido o ya venció. Pedí uno nuevo.",
            "Esa contraseña es muy común: elige otra",
          ),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al restablecer la contraseña"),
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Cuenta"],
        summary: "Datos de la cuenta autenticada",
        security: bearer,
        responses: {
          "200": { description: "La cuenta.", content: json(ref("UserWithTimezone")) },
          "401": unauthorized,
          "404": error("La cuenta ya no existe.", "Usuario no encontrado"),
          "500": error("Error del servidor.", "Error al obtener el usuario"),
        },
      },
      delete: {
        tags: ["Cuenta"],
        summary: "Eliminar la cuenta",
        description: [
          "Borra la cuenta y todo lo que depende de ella (gastos, ingresos, vínculos y suscripciones). Pide la contraseña actual. Límite: 5 contraseñas incorrectas cada 15 minutos.",
          "",
          "**Inconsistencia conocida:** recibe la contraseña en el cuerpo de un DELETE, algo que OpenAPI 3.0 no define; `DELETE /push/subscribe` hace lo mismo.",
        ].join("\n"),
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["password"],
            properties: { password: { type: "string", format: "password" } },
          }),
        },
        responses: {
          "200": { description: "Cuenta eliminada.", content: json(ref("Success"), { success: true }) },
          "400": error("Falta la contraseña.", "Falta la contraseña"),
          "401": unauthorized,
          "403": error("La contraseña no coincide.", "Contraseña incorrecta"),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al eliminar la cuenta"),
        },
      },
    },
    "/auth/timezone": {
      patch: {
        tags: ["Cuenta"],
        summary: "Cambiar la zona horaria de la cuenta",
        description:
          "La zona horaria define qué día es \"hoy\" al registrar movimientos y en los reportes.\n\n**Inconsistencia conocida:** acá una zona inválida da 400, mientras que `POST /auth/register` la ignora en silencio.",
        security: bearer,
        requestBody: {
          required: true,
          content: json(
            {
              type: "object",
              required: ["timezone"],
              properties: { timezone: { type: "string", description: "Nombre de zona IANA existente en Postgres." } },
            },
            { timezone: "America/Argentina/Buenos_Aires" },
          ),
        },
        responses: {
          "200": {
            description: "Zona actualizada.",
            content: json(
              { type: "object", properties: { timezone: { type: "string" } } },
              { timezone: "America/Argentina/Buenos_Aires" },
            ),
          },
          "400": error("Zona horaria inválida o inexistente.", "Zona horaria inválida"),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al actualizar la zona horaria"),
        },
      },
    },
    "/auth/link-code": {
      post: {
        tags: ["Cuenta"],
        summary: "Generar un código para vincular Telegram",
        description:
          "Genera un código de 6 dígitos de un solo uso que vence a los 10 minutos y reemplaza al anterior. Se ingresa en el bot con `/vincular <código>`. Límite: 10 por hora por cuenta.",
        security: bearer,
        responses: {
          "201": {
            description: "Código generado.",
            content: json(
              {
                type: "object",
                required: ["code", "expiresAt"],
                properties: {
                  code: { type: "string", pattern: "^\\d{6}$" },
                  expiresAt: { type: "string", format: "date-time" },
                },
              },
              { code: "482913", expiresAt: "2026-10-22T18:30:00.000Z" },
            ),
          },
          "401": unauthorized,
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al generar el código"),
        },
      },
    },
    "/auth/telegram": {
      get: {
        tags: ["Cuenta"],
        summary: "Chats de Telegram vinculados a la cuenta",
        description: "**Inconsistencia conocida:** responde en camelCase (`chatId`, `linkedAt`), como `/balance`, y a diferencia de gastos, ingresos y categorías (snake_case).",
        security: bearer,
        responses: {
          "200": {
            description: "Chats vinculados, el más reciente primero.",
            content: json({ type: "array", items: ref("TelegramLink") }),
          },
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al obtener los chats vinculados"),
        },
      },
    },
    "/auth/telegram/{chatId}": {
      delete: {
        tags: ["Cuenta"],
        summary: "Desvincular un chat de Telegram",
        security: bearer,
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            description: "Identificador del chat (entero, puede ser negativo). Si no tiene ese formato la API responde 404.",
            schema: { type: "string", pattern: "^-?\\d{1,20}$" },
          },
        ],
        responses: {
          "200": { description: "Chat desvinculado.", content: json(ref("Success"), { success: true }) },
          "401": unauthorized,
          "404": error("El chat no está vinculado a esta cuenta (o el identificador es inválido).", "Chat no encontrado"),
          "500": error("Error del servidor.", "Error al desvincular el chat"),
        },
      },
    },

    "/categories": {
      get: {
        tags: ["Categorías"],
        summary: "Listar categorías",
        description: [
          "Categorías compartidas por todos los usuarios, ordenadas por nombre. Sus `id` se usan como `categoryId` al crear un gasto.",
          "",
          "**Inconsistencia conocida:** `monthly_budget` es un `numeric` de Postgres y se devuelve como string cuando tiene valor (`\"1500.00\"`), mientras que los montos de gastos e ingresos se devuelven como número. Hoy es `null` en todas las categorías de la base inicial.",
        ].join("\n"),
        security: bearer,
        responses: {
          "200": { description: "Categorías.", content: json({ type: "array", items: ref("Category") }) },
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al obtener categorías"),
        },
      },
    },

    "/expenses": {
      get: {
        tags: ["Gastos"],
        summary: "Listar gastos del usuario",
        description: [
          "Ordenados del más reciente al más antiguo. Sin `month` devuelve como máximo 100; con `month` devuelve todos los del mes.",
          "",
          SHARED_NOTE_SNAKE,
          "Un `month` inválido da 400, mientras que un `period` inválido en `GET /reports/trend` se reemplaza por `month` sin error.",
        ].join("\n"),
        security: bearer,
        parameters: [monthParam],
        responses: {
          "200": { description: "Gastos.", content: json({ type: "array", items: ref("Expense") }) },
          "400": error("`month` con formato inválido.", MONTH_ERROR),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al obtener gastos"),
        },
      },
      post: {
        tags: ["Gastos"],
        summary: "Crear un gasto",
        description: [
          "La fecha del gasto la fija el servidor: es el día de hoy en la zona horaria de la cuenta. Envía una notificación push al usuario (si tiene suscripciones).",
          "",
          "**Inconsistencia conocida:** las validaciones de este POST responden siempre el genérico `Datos inválidos`, mientras que el PATCH responde mensajes específicos (`Monto inválido`, etc.). Además, acá la `description` se guarda sin recortar espacios; el PATCH la recorta y convierte el texto vacío en `null`.",
        ].join("\n"),
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref("NewExpense"), {
            amount: 1850.5,
            categoryId: "00000000-0000-4000-8000-000000000000",
            description: "Café con medialunas",
            source: "web",
          }),
        },
        responses: {
          "201": { description: "Gasto creado.", content: json(ref("Expense")) },
          "400": error(
            "Datos inválidos o categoría inexistente.",
            "Datos inválidos",
            "La categoría no existe",
          ),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al crear el gasto"),
        },
      },
    },
    "/expenses/{id}": {
      patch: {
        tags: ["Gastos"],
        summary: "Modificar un gasto",
        description: [
          "Actualiza solo los campos enviados (al menos uno). Solo se pueden modificar gastos propios; uno ajeno responde 404.",
          "",
          "**Inconsistencia conocida:** un `id` que no es UUID da 404 (no 400); los mensajes de 400 son específicos por campo (a diferencia del POST); y la `description` se recorta, con \"\" convertido en `null`.",
        ].join("\n"),
        security: bearer,
        parameters: [idParam("del gasto")],
        requestBody: {
          required: true,
          content: json(ref("UpdateExpense"), { amount: 2000 }),
        },
        responses: {
          "200": { description: "Gasto actualizado.", content: json(ref("Expense")) },
          "400": error(
            "Campo inválido, categoría inexistente o cuerpo sin campos.",
            "Monto inválido",
            "Categoría inválida",
            "Descripción inválida",
            "La categoría no existe",
            "No hay nada para actualizar",
          ),
          "401": unauthorized,
          "404": error("El gasto no existe, no es del usuario o el `id` no es un UUID.", "Gasto no encontrado"),
          "500": error("Error del servidor.", "Error al actualizar el gasto"),
        },
      },
      delete: {
        tags: ["Gastos"],
        summary: "Borrar un gasto",
        description:
          "**Inconsistencia conocida:** borrar algo que no existe da 404, mientras que `DELETE /push/subscribe` responde 200 aunque no haya nada que borrar.",
        security: bearer,
        parameters: [idParam("del gasto")],
        responses: {
          "200": { description: "Gasto borrado.", content: json(ref("Success"), { success: true }) },
          "401": unauthorized,
          "404": error("El gasto no existe, no es del usuario o el `id` no es un UUID.", "Gasto no encontrado"),
          "500": error("Error del servidor.", "Error al borrar el gasto"),
        },
      },
    },

    "/incomes": {
      get: {
        tags: ["Ingresos"],
        summary: "Listar ingresos del usuario",
        description: [
          "Ordenados del más reciente al más antiguo. Sin `month` devuelve como máximo 100; con `month` devuelve todos los del mes.",
          "",
          "**Inconsistencia conocida:** la respuesta usa snake_case (`income_date`, `created_at`) y `/balance` usa camelCase. Un `month` inválido da 400, mientras que un `period` inválido en `GET /reports/trend` se reemplaza por `month` sin error.",
        ].join("\n"),
        security: bearer,
        parameters: [monthParam],
        responses: {
          "200": { description: "Ingresos.", content: json({ type: "array", items: ref("Income") }) },
          "400": error("`month` con formato inválido.", MONTH_ERROR),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al obtener ingresos"),
        },
      },
      post: {
        tags: ["Ingresos"],
        summary: "Crear un ingreso",
        description: [
          "La fecha la fija el servidor (hoy en la zona horaria de la cuenta). Envía una notificación push al usuario (si tiene suscripciones).",
          "",
          "**Inconsistencia conocida:** las validaciones de este POST responden siempre `Datos inválidos`, mientras que el PATCH da mensajes específicos; y acá la `description` no se recorta (el PATCH sí).",
        ].join("\n"),
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref("NewIncome"), { amount: 250000, description: "Sueldo", source: "web" }),
        },
        responses: {
          "201": { description: "Ingreso creado.", content: json(ref("Income")) },
          "400": error("Datos inválidos.", "Datos inválidos"),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al crear el ingreso"),
        },
      },
    },
    "/incomes/{id}": {
      patch: {
        tags: ["Ingresos"],
        summary: "Modificar un ingreso",
        description: [
          "Actualiza solo los campos enviados (al menos uno).",
          "",
          "**Inconsistencia conocida:** un `id` que no es UUID da 404 (no 400); los 400 son específicos por campo (a diferencia del POST); y la `description` se recorta, con \"\" convertido en `null`.",
        ].join("\n"),
        security: bearer,
        parameters: [idParam("del ingreso")],
        requestBody: {
          required: true,
          content: json(ref("UpdateIncome"), { amount: 260000 }),
        },
        responses: {
          "200": { description: "Ingreso actualizado.", content: json(ref("Income")) },
          "400": error(
            "Campo inválido o cuerpo sin campos.",
            "Monto inválido",
            "Descripción inválida",
            "No hay nada para actualizar",
          ),
          "401": unauthorized,
          "404": error("El ingreso no existe, no es del usuario o el `id` no es un UUID.", "Ingreso no encontrado"),
          "500": error("Error del servidor.", "Error al actualizar el ingreso"),
        },
      },
      delete: {
        tags: ["Ingresos"],
        summary: "Borrar un ingreso",
        description:
          "**Inconsistencia conocida:** borrar algo que no existe da 404, mientras que `DELETE /push/subscribe` responde 200 aunque no haya nada que borrar.",
        security: bearer,
        parameters: [idParam("del ingreso")],
        responses: {
          "200": { description: "Ingreso borrado.", content: json(ref("Success"), { success: true }) },
          "401": unauthorized,
          "404": error("El ingreso no existe, no es del usuario o el `id` no es un UUID.", "Ingreso no encontrado"),
          "500": error("Error del servidor.", "Error al borrar el ingreso"),
        },
      },
    },

    "/balance": {
      get: {
        tags: ["Saldo y reportes"],
        summary: "Saldo total del usuario",
        description:
          "Suma de todos los ingresos menos todos los gastos del usuario (sin filtro de fechas).\n\n**Inconsistencia conocida:** responde en camelCase; gastos, ingresos y categorías responden en snake_case.",
        security: bearer,
        responses: {
          "200": { description: "Saldo.", content: json(ref("Balance")) },
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al calcular el saldo"),
        },
      },
    },
    "/reports/trend": {
      get: {
        tags: ["Saldo y reportes"],
        summary: "Ingresos y gastos agrupados por período",
        description: [
          "Devuelve una serie con un punto por período, incluidos los períodos sin movimientos (en 0): 14 días, 8 semanas o 6 meses según `period`. El día actual se calcula en la zona horaria de la cuenta.",
          "",
          "**Inconsistencia conocida:** un `period` inválido no da 400: se reemplaza por `month`. En cambio `month` inválido en `/expenses` e `/incomes` sí da 400.",
        ].join("\n"),
        security: bearer,
        parameters: [
          {
            name: "period",
            in: "query",
            required: false,
            description: "Tamaño del período. `day`: últimos 14; `week`: últimas 8; `month`: últimos 6 (por defecto).",
            schema: { type: "string", enum: ["day", "week", "month"], default: "month" },
          },
        ],
        responses: {
          "200": { description: "Serie ordenada por fecha.", content: json({ type: "array", items: ref("TrendPoint") }) },
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al calcular la tendencia"),
        },
      },
    },

    "/push/subscribe": {
      post: {
        tags: ["Notificaciones push"],
        summary: "Guardar una suscripción Web Push",
        description: [
          "Solo se aceptan endpoints de los servicios de push de los navegadores (FCM, Mozilla, Apple, Windows). Máximo 10 dispositivos por cuenta. Si el endpoint ya existe se actualiza. Límite: 30 por cuenta cada 15 minutos.",
          "",
          "**Inconsistencia conocida:** este POST responde 201, mientras que el DELETE del mismo recurso responde 200.",
        ].join("\n"),
        security: bearer,
        requestBody: { required: true, content: json(ref("PushSubscription")) },
        responses: {
          "201": { description: "Suscripción guardada.", content: json(ref("Success"), { success: true }) },
          "400": error(
            "Suscripción inválida o límite de dispositivos alcanzado.",
            "Datos de suscripción inválidos",
            "Llegaste al máximo de 10 dispositivos con notificaciones",
          ),
          "401": unauthorized,
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al guardar la suscripción"),
        },
      },
      delete: {
        tags: ["Notificaciones push"],
        summary: "Eliminar una suscripción Web Push",
        description: [
          "Es idempotente: responde 200 aunque el endpoint no esté suscripto.",
          "",
          "**Inconsistencia conocida:** a diferencia de los DELETE de gastos e ingresos (404 si no existe) no distingue ese caso, y recibe el `endpoint` en el cuerpo de un DELETE (OpenAPI 3.0 no define esa semántica).",
        ].join("\n"),
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["endpoint"],
            properties: { endpoint: { type: "string", format: "uri" } },
          }),
        },
        responses: {
          "200": { description: "Suscripción eliminada (o inexistente).", content: json(ref("Success"), { success: true }) },
          "400": error("Falta el `endpoint` o no es un string.", "Datos inválidos"),
          "401": unauthorized,
          "500": error("Error del servidor.", "Error al eliminar la suscripción"),
        },
      },
    },

    "/auth/link-telegram": {
      post: {
        tags: ["Interno (bot de Telegram)"],
        summary: "Vincular un chat de Telegram con un código",
        description:
          "Lo llama el bot cuando el usuario envía `/vincular <código>`. Consume el código (un solo uso) y vincula el chat; si el chat ya estaba vinculado, pasa a la cuenta nueva. Límite: 5 códigos incorrectos cada 15 minutos por chat.",
        security: internalKey,
        requestBody: {
          required: true,
          content: json(
            {
              type: "object",
              required: ["code", "chatId"],
              properties: {
                code: { type: "string", pattern: "^\\d{6}$" },
                chatId: { type: "string", pattern: "^-?\\d{1,20}$" },
              },
            },
            { code: "482913", chatId: "123456789" },
          ),
        },
        responses: {
          "200": { description: "Chat vinculado.", content: json(ref("Success"), { success: true }) },
          "400": error("Código o `chatId` con formato inválido.", "Datos inválidos"),
          "401": error("Falta la clave interna o es incorrecta.", "No autorizado"),
          "404": error("El código no existe o venció.", "Código inválido o expirado"),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al vincular la cuenta"),
        },
      },
    },
    "/auth/telegram-token": {
      post: {
        tags: ["Interno (bot de Telegram)"],
        summary: "Obtener un token de sesión para un chat vinculado",
        description:
          "Lo llama el bot para operar en nombre de la cuenta vinculada. Devuelve un JWT de 15 minutos atado al chat: deja de valer apenas se desvincula. Límites: 30 por chat cada 15 minutos y 600 por IP cada 15 minutos.",
        security: internalKey,
        requestBody: {
          required: true,
          content: json(
            {
              type: "object",
              required: ["chatId"],
              properties: { chatId: { type: "string", pattern: "^-?\\d{1,20}$" } },
            },
            { chatId: "123456789" },
          ),
        },
        responses: {
          "200": {
            description: "Token del chat.",
            content: json({
              type: "object",
              required: ["token"],
              properties: { token: { type: "string", description: "JWT HS256 de 15 minutos." } },
            }),
          },
          "400": error("`chatId` con formato inválido.", "Datos inválidos"),
          "401": error("Falta la clave interna o es incorrecta.", "No autorizado"),
          "404": error("El chat no está vinculado a ninguna cuenta.", "Chat no vinculado"),
          "429": tooManyRequests,
          "500": error("Error del servidor.", "Error al generar el token"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Token devuelto por `POST /auth/login` o `POST /auth/register`. Todas las rutas con este esquema pueden responder 401 (token ausente, inválido, vencido o sesión revocada) y, si falla la verificación de la sesión contra la base, 500 `Error al validar la sesión`.",
      },
      internalKey: {
        type: "apiKey",
        in: "header",
        name: "x-internal-key",
        description: "Clave compartida entre la API y el bot de Telegram (`INTERNAL_API_KEY`).",
      },
    },
    responses: {
      Unauthorized: {
        description: "Falta el token, es inválido o venció, o la sesión fue revocada.",
        content: {
          "application/json": {
            schema: ref("Error"),
            examples: {
              sinToken: { value: { error: "No autorizado" } },
              tokenInvalido: { value: { error: "Token inválido o expirado" } },
              sesionRevocada: { value: { error: "La sesión ya no es válida" } },
            },
          },
        },
      },
      TooManyRequests: {
        description: "Se superó el límite de intentos de este endpoint.",
        headers: {
          "Retry-After": {
            description: "Segundos hasta que se pueda volver a intentar.",
            schema: { type: "integer" },
          },
        },
        content: json(ref("Error"), { error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." }),
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
      Success: {
        type: "object",
        required: ["success"],
        properties: { success: { type: "boolean", example: true } },
      },
      HealthDb: {
        type: "object",
        required: ["status", "db"],
        properties: {
          status: { type: "string", enum: ["ok", "error"] },
          db: { type: "string", enum: ["ok", "error"] },
        },
      },
      UserBasic: {
        type: "object",
        required: ["id", "email"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
        },
      },
      UserWithTimezone: {
        type: "object",
        required: ["id", "email", "timezone"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          timezone: { type: "string", example: "America/Argentina/Buenos_Aires" },
        },
      },
      RegisterResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string", description: "JWT HS256 de 7 días." },
          user: ref("UserWithTimezone"),
        },
      },
      LoginResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string", description: "JWT HS256 de 7 días." },
          user: ref("UserBasic"),
        },
      },
      TelegramLink: {
        type: "object",
        required: ["chatId", "linkedAt"],
        properties: {
          chatId: { type: "string", example: "123456789" },
          linkedAt: { type: "string", format: "date-time" },
        },
      },
      Category: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "comida" },
          icon: { type: "string", nullable: true, example: "utensils" },
          monthly_budget: {
            type: "string",
            nullable: true,
            description: "numeric(12,2) de Postgres devuelto como string (por ejemplo \"1500.00\"), o null.",
          },
        },
      },
      Expense: {
        type: "object",
        required: ["id", "amount", "category_id", "source", "expense_date", "created_at"],
        properties: {
          id: { type: "string", format: "uuid" },
          amount: { type: "number", example: 1850.5 },
          category_id: { type: "string", format: "uuid" },
          description: { type: "string", nullable: true },
          source: { type: "string", enum: ["web", "telegram"] },
          expense_date: { type: "string", format: "date", example: "2026-10-22" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      NewExpense: {
        type: "object",
        required: ["amount", "categoryId", "source"],
        properties: {
          amount: {
            type: "number",
            minimum: 0.01,
            maximum: 9999999999.99,
            description: "Mayor que 0, hasta 2 decimales.",
          },
          categoryId: { type: "string", format: "uuid", description: "`id` de una categoría de `GET /categories`." },
          description: { type: "string", nullable: true, maxLength: 200 },
          source: { type: "string", enum: ["web", "telegram"] },
        },
      },
      UpdateExpense: {
        type: "object",
        minProperties: 1,
        properties: {
          amount: { type: "number", minimum: 0.01, maximum: 9999999999.99 },
          categoryId: { type: "string", format: "uuid" },
          description: { type: "string", nullable: true, maxLength: 200 },
        },
      },
      Income: {
        type: "object",
        required: ["id", "amount", "source", "income_date", "created_at"],
        properties: {
          id: { type: "string", format: "uuid" },
          amount: { type: "number", example: 250000 },
          description: { type: "string", nullable: true },
          source: { type: "string", enum: ["web", "telegram"] },
          income_date: { type: "string", format: "date", example: "2026-10-22" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      NewIncome: {
        type: "object",
        required: ["amount", "source"],
        properties: {
          amount: { type: "number", minimum: 0.01, maximum: 9999999999.99, description: "Mayor que 0, hasta 2 decimales." },
          description: { type: "string", nullable: true, maxLength: 200 },
          source: { type: "string", enum: ["web", "telegram"] },
        },
      },
      UpdateIncome: {
        type: "object",
        minProperties: 1,
        properties: {
          amount: { type: "number", minimum: 0.01, maximum: 9999999999.99 },
          description: { type: "string", nullable: true, maxLength: 200 },
        },
      },
      Balance: {
        type: "object",
        required: ["balance", "totalIncome", "totalExpenses"],
        properties: {
          balance: { type: "number", example: 190818.25 },
          totalIncome: { type: "number", example: 250000 },
          totalExpenses: { type: "number", example: 59181.75 },
        },
      },
      TrendPoint: {
        type: "object",
        required: ["bucket", "income", "expenses"],
        properties: {
          bucket: { type: "string", format: "date", description: "Primer día del período." },
          income: { type: "number" },
          expenses: { type: "number" },
        },
      },
      PushSubscription: {
        type: "object",
        required: ["endpoint", "keys"],
        properties: {
          endpoint: { type: "string", format: "uri", maxLength: 2048, description: "URL https del servicio de push del navegador." },
          keys: {
            type: "object",
            required: ["p256dh", "auth"],
            properties: {
              p256dh: { type: "string", minLength: 80, maxLength: 100, description: "Base64url." },
              auth: { type: "string", minLength: 16, maxLength: 32, description: "Base64url." },
            },
          },
        },
      },
    },
  },
};
