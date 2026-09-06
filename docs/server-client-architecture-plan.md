# Nexus — plano de arquitetura cliente-servidor

Status: **implementado** (etapas 1-4 e 6 da ordem de execução abaixo; etapa 5 — Android —
inicializada, build em andamento/validação). Este documento descreve tanto a decisão original
quanto os ajustes feitos durante a implementação (marcados abaixo).

## Objetivo

Hoje o Nexus é um único app Tauri (`apps/desktop`) com SQLite embutido (`tauri-plugin-sql`),
100% offline. O pedido é dividir isso em dois escopos de release:

1. **Servidor** — roda em Docker, porta `7023`, dono único dos dados.
2. **Cliente** — fala com o servidor pela rede; existe em duas plataformas (Windows e Android),
   mesmo código-fonte.

Decisões já confirmadas com o usuário:
- O servidor é a **única fonte de verdade** — os clientes viram "clientes finos" (sem SQLite
  próprio) e só funcionam com o servidor no ar.
- Os dados reais já lançados no SQLite local do Windows serão **migrados uma vez** pro servidor.

## Visão geral

```
┌─────────────────────┐        HTTP (porta 7023)        ┌──────────────────────────┐
│  Cliente Windows     │ ───────────────────────────────▶│  Servidor (Docker)       │
│  (Tauri desktop)     │◀─────────────────────────────── │  Node + Fastify          │
└─────────────────────┘                                  │  SQLite (node:sqlite)    │
┌─────────────────────┐                                  │  volume /data            │
│  Cliente Android     │ ───────────────────────────────▶│                          │
│  (Tauri mobile)      │◀─────────────────────────────── │                          │
└─────────────────────┘                                  └──────────────────────────┘
```

Os dois clientes usam **o mesmo código-fonte React** (`apps/desktop/src`) — Tauri 2 builda o
mesmo frontend pra Windows (`.msi`/`.exe`) e Android (`.apk`), trocando só o shell nativo. Isso
substitui o plano original de um app React Native/Expo separado em `apps/mobile` — como o
cliente deixa de ter banco local, a parte difícil de um app mobile nativo (bindings de SQLite no
Android) desaparece, e não faz mais sentido manter dois códigos de frontend. `apps/mobile` seria
descontinuado em favor de `apps/desktop` + target Android do Tauri.

## 1. Servidor (`apps/server`, novo pacote)

- **Stack**: Node.js + Fastify + TypeScript, reaproveitando `@nexus/core` direto (mesmos
  schemas Zod, `recurrence.ts`, `csv.ts` etc. — zero duplicação de lógica de negócio).
- **Banco**: SQLite via **`node:sqlite`** (módulo embutido do próprio Node — não Postgres, e não
  `better-sqlite3` como cogitado originalmente). Mudança feita na hora de implementar:
  `better-sqlite3` falhou pra instalar no Windows local por falta de Visual Studio Build Tools
  (compilação nativa via node-gyp) — problema que também apareceria pra qualquer outra máquina
  sem esse toolchain. `node:sqlite` não compila nada (só emite um aviso de "experimental" no
  log, inofensivo), funciona igual local e no Docker.
- **Migrations**: as mesmas migrations `.sql` de `apps/desktop/src-tauri/migrations/` foram
  copiadas pro servidor (`apps/server/migrations/`) e **a cópia do lado do Desktop foi removida**
  — o cliente não abre banco nenhum mais, então não faz sentido ele carregar migrations. Aplicadas
  por um runner simples no boot do servidor (tabela `_migrations` própria, nada a ver com o
  mecanismo do `tauri-plugin-sql`, que também foi removido do Desktop).
- **Lógica que ficou no cliente, ao contrário do que este documento cogitava originalmente**:
  `recurring.ts`/`aggregate.ts` (settleOccurrence, deleteOccurrenceOnly, os agregadores do
  Painel) **continuam no `apps/desktop`**, inalterados — são só sequências de chamadas à mesma
  API REST (que já cobre create/update/delete de cada entidade), então não precisavam de
  endpoints compostos no servidor. Simplifica a migração do cliente: só `lib/db.ts` mudou de
  implementação, o resto do app nem percebeu.
