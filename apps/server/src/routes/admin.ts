import type { FastifyInstance } from "fastify";
import { resetAllData } from "../db.js";
import { importAll, type ImportPayload } from "../import.js";
import { ensureDefaultAccount, ensureDefaultCategories } from "../seed.js";

export async function adminRoutes(app: FastifyInstance) {
  /** "Zona de perigo" — apaga tudo e repõe categorias/conta padrão, igual o botão equivalente do Desktop fazia localmente. */
  app.post("/api/v1/reset-all-data", async (_req, reply) => {
    resetAllData();
    ensureDefaultCategories();
    ensureDefaultAccount();
    reply.code(204).send();
  });

  /**
   * Caminho de importação em lote — só pra migração única dos dados do
   * SQLite local do Desktop (ver scripts/migrate-local-to-server.mjs).
   * Preserva ids e timestamps originais; idempotente (INSERT OR REPLACE).
   */
  app.post<{ Body: ImportPayload }>("/api/v1/import", async (req) => {
    return importAll(req.body);
  });
}
