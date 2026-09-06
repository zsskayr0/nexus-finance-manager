import Fastify from "fastify";
import { HOST, PORT } from "./config.js";
import { registerAuth } from "./auth.js";
import { ensureDefaultAccount, ensureDefaultCategories } from "./seed.js";
import { accountRoutes } from "./routes/accounts.js";
import { adminRoutes } from "./routes/admin.js";
import { attachmentRoutes } from "./routes/attachments.js";
import { backupRoutes } from "./routes/backup.js";
import { categoryRoutes } from "./routes/categories.js";
import { exclusionRoutes } from "./routes/exclusions.js";
import { payeeRoutes } from "./routes/payees.js";
import { pendingItemRoutes } from "./routes/pendingItems.js";
import { recurringRoutes } from "./routes/recurring.js";
import { transactionRoutes } from "./routes/transactions.js";

// Importar ./db.js aqui (via as rotas) já aplica as migrations e garante o
// arquivo SQLite — ver db.ts, que roda isso no import do módulo.
ensureDefaultCategories();
ensureDefaultAccount();

const app = Fastify({ logger: true });

registerAuth(app);

app.get("/health", async () => ({ ok: true }));

await app.register(categoryRoutes);
await app.register(payeeRoutes);
await app.register(accountRoutes);
await app.register(transactionRoutes);
await app.register(pendingItemRoutes);
await app.register(recurringRoutes);
await app.register(exclusionRoutes);
await app.register(attachmentRoutes);
await app.register(backupRoutes);
await app.register(adminRoutes);

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Nexus server rodando em http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
