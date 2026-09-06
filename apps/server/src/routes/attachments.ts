import type { FastifyInstance } from "fastify";
import { listAttachmentsByTransaction } from "../db.js";

export async function attachmentRoutes(app: FastifyInstance) {
  /** `?transactionIds=id1,id2,id3` -> `{ id1: [...], id2: [...] }` */
  app.get<{ Querystring: { transactionIds?: string } }>("/api/v1/attachments", async (req) => {
    const ids = (req.query.transactionIds ?? "").split(",").filter(Boolean);
    const map = listAttachmentsByTransaction(ids);
    return Object.fromEntries(map);
  });
}
