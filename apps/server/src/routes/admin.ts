import type { FastifyInstance } from "fastify";
import { resetAllData } from "../db.js";
import { ensureDefaultAccount, ensureDefaultCategories } from "../seed.js";

/** "Zona de perigo" — apaga tudo e repõe categorias/conta padrão, igual o botão equivalente do Desktop fazia localmente. */
export async function adminRoutes(app: FastifyInstance) {
  app.post("/api/v1/reset-all-data", async (_req, reply) => {
    resetAllData();
    ensureDefaultCategories();
    ensureDefaultAccount();
    reply.code(204).send();
  });
}
