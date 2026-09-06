import type { FastifyInstance } from "fastify";
import {
  deleteRecurringKeepingHistory,
  deleteRecurringTransaction,
  duplicateRecurringTransaction,
  incrementInstallmentsGenerated,
  insertRecurringTransaction,
  listRecurringTransactions,
  unlinkTransactionsFromRecurring,
  updateRecurringTransaction,
  type NewRecurring,
} from "../db.js";

export async function recurringRoutes(app: FastifyInstance) {
  app.get("/api/v1/recurring-transactions", async () => listRecurringTransactions());

  app.post<{ Body: NewRecurring }>("/api/v1/recurring-transactions", async (req, reply) => {
    const id = insertRecurringTransaction(req.body);
    reply.code(201).send({ id });
  });

  app.put<{ Params: { id: string }; Body: NewRecurring }>("/api/v1/recurring-transactions/:id", async (req, reply) => {
    updateRecurringTransaction(req.params.id, req.body);
    reply.code(204).send();
  });

  /** Apaga a regra sem soltar vínculos primeiro — uso interno; o fluxo normal do cliente é `.../keeping-history`. */
  app.delete<{ Params: { id: string } }>("/api/v1/recurring-transactions/:id", async (req, reply) => {
    deleteRecurringTransaction(req.params.id);
    reply.code(204).send();
  });

  app.delete<{ Params: { id: string } }>("/api/v1/recurring-transactions/:id/keeping-history", async (req, reply) => {
    deleteRecurringKeepingHistory(req.params.id);
    reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/v1/recurring-transactions/:id/increment-installments", async (req, reply) => {
    incrementInstallmentsGenerated(req.params.id);
    reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/v1/recurring-transactions/:id/duplicate", async (req, reply) => {
    const id = duplicateRecurringTransaction(req.params.id);
    reply.code(201).send({ id });
  });

  app.post<{ Params: { id: string } }>("/api/v1/recurring-transactions/:id/unlink-transactions", async (req, reply) => {
    unlinkTransactionsFromRecurring(req.params.id);
    reply.code(204).send();
  });
}
