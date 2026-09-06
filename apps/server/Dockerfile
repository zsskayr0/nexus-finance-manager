# syntax=docker/dockerfile:1

# ---- build stage: instala o monorepo inteiro, builda core + server, e usa
# `pnpm deploy` pra extrair só o @nexus/server (com @nexus/core já resolvido
# como dependência normal) num diretório autocontido. ----
FROM node:22-bookworm-slim AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexus/core build
RUN pnpm --filter @nexus/server build
RUN pnpm --filter @nexus/server deploy --prod /deploy/server

# ---- runtime stage: só o necessário pra rodar, imagem final bem menor. ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

COPY --from=build /deploy/server ./

ENV NODE_ENV=production
ENV NEXUS_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 7023

CMD ["node", "dist/index.js"]
