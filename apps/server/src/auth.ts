import type { FastifyInstance } from "fastify";
import { API_KEY } from "./config.js";

/**
 * Barreira simples: se `NEXUS_API_KEY` estiver definida, toda rota de API
 * (`/api/v1/...`) exige o header `x-api-key` com o mesmo valor. `/health` e
 * a interface web estática (servida em `/`, ver web.ts) nunca exigem chave
 * — a página em si é pública (como a tela de login do Immich), só as
 * chamadas de dado é que precisam da chave, e essas o próprio app já manda
 * com o header quando configurada em Configurações. Sem a variável
 * definida, roda sem checagem — pensado pra rodar num container isolado por
 * trás de uma rede confiável, não uma API pública multiusuário.
 */
export function registerAuth(app: FastifyInstance): void {
  if (!API_KEY) {
    app.log.warn("NEXUS_API_KEY não definida — servidor rodando SEM autenticação. Não exponha essa porta fora da sua rede local.");
    return;
  }

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/v1")) return;
    const provided = request.headers["x-api-key"];
    if (provided !== API_KEY) {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
}
