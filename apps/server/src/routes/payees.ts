import type { FastifyInstance } from "fastify";
import { findOrCreatePayee, listPayees } from "../db.js";

export async function payeeRoutes(app: FastifyInstance) {
  app.get("/api/v1/payees", async () => listPayees());

  app.post<{ Body: { name: string } }>("/api/v1/payees/find-or-create", async (req) => {
    const id = findOrCreatePayee(req.body.name);
    return { id };
  });
}