- **API**: REST versionada (`/api/v1/...`), um recurso por entidade — `transactions`,
  `categories`, `accounts`, `payees`, `recurring-transactions`, `recurring-exclusions`,
  `pending-items`, `attachments`, `backup-settings`, `backup-log` — espelhando 1:1 as funções que
  existiam em `lib/db.ts`. Mais um caminho separado, `/api/v1/import`, só pra migração em lote
  (preserva ids/timestamps originais, ao contrário do CRUD normal). Sem GraphQL, sem
  over-engineering.
- **Autenticação**: API key simples (header `x-api-key`, variável `NEXUS_API_KEY`) — **desligada
  por padrão** no `docker-compose.yml` (decisão tomada na implementação: forçar uma chave por
  padrão criava fricção real pro primeiro uso — cliente e servidor precisam concordar na mesma
  chave, e sem uma tela de configuração isso travava o app inteiro). Fica fácil de ligar depois
  (descomentar a variável no compose + preencher em Configurações no app) antes de expor a porta
  fora de uma rede confiável.
- **Anexos**: guardados num diretório dentro do mesmo volume Docker (`/data/attachments`), não
  mais via `@tauri-apps/plugin-fs` local.
- **Docker**: `Dockerfile` multi-stage (builda o monorepo inteiro, usa `pnpm deploy` pra extrair
  só o `@nexus/server` resolvido), expondo `7023`, com um volume nomeado (`/data`) pro `nexus.db`
  + anexos persistirem entre reinícios/recriações do container — **testado de verdade**: dado
  gravado sobrevive a `docker restart` e a `docker compose up -d --build` (recria o container).
  `docker-compose.yml` de conveniência na raiz do repo.

## 2. Cliente (`apps/desktop`, adaptado) ✅

- Removidos `@tauri-apps/plugin-sql`, a dependência no `Cargo.toml`, as permissões `sql:*` das
  capabilities, e a cópia local de `migrations/` — o cliente não guarda mais dado nenhum.
- `lib/db.ts` virou um cliente HTTP (`fetch` contra `<servidor>/api/v1/...`) com a MESMA
  assinatura de funções que existia (`listTransactions`, `insertTransaction` etc.) — o resto do
  app (páginas, componentes) não mudou, porque já era tudo desacoplado atrás dessas funções.
  `seed.ts` foi removido (seed de categorias/conta padrão agora é responsabilidade do servidor).
- Nova página **Configurações** (`pages/Settings.tsx`) — endereço do servidor + chave de API
  opcional, guardados em `localStorage` (`lib/serverConfig.ts`), com teste de conexão. Acessível
  mesmo quando o boot falha (é a válvula de escape pra corrigir o endereço sem editar nada fora
  do app).
- **Android**: `tauri android init` rodado em cima do `apps/desktop` já adaptado — mesmo código,
  gerado em `apps/desktop/src-tauri/gen/android` (gitignored). Precisou instalar targets Rust
  (`aarch64-linux-android` e companhia via `rustup target add`) e `cargo-ndk`; usou o Android
  SDK/NDK/JDK já presentes na máquina.

## 3. Migração dos dados reais existentes ✅

Script Node autônomo, `scripts/migrate-local-to-server.mjs` (`.mjs`, não `.ts` — roda direto sem
build):

1. Abre o `nexus.db` atual (`%APPDATA%\com.nexus.desktop\nexus.db` por padrão, ou `--source`) via
   `node:sqlite`, só leitura (`readOnly: true`) — nunca escreve no arquivo de origem.
2. Lê todas as tabelas, mapeia snake_case → camelCase, preservando ids e timestamps originais.
3. `--dry-run` (padrão, sem precisar passar nada) só mostra as contagens por tabela; `--apply`
   envia tudo pro servidor via `POST /api/v1/import` (idempotente — `INSERT OR REPLACE`, seguro
   de rodar de novo).

