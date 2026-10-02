import "dotenv/config";
import { app } from "./app.js";
import { logError } from "./lib/logger.js";

const PORT = process.env.PORT || 3000;

// Una promesa rechazada sin manejar se registra, sin datos de la causa.
process.on("unhandledRejection", (reason) => logError(reason, "unhandledRejection"));

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});
