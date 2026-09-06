-- SQLite não deixa alterar um CHECK já existente com ALTER TABLE — o jeito
-- documentado é recriar a tabela do zero com o CHECK novo, copiar os dados,
-- trocar de nome. `foreign_keys` fica OFF só durante a troca (tabelas que
-- referenciam transactions/recurring_transactions por id continuam
-- resolvendo normal depois, já que os ids não mudam).
PRAGMA foreign_keys = OFF;

CREATE TABLE transactions_new (
  id                        TEXT PRIMARY KEY,
  type                      TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'BRL',
  occurred_at               TEXT NOT NULL,
  description               TEXT NOT NULL,
  category_id               TEXT REFERENCES categories(id),
  payee_id                  TEXT REFERENCES payees(id),
  account_id                TEXT REFERENCES accounts(id),
  payment_method            TEXT CHECK (payment_method IN ('pix','pix_automatico','ted','cartao','dinheiro','boleto','outro')),
  notes                     TEXT,
  source                    TEXT NOT NULL DEFAULT 'manual'
                             CHECK (source IN ('manual','share_intent','gallery','recurring_generated')),
  ocr_raw_text              TEXT,
  ocr_confidence            REAL,
  recurring_transaction_id  TEXT REFERENCES recurring_transactions(id),
  is_reconciled             INTEGER NOT NULL DEFAULT 0,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO transactions_new
  (id, type, amount_cents, currency, occurred_at, description, category_id, payee_id, account_id,
   payment_method, notes, source, ocr_raw_text, ocr_confidence, recurring_transaction_id, is_reconciled,
   created_at, updated_at)
SELECT
  id, type, amount_cents, currency, occurred_at, description, category_id, payee_id, account_id,
  payment_method, notes, source, ocr_raw_text, ocr_confidence, recurring_transaction_id, is_reconciled,
  created_at, updated_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_tx_occurred_at ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_category    ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_type        ON transactions(type);

CREATE TABLE recurring_transactions_new (
  id                       TEXT PRIMARY KEY,
  type                     TEXT NOT NULL CHECK (type IN ('income','expense')),
  description              TEXT NOT NULL,
  amount_cents             INTEGER NOT NULL,
  category_id              TEXT REFERENCES categories(id),
  payee_id                 TEXT REFERENCES payees(id),
  account_id               TEXT REFERENCES accounts(id),
  payment_method           TEXT CHECK (payment_method IN ('pix','pix_automatico','ted','cartao','dinheiro','boleto','outro')),
  recurrence_kind          TEXT NOT NULL CHECK (recurrence_kind IN ('fixed','installment')),
  frequency                TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','yearly')),
  interval_count           INTEGER NOT NULL DEFAULT 1,
  due_day                  INTEGER,
  start_date               TEXT NOT NULL,
  end_date                 TEXT,
  total_installments       INTEGER,
  installments_generated   INTEGER NOT NULL DEFAULT 0,
  notes                    TEXT,
  is_active                INTEGER NOT NULL DEFAULT 1,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO recurring_transactions_new
  (id, type, description, amount_cents, category_id, payee_id, account_id, payment_method, recurrence_kind,
   frequency, interval_count, due_day, start_date, end_date, total_installments, installments_generated,
   notes, is_active, created_at, updated_at)
SELECT
  id, type, description, amount_cents, category_id, payee_id, account_id, payment_method, recurrence_kind,
  frequency, interval_count, due_day, start_date, end_date, total_installments, installments_generated,
  notes, is_active, created_at, updated_at
FROM recurring_transactions;

DROP TABLE recurring_transactions;
ALTER TABLE recurring_transactions_new RENAME TO recurring_transactions;

CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active, due_day);

PRAGMA foreign_keys = ON;
