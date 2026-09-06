# Nexus — ecossistema de gestão financeira

Monorepo pnpm: um servidor (dono único dos dados) e um cliente (mesmo código
React, empacotado pra Windows e Android via Tauri).

```
nexus/
├── packages/
│   └── core/     → schema SQL (documentação), tipos Zod, CSV, recorrências, parsing de OCR
├── apps/
│   ├── server/    → API REST (Fastify + node:sqlite), Docker, porta 7023 — dono dos dados
│   └── desktop/   → cliente Tauri + React + Tailwind — Windows e Android (gen/android)
└── docs/
    └── server-client-architecture-plan.md → arquitetura completa
```

## Status atual

- ✅ `@nexus/core` — schema, tipos, formatação, CSV, recorrências e parsing de OCR heurístico.
- ✅ `@nexus/server` — API REST completa (categorias, contas, pagadores, transações, recorrências,
  pendências, anexos, backup, reset), SQLite via `node:sqlite` (sem dependência nativa pra
  compilar), migrations aplicadas automaticamente no boot, Docker + `docker-compose.yml`.
- ✅ `@nexus/desktop` — app completo: Painel, Transações, Recorrências, Fluxo de Trabalho
  (calendário com arrastar-e-soltar), Contas, Categorias (CRUD + análise comparativa), Backup &
  CSV, Configurações (endereço do servidor). Cliente HTTP fino — não guarda mais banco local,
  fala com `@nexus/server` pela rede. Target Android inicializado (`apps/desktop/src-tauri/gen/android`).
- ✅ Script de migração (`scripts/migrate-local-to-server.mjs`) — traz os dados de uma instalação
  antiga (SQLite local do Tauri) pro servidor, com `--dry-run` obrigatório antes de gravar.

## Rodando

### 1. Suba o servidor (Docker)

```bash
docker compose up -d --build
```

Sobe em `http://localhost:7023`. Sem chave de API por padrão (ok em localhost/rede confiável) —
ver `apps/server/README.md` pra proteger com uma chave antes de expor a porta pra fora da rede.

### 2. Rode o cliente Desktop

```bash
pnpm install
pnpm build:core        # compila @nexus/core (dependência do desktop e do server)
pnpm dev:desktop        # abre a janela do Nexus com hot-reload
```

Por padrão o cliente aponta pra `http://localhost:7023` — ajustável em Configurações, dentro do
app, se o servidor rodar em outra máquina da rede.

### 3. (Opcional) Migre dados de uma instalação antiga

Se você já usava uma versão anterior do Nexus (SQLite local, sem servidor):

```bash
node scripts/migrate-local-to-server.mjs --dry-run   # só mostra o que seria migrado
node scripts/migrate-local-to-server.mjs --apply     # grava de verdade no servidor
```

### Gerando instaladores

```bash
pnpm build:desktop                                    # Windows (.msi/.exe)
cd apps/desktop && pnpm tauri android build --apk     # Android (.apk)
```

## Banco de dados

Mora só no servidor (`apps/server`, volume Docker `/data/nexus.db`) — os clientes não guardam
mais nada localmente. Schema documentado em `packages/core/src/schema.sql`; migrations de verdade
(aplicadas de fato) em `apps/server/migrations/`, uma por versão, nunca editadas depois de
aplicadas — sempre um arquivo novo pra qualquer mudança de schema.

## Arquitetura

Ver [`docs/server-client-architecture-plan.md`](docs/server-client-architecture-plan.md) pro
plano completo (decisões, API, Docker, migração, releases).
