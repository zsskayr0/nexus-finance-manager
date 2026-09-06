# @nexus/server

Servidor do Nexus — dono único dos dados, expõe uma API REST na porta `7023` pros clientes
(Windows, Android) consumirem pela rede. Ver [docs/server-client-architecture-plan.md](../../docs/server-client-architecture-plan.md)
pra arquitetura completa.

- **Stack**: Node.js + Fastify + TypeScript, reaproveitando `@nexus/core` (schemas Zod, regras de
  negócio) direto do monorepo.
- **Banco**: SQLite via `node:sqlite` (módulo embutido do Node — zero dependência nativa pra
  compilar, sem dor de cabeça de `node-gyp`/Visual Studio no Windows).
- **Migrations**: as mesmas `.sql` do Desktop (`apps/desktop/src-tauri/migrations/`), copiadas
  pra `migrations/` — aplicadas automaticamente no boot, uma vez cada, nunca mudam depois.

## Rodando local (sem Docker)

```bash
pnpm --filter @nexus/core build   # @nexus/server importa o core já buildado
pnpm --filter @nexus/server dev   # sobe em http://localhost:7023, recarrega ao salvar
```

Sem `NEXUS_API_KEY` definida, o servidor sobe sem autenticação (avisa no log) — bom pra testar
local, nunca pra expor a porta fora da sua rede.

## Rodando via Docker

```bash
docker compose up -d --build
```

Isso builda a imagem (`apps/server/Dockerfile`), sobe o container na porta `7023` com um volume
nomeado (`nexus-data`) persistindo `/data` (o `nexus.db` + anexos) entre reinícios. Edite a
`NEXUS_API_KEY` no `docker-compose.yml` antes de expor isso fora do `localhost`.

## Variáveis de ambiente

| Variável          | Padrão                      | O que faz                                              |
|-------------------|-----------------------------|---------------------------------------------------------|
| `PORT`             | `7023`                      | Porta HTTP                                               |
| `HOST`             | `0.0.0.0`                   | Interface de bind                                        |
| `NEXUS_DATA_DIR`   | `./data` (`/data` no Docker)| Onde ficam `nexus.db` e os anexos                        |
| `NEXUS_API_KEY`    | *(nenhuma)*                 | Header `x-api-key` exigido em toda rota (exceto `/health`) se definida |

## API

REST, versionada em `/api/v1/...`, um recurso por entidade — `categories`, `payees`, `accounts`,
`transactions`, `pending-items`, `recurring-transactions`, `recurring-exclusions`, `attachments`,
`backup-settings`. Ver os arquivos em `src/routes/` — cada um é pequeno e espelha 1:1 as funções
que existiam em `apps/desktop/src/lib/db.ts`.

## O que ainda não está aqui

- A rotina que efetivamente grava o CSV de backup no disco (hoje roda no cliente Desktop) ainda
  não foi migrada pra cá — só a configuração (`backup-settings`, `backup-log`) já existe.
- Validação de schema nas rotas (hoje é só TypeScript em tempo de build); dá pra reforçar com os
  schemas Zod que já existem em `@nexus/core`.
- Script de migração dos dados reais do SQLite local do Desktop pra este servidor (etapa 4 do
  plano de arquitetura).
