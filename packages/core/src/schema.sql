-- Nexus — schema SQLite
-- Referência do schema COMPLETO e atual — documentação e fonte pro Mobile
-- (React Native) montar o banco do zero. Ver src/types.ts para os schemas Zod
-- equivalentes e src/csv.ts / src/recurrence.ts para as regras de negócio.
--
-- O Desktop (Tauri) NÃO lê este arquivo diretamente: cada versão de schema
-- vira uma migration congelada em apps/desktop/src-tauri/migrations/, porque
-- o plugin de SQL do Tauri rejeita o banco se o SQL de uma migration já
-- aplicada mudar de conteúdo. Ao alterar este arquivo, adicione também a
-- migration incremental correspondente (nunca edite uma migration antiga).

PRAGMA foreign_keys = ON;

-- Categorias de receita/despesa
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income','expense','both')) DEFAULT 'expense',
  icon        TEXT,
  color       TEXT NOT NULL DEFAULT '#419B91',
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Diretório de pagadores/recebedores (reutilizado por transações e recorrências)
CREATE TABLE IF NOT EXISTS payees (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  document    TEXT,                       -- CPF/CNPJ, quando o OCR captura
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contas bancárias (ou a "Carteira Física", pra dinheiro em espécie) — de
-- onde/pra onde o dinheiro de cada lançamento realmente sai/entra.
CREATE TABLE IF NOT EXISTS accounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  bank            TEXT,                     -- nome do banco
  agency          TEXT,                     -- agência (AG)
  account_number  TEXT,                     -- conta corrente (CC)
  color           TEXT NOT NULL DEFAULT '#8f8f96',  -- sugerida pelo banco escolhido no seletor, livre pra trocar
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lançamentos (fonte da verdade do extrato, dashboards e CSV)
CREATE TABLE IF NOT EXISTS transactions (
  id                        TEXT PRIMARY KEY,
  type                      TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount_cents              INTEGER NOT NULL,             -- valor em centavos, evita erro de ponto flutuante
  currency                  TEXT NOT NULL DEFAULT 'BRL',
  occurred_at               TEXT NOT NULL,                -- data do lançamento (ISO 8601, YYYY-MM-DD)
  description               TEXT NOT NULL,
  category_id               TEXT REFERENCES categories(id),
  payee_id                  TEXT REFERENCES payees(id),
  account_id                TEXT REFERENCES accounts(id),
  payment_method            TEXT CHECK (payment_method IN ('pix','pix_automatico','ted','cartao','dinheiro','boleto','outro')),
  notes                     TEXT,
  source                    TEXT NOT NULL DEFAULT 'manual'
                             CHECK (source IN ('manual','share_intent','gallery','recurring_generated')),
  ocr_raw_text               TEXT,                        -- texto bruto do OCR, para auditoria/reprocessamento
  ocr_confidence             REAL,
  recurring_transaction_id   TEXT REFERENCES recurring_transactions(id),
  is_reconciled              INTEGER NOT NULL DEFAULT 0,
  created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Comprovantes anexados permanentemente a um lançamento
CREATE TABLE IF NOT EXISTS attachments (
  id               TEXT PRIMARY KEY,
  transaction_id   TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_path        TEXT NOT NULL,          -- caminho local no sandbox do app
  file_name        TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  file_size_bytes  INTEGER,
  checksum_sha256  TEXT,                   -- integridade / dedupe
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Módulo de recorrências (fixas ou parceladas)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id                       TEXT PRIMARY KEY,
  type                     TEXT NOT NULL CHECK (type IN ('income','expense')),
  description              TEXT NOT NULL,
  amount_cents             INTEGER NOT NULL,
  category_id              TEXT REFERENCES categories(id),
  payee_id                 TEXT REFERENCES payees(id),
  account_id               TEXT REFERENCES accounts(id),
  payment_method           TEXT CHECK (payment_method IN ('pix','pix_automatico','ted','cartao','dinheiro','boleto','outro')),
  recurrence_kind          TEXT NOT NULL CHECK (recurrence_kind IN ('fixed','installment')), -- fixa | parcelada
  frequency                TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','yearly')),
  interval_count           INTEGER NOT NULL DEFAULT 1,     -- a cada N (ex.: a cada 2 meses)
  due_day                  INTEGER,                        -- dia de vencimento (1-31)
  start_date                TEXT NOT NULL,
  end_date                  TEXT,                           -- nulo = indeterminado (fixa sem fim)
  total_installments         INTEGER,                        -- ex.: 12x, só para 'installment'
  installments_generated      INTEGER NOT NULL DEFAULT 0,
  notes                     TEXT,
  is_active                 INTEGER NOT NULL DEFAULT 1,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pendências avulsas: lembrete de receita/despesa sem data ainda — vira uma
-- linha em `transactions` (e é apagado daqui) quando o usuário arrasta pra
-- um dia no Fluxo de Trabalho, ou lança direto pelo Painel.
CREATE TABLE IF NOT EXISTS pending_items (
  id                        TEXT PRIMARY KEY,
  type                      TEXT NOT NULL CHECK (type IN ('income','expense')),
  description               TEXT NOT NULL,
  amount_cents              INTEGER NOT NULL,
  category_id               TEXT REFERENCES categories(id),
  payee_id                  TEXT REFERENCES payees(id),
  recurring_transaction_id  TEXT REFERENCES recurring_transactions(id), -- setado quando vem de uma "conclusão parcial"
  notes                     TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ocorrências de recorrência que o usuário pulou explicitamente ("deletar só
-- este mês") — sem gerar lançamento nenhum, e sem afetar os outros meses.
CREATE TABLE IF NOT EXISTS recurring_exclusions (
  recurring_transaction_id  TEXT NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  occurrence_date           TEXT NOT NULL,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (recurring_transaction_id, occurrence_date)
);

-- Configuração do backup automático em CSV
CREATE TABLE IF NOT EXISTS backup_settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),  -- linha única de config
  export_directory     TEXT NOT NULL,
  frequency_hours      INTEGER NOT NULL DEFAULT 12,
  last_export_at       TEXT,
  last_export_status   TEXT CHECK (last_export_status IN ('success','failed','pending')),
  last_export_file     TEXT,
  enabled              INTEGER NOT NULL DEFAULT 1
);

-- Histórico de execuções do worker de backup (debug/auditoria)
CREATE TABLE IF NOT EXISTS backup_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at         TEXT NOT NULL DEFAULT (datetime('now')),
  status         TEXT NOT NULL,
  rows_exported  INTEGER,
  file_path      TEXT,
  error_message  TEXT
);

CREATE INDEX IF NOT EXISTS idx_tx_occurred_at   ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_category      ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_type          ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_attach_tx        ON attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active, due_day);
