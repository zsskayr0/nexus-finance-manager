import type { FastifyInstance } from "fastify";
import type { NewPendingItem } from "@nexus/core";
import { deletePendingItem, insertPendingItem, listPendingItems } from "../db.js";

export async function pendingItemRoutes(app: FastifyInstance) {
  app.get("/api/v1/pending-items", async () => listPendingItems());

  app.post<{ Body: NewPendingItem }>("/api/v1/pending-items", async (req, reply) => {
    const id = insertPendingItem(req.body);
    reply.code(201).send({ id });
  });

  app.delete<{ Params: { id: string } }>("/api/v1/pending-items/:id", async (req, reply) => {
    deletePendingItem(req.params.id);
    reply.code(204).send();
  });
}
