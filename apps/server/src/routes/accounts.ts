import type { FastifyInstance } from "fastify";
import type { NewAccount } from "@nexus/core";
import { deleteAccountKeepingHistory, insertAccount, listAccounts, updateAccount } from "../db.js";

export async function accountRoutes(app: FastifyInstance) {
  app.get("/api/v1/accounts", async () => listAccounts());

  app.post<{ Body: NewAccount }>("/api/v1/accounts", async (req, reply) => {
    const id = insertAccount(req.body);
    reply.code(201).send({ id });
  });

  app.put<{ Params: { id: string }; Body: NewAccount }>("/api/v1/accounts/:id", async (req, reply) => {
    updateAccount(req.params.id, req.body);
    reply.code(204).send();
  });

  app.delete<{ Params: { id: string } }>("/api/v1/accounts/:id", async (req, reply) => {
    deleteAccountKeepingHistory(req.params.id);
    reply.code(204).send();
  });
}
