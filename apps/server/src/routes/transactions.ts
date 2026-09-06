import type { FastifyInstance } from "fastify";
import type { NewTransaction } from "@nexus/core";
import {
  deleteTransaction,
  deleteTransactions,
  insertTransaction,
  listTransactions,
  setTransactionDate,
  setTransactionReconciled,
  updateTransaction,
  type TransactionFilter,
} from "../db.js";

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: TransactionFilter }>("/api/v1/transactions", async (req) => listTransactions(req.query));

  app.post<{ Body: NewTransaction }>("/api/v1/transactions", async (req, reply) => {
    const id = insertTransaction(req.body);
    reply.code(201).send({ id });
  });

  app.put<{ Params: { id: string }; Body: NewTransaction }>("/api/v1/transactions/:id", async (req, reply) => {
    updateTransaction(req.params.id, req.body);
    reply.code(204).send();
  });

  app.delete<{ Params: { id: string } }>("/api/v1/transactions/:id", async (req, reply) => {
    deleteTransaction(req.params.id);
    reply.code(204).send();
  });

  app.post<{ Body: { ids: string[] } }>("/api/v1/transactions/bulk-delete", async (req, reply) => {
    deleteTransactions(req.body.ids);
    reply.code(204).send();
  });

  app.patch<{ Params: { id: string }; Body: { reconciled: boolean } }>("/api/v1/transactions/:id/reconciled", async (req, reply) => {
    setTransactionReconciled(req.params.id, req.body.reconciled);
    reply.code(204).send();
  });

  app.patch<{ Params: { id: string }; Body: { occurredAt: string } }>("/api/v1/transactions/:id/date", async (req, reply) => {
    setTransactionDate(req.params.id, req.body.occurredAt);
    reply.code(204).send();
  });
}
