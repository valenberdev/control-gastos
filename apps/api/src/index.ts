import "dotenv/config";
import { app } from "./app.js";
import { logError } from "./lib/logger.js";
import { assertSchemaUpToDate } from "./db/schema.js";

const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (reason) =>
  logError(reason, "unhandledRejection"),
);

try {
  await assertSchemaUpToDate();
} catch (err) {
  logError(err, "arranque");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});
