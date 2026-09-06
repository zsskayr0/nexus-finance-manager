# Nexus — ecossistema de gestão financeira

Monorepo pnpm com a lógica compartilhada entre o app Desktop (Tauri) e o
futuro app Mobile (React Native).

```
nexus/
├── packages/
│   └── core/          → schema SQL, tipos Zod, CSV, recorrências, parsing de OCR
├── apps/
│   ├── desktop/        → Tauri + React + Tailwind (rodando)
│   └── mobile/          → ainda não scaffolded (ver apps/mobile/README.md)
```

## Status atual

- ✅ `@nexus/core` — schema, tipos, formatação, CSV, recorrências e parsing de
  OCR heurístico. 20 testes (`vitest`), 100% passando.
- ✅ `@nexus/desktop` — app Tauri completo:
  - Painel com KPIs, gráfico de linha (saldo acumulado), rosca (gastos por
    categoria) e barras (receitas x despesas), todos calculados a partir de
    dados reais do SQLite (não mockados).
  - Transações com alternador Lista/Tabela, ordenação por coluna e filtros
    rápidos (Todas/Receitas/Despesas).
  - Formulário de novo lançamento.
  - Backup & CSV: escolha de pasta (diálogo nativo), exportação manual e um
    worker em background (heartbeat do lado Rust a cada 5 min) que roda a
    exportação automática a cada 12h enquanto o app está aberto.
  - Recorrências / Categorias / Configurações: telas placeholder ("Em breve")
    — a lógica de recorrência já existe em `@nexus/core`, falta só a UI.
- ⏳ `apps/mobile` — não iniciado (precisa de Android SDK/Xcode neste
  ambiente; ver `apps/mobile/README.md` para o plano).

## Rodando o Desktop

Pré-requisitos: Node 20+, pnpm, Rust (via [rustup](https://rustup.rs)) — nesta
máquina já foram instalados nesta sessão.

```bash
pnpm install
pnpm build:core       # compila @nexus/core (necessário antes do primeiro dev:desktop)
pnpm dev:desktop       # abre a janela do Nexus com hot-reload
```

`pnpm dev:desktop` abre uma janela nativa de verdade — rode você mesmo pelo
terminal para ver a interface (esta sessão só validou com `cargo check` e
`vite build`, sem abrir a janela).

Para gerar o instalador:

```bash
pnpm build:desktop
```

## Banco de dados

SQLite local (`nexus.db`, na pasta de dados do app). O schema é aplicado
automaticamente via migration no boot (`packages/core/src/schema.sql` →
embutido no binário Rust). Categorias padrão são semeadas na primeira
execução; transações começam vazias — use "Novo lançamento" ou "Carregar
dados de exemplo" no estado vazio do painel.

## Próximos passos sugeridos

1. Rodar `pnpm dev:desktop` e revisar a interface de verdade.
2. Telas de Recorrências e Categorias (CRUD completo).
3. Scaffold do Mobile (`apps/mobile`) quando Android Studio estiver disponível.
4. Endurecer o backup: registrar tarefa no agendador do SO para rodar mesmo
   com o app fechado.
