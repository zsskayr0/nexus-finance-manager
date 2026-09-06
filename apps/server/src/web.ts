import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { WEB_DIR } from "./config.js";

/**
 * Serve o build estático do frontend (`apps/desktop`, mesmo código do
 * cliente Tauri) direto do servidor — na pegada do Immich: abrir
 * `http://<servidor>:7023` no navegador (PC ou celular) já mostra o app
 * inteiro, sem precisar instalar nada. O `.exe`/`.apk` continuam existindo
 * como alternativa "nativa", mas não são obrigatórios.
 *
 * Fallback pra `index.html` em qualquer rota que não seja um arquivo
 * estático nem `/api/v1/...`/`/health` — é uma SPA, então uma rota tipo
 * `/dashboard` direto na barra de endereço também precisa cair no mesmo
 * `index.html` (o roteamento é todo interno, em `App.tsx`).
 */
export async function registerWeb(app: FastifyInstance): Promise<void> {
  if (!existsSync(join(WEB_DIR, "index.html"))) {
    app.log.warn(`Frontend não encontrado em ${WEB_DIR} — servidor rodando só como API, sem interface web em "/".`);
    return;
  }

  await app.register(fastifyStatic, { root: WEB_DIR });

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith("/api/v1") || request.raw.url === "/health") {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    reply.sendFile("index.html");
  });
}
