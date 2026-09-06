import type { FastifyInstance } from "fastify";
import { getBackupSettings, listBackupLog, recordBackupResult, saveBackupDirectory, setBackupEnabled } from "../db.js";

/**
 * Só a configuração/histórico de backup por enquanto — a rotina que
 * efetivamente exporta o CSV (hoje em `apps/desktop/src/lib/backup.ts`)
 * ainda roda no cliente; migrar essa gravação de arquivo pro servidor
 * (que agora tem o volume `/data`) fica pra uma próxima etapa.
 */
export async function backupRoutes(app: FastifyInstance) {
  app.get("/api/v1/backup-settings", async () => getBackupSettings());

  app.post<{ Body: { directory: string; frequencyHours?: number } }>("/api/v1/backup-settings", async (req, reply) => {
    saveBackupDirectory(req.body.directory, req.body.frequencyHours);
    reply.code(204).send();
  });

  app.patch<{ Body: { enabled: boolean } }>("/api/v1/backup-settings/enabled", async (req, reply) => {
    setBackupEnabled(req.body.enabled);
    reply.code(204).send();
  });

  app.get<{ Querystring: { limit?: number } }>("/api/v1/backup-log", async (req) => listBackupLog(req.query.limit ? Number(req.query.limit) : undefined));

  app.post<{
    Body: { status: "success" | "failed"; filePath: string | null; rowsExported: number | null; errorMessage: string | null };
  }>("/api/v1/backup-log", async (req, reply) => {
    recordBackupResult(req.body);
    reply.code(204).send();
  });
}
