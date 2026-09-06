CREATE TABLE IF NOT EXISTS accounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  bank            TEXT,
  agency          TEXT,
  account_number  TEXT,
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE transactions ADD COLUMN account_id TEXT REFERENCES accounts(id);
ALTER TABLE recurring_transactions ADD COLUMN account_id TEXT REFERENCES accounts(id);
