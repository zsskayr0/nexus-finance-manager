# Nexus — plano de arquitetura cliente-servidor

Status: proposta, aguardando aprovação. Nada neste documento foi implementado ainda.

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
└─────────────────────┘                                  │  SQLite (better-sqlite3) │
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
- **Banco**: SQLite via `better-sqlite3`, não Postgres — app de usuário único, sem motivo pra
  motor mais pesado; simplifica o Docker (um container só, sem serviço de banco separado).
- **Migrations**: as mesmas migrations `.sql` já existentes em
  `apps/desktop/src-tauri/migrations/` são reaproveitadas (movidas ou copiadas pro servidor),
  aplicadas por um runner simples no boot do servidor. A regra de "migration nunca muda depois
  de aplicada" continua valendo.
- **Lógica que hoje mora em `apps/desktop/src/lib/{db,recurring,aggregate}.ts`** (ex.:
  `settleOccurrence`, `deleteOccurrenceOnly`, os agregadores do Painel) migra pro servidor —
  ela sempre leu/escreveu no banco, então pertence a quem é dono do banco agora. O cliente passa
  a chamar endpoints (`POST /recurring-transactions/:id/settle`) em vez de rodar essas funções
  localmente.
- **API**: REST versionada (`/api/v1/...`), um recurso por entidade — `transactions`,
  `categories`, `accounts`, `payees`, `recurring-transactions`, `pending-items`, `attachments`,
  `backup-settings` — espelhando 1:1 as funções que já existem em `lib/db.ts` hoje. Sem GraphQL,
  sem over-engineering — é uma API pequena pra um app pessoal.
- **Autenticação**: uma API key simples (variável de ambiente, enviada num header) — o
  suficiente pra não deixar a API totalmente aberta pra quem tiver acesso à rede local, sem a
  complexidade de um sistema de login completo (não parece necessário pra um app de usuário
  único). Pode evoluir depois se um dia tiver multiusuário.
- **Anexos**: guardados num diretório dentro do mesmo volume Docker (`/data/attachments`), não
  mais via `@tauri-apps/plugin-fs` local.
- **Docker**: um `Dockerfile` (build multi-stage: compila TS, roda com `node`), expondo `7023`,
  com um volume nomeado (`/data`) pro arquivo SQLite + anexos persistirem entre reinícios do
  container. Um `docker-compose.yml` de conveniência na raiz do repo (`docker compose up -d`).

## 2. Cliente (`apps/desktop`, adaptado)

- Remove `@tauri-apps/plugin-sql` e as migrations locais — o cliente não guarda mais dado
  nenhum, só fala com o servidor.
- `lib/db.ts` vira um cliente HTTP (`fetch` contra `http://<host>:7023/api/v1/...`) com a MESMA
  assinatura de funções que já existe hoje (`listTransactions`, `insertTransaction` etc.) — o
  resto do app (páginas, componentes) não muda quase nada, porque já é tudo desacoplado atrás
  dessas funções.
- Nova tela/campo de configuração: endereço do servidor (padrão `localhost:7023`, mas
  configurável — o servidor pode estar rodando em outra máquina da rede).
- **Android**: adicionar o target mobile do Tauri 2 (`tauri android init` + build) em cima do
  mesmo `apps/desktop` — não é um app novo, é uma segunda plataforma de build do mesmo código.

## 3. Migração dos dados reais existentes

Um script Node autônomo (`scripts/migrate-local-to-server.ts`), rodado uma vez:

1. Abre o `nexus.db` atual (`%APPDATA%\com.nexus.desktop\nexus.db`) direto via `better-sqlite3`
   (sem precisar do Tauri rodando).
2. Lê todas as tabelas, na ordem de dependência (categorias/contas/pagadores primeiro,
   depois transações/recorrências/pendências, preservando os IDs originais pra manter os
   vínculos entre tabelas).
3. Envia tudo pro servidor via um endpoint de importação em lote (`POST /api/v1/import`) —
   um caminho separado das rotas normais de CRUD, feito só pra essa migração única.
4. Roda com `--dry-run` primeiro (mostra o que seria migrado, sem gravar nada) antes do
   `--apply` de verdade — dado financeiro real merece essa checagem.

## 4. Escopo das releases

Dois artefatos, duas tags, dois `gh release create` separados:

- `server-vX.Y.Z` — imagem Docker publicada no GitHub Container Registry (`ghcr.io`) +
  `Dockerfile`/`docker-compose.yml` como assets da release.
- `client-vX.Y.Z` — instalador Windows (`.msi`, gerado pelo `tauri build`) + `.apk` Android
  (gerado pelo `tauri android build`), os dois anexados na mesma release de cliente.

Nesta fase alpha, os builds continuam manuais (como fizemos com a `v0.1.0-alpha.1`); dá pra
automatizar depois com GitHub Actions quando o formato estabilizar.

## Ordem de execução sugerida

1. Criar `apps/server` com o esqueleto Fastify + SQLite + as migrations copiadas, rodando local
   (sem Docker ainda) — validar a API contra o schema atual.
2. Adaptar `apps/desktop/src/lib/db.ts` pra falar com essa API (mantendo as mesmas assinaturas),
   confirmar que o app inteiro continua funcionando ponta a ponta contra o servidor local.
3. Escrever o `Dockerfile` + `docker-compose.yml`, validar que o servidor sobe limpo em
   container com um volume persistente.
4. Escrever e testar o script de migração (`--dry-run` primeiro) contra uma CÓPIA do banco
   real — nunca contra o arquivo original.
5. Adicionar o target Android do Tauri em cima do `apps/desktop` já adaptado.
6. Cortar as duas releases (`server-v0.1.0-alpha.1`, `client-v0.1.0-alpha.1`).

## Riscos / pontos de atenção

- O desktop deixa de funcionar sem rede/servidor no ar — é a troca explícita que foi aceita,
  mas vale ter isso claro (hoje funciona 100% offline, depois da mudança não funciona mais).
- Suporte mobile do Tauri 2 ainda é mais novo que o desktop — pode aparecer alguma limitação de
  plugin/WebView no Android que não existe hoje; a etapa 5 é onde isso apareceria.
- A migração de dados reais (etapa 4) é o passo mais sensível do plano — por isso o
  `--dry-run` obrigatório antes de qualquer escrita no servidor.
