import type { FastifyInstance } from "fastify";
import { addRecurringExclusion, listRecurringExclusions } from "../db.js";

export async function exclusionRoutes(app: FastifyInstance) {
  /** `{ items: ["recurringId:2026-09-05", ...] }` — pronto pra virar `new Set(items)` no cliente. */
  app.get("/api/v1/recurring-exclusions", async () => ({ items: listRecurringExclusions() }));

  app.post<{ Body: { recurringId: string; occurrenceDate: string } }>("/api/v1/recurring-exclusions", async (req, reply) => {
    addRecurringExclusion(req.body.recurringId, req.body.occurrenceDate);
    reply.code(204).send();
  });
}
