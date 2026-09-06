import type { FastifyInstance } from "fastify";
import { createCategory, deleteCategoryKeepingHistory, listCategories, updateCategory } from "../db.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/api/v1/categories", async () => listCategories());

  app.post<{ Body: { name: string; type: "income" | "expense" | "both"; icon: string | null; color: string } }>(
    "/api/v1/categories",
    async (req, reply) => {
      const id = createCategory(req.body);
      reply.code(201).send({ id });
    },
  );

  app.put<{ Params: { id: string }; Body: { name: string; type: "income" | "expense" | "both"; icon: string | null; color: string } }>(
    "/api/v1/categories/:id",
    async (req, reply) => {
      updateCategory(req.params.id, req.body);
      reply.code(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>("/api/v1/categories/:id", async (req, reply) => {
    deleteCategoryKeepingHistory(req.params.id);
    reply.code(204).send();
  });
}
