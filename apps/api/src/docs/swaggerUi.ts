import { createRequire } from "node:module";
import { join } from "node:path";
import { Router } from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import { openapi } from "./openapi.js";

const swaggerUiDir = (
  createRequire(import.meta.url)(
    "swagger-ui-dist/absolute-path.js",
  ) as () => string
)();

// Solo se sirven los archivos que Swagger UI necesita, no todo el paquete.
const ASSETS = [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "favicon-16x16.png",
  "favicon-32x32.png",
];

const ALL_METHODS = ["get", "put", "post", "delete", "options", "head", "patch"];

// En producción la documentación es solo de lectura: sin "Try it out" y sin
// Authorize, para que nadie dispare pedidos contra la API real desde acá.
const isReadOnly = () => process.env.NODE_ENV === "production";

export const docsRouter = Router();

// Swagger UI necesita estilos en línea y su propio script, que la política del
// resto de la API (default-src 'none') no permite. Se relaja solo para /docs:
// este router se monta antes del helmet global y responde él mismo, así que la
// política estricta de las demás rutas no cambia.
docsRouter.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

function index(_req: Request, res: Response) {
  const hideAuthorize = isReadOnly()
    ? "<style>.swagger-ui .auth-wrapper,.swagger-ui .authorization__btn{display:none}</style>"
    : "";
  res.type("html").send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Control de Gastos API</title>
    <link rel="icon" type="image/png" href="/docs/favicon-32x32.png" />
    <link rel="stylesheet" href="/docs/swagger-ui.css" />
    ${hideAuthorize}
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js"></script>
    <script src="/docs/init.js"></script>
  </body>
</html>
`);
}

docsRouter.get("/", index);

docsRouter.get("/openapi.json", (_req, res) => {
  res.json(openapi);
});

docsRouter.get("/init.js", (_req, res) => {
  const methods = isReadOnly() ? [] : ALL_METHODS;
  res.type("js").send(`window.ui = SwaggerUIBundle({
  url: "/docs/openapi.json",
  dom_id: "#swagger-ui",
  deepLinking: true,
  docExpansion: "list",
  supportedSubmitMethods: ${JSON.stringify(methods)},
});
`);
});

for (const file of ASSETS) {
  docsRouter.get(`/${file}`, (_req, res) => {
    res.sendFile(join(swaggerUiDir, file));
  });
}