**Executado de verdade nesta implementação** — antes de tocar no banco real, foi tirada uma cópia
consistente via `VACUUM INTO` (segura mesmo com o app aberto e o WAL ativo) pra inspecionar sem
risco; o dry-run rodou contra essa cópia E contra o arquivo real (ainda só leitura) antes do
`--apply`. Resultado migrado e conferido: 9 categorias, 11 pagadores, 3 contas, 12 recorrências,
12 transações (R$ 3.282,58 em soma — bateu exatamente com a soma do arquivo de origem).

## 4. Escopo das releases

Dois artefatos, duas tags, dois `gh release create` separados:

- `server-vX.Y.Z` — imagem Docker publicada no GitHub Container Registry (`ghcr.io`) +
  `Dockerfile`/`docker-compose.yml` como assets da release.
- `client-vX.Y.Z` — instalador Windows (`.msi`, gerado pelo `tauri build`) + `.apk` Android
  (gerado pelo `tauri android build`), os dois anexados na mesma release de cliente.

Nesta fase alpha, os builds continuam manuais (como fizemos com a `v0.1.0-alpha.1`); dá pra
automatizar depois com GitHub Actions quando o formato estabilizar.

## Ordem de execução

1. ✅ Criar `apps/server` com o esqueleto Fastify + SQLite + as migrations copiadas, rodando
   local — validado com curl (CRUD completo) e depois em container Docker isolado.
2. ✅ Adaptar `apps/desktop/src/lib/db.ts` pra falar com essa API (mantendo as mesmas
   assinaturas) — confirmado ponta a ponta: o app real, com os dados reais migrados, roda
   contra o servidor em Docker (visto nos logs do servidor recebendo e respondendo 200 pra
   categorias/contas/transações/recorrências/pendências/exclusões).
3. ✅ `Dockerfile` + `docker-compose.yml` — validado com `docker compose up -d --build`/`down`,
   e persistência de dado através de `docker restart` e de recriação do container.
4. ✅ Script de migração testado com `--dry-run` (contra cópia via `VACUUM INTO` e contra o
   arquivo real, só leitura) antes do `--apply` de verdade contra o servidor rodando.
5. 🔄 Target Android do Tauri inicializado (`tauri android init`, rodou sem erro); primeiro
   build (`tauri android build --apk`) em andamento/validação — ver nota abaixo.
6. Cortar as duas releases (`server-v0.1.0-alpha.1`, `client-v0.1.0-alpha.1`) — servidor não
   depende da etapa 5; cliente Windows também não. O `.apk` entra na release de cliente quando
   (se) o build Android terminar limpo.

## Riscos / pontos de atenção

- O desktop deixa de funcionar sem rede/servidor no ar — é a troca explícita que foi aceita,
  mas vale ter isso claro (hoje funciona 100% offline, depois da mudança não funciona mais). A
  página Configurações fica acessível mesmo com o boot falhando, especificamente pra mitigar
  isso (trocar o endereço do servidor sem ficar travado numa tela de erro).
- Suporte mobile do Tauri 2 ainda é mais novo que o desktop — o SDK/NDK/JDK já estavam presentes
  nesta máquina (de outro projeto), o que ajudou a validar `tauri android init` rapidamente; o
  primeiro `build --apk` é tipicamente lento (Gradle baixando dependências pela primeira vez) —
  sem confirmação ainda de que terminou com sucesso no momento em que este documento foi escrito.
- A migração de dados reais foi o passo mais sensível do plano — mitigado com uma cópia via
  `VACUUM INTO` antes de qualquer leitura de verdade, e `--dry-run` conferido antes do `--apply`.
  Os números batem exatamente com a origem (ver seção 3).
- Decisão tomada durante a implementação, não prevista originalmente: autenticação por API key
  fica **desligada por padrão** (ver seção 1) — trade-off deliberado entre segurança e fricção de
  primeiro uso, documentado em `apps/server/README.md` e no próprio `docker-compose.yml`.
