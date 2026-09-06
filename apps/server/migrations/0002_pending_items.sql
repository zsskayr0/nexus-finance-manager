-- Pendências avulsas: lembrete de receita/despesa sem data ainda — vira uma
-- linha em `transactions` (e é apagado daqui) quando o usuário arrasta pra
-- um dia no Fluxo de Trabalho, ou lança direto pelo Painel.
CREATE TABLE IF NOT EXISTS pending_items (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('income','expense')),
  description   TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  category_id   TEXT REFERENCES categories(id),
  payee_id      TEXT REFERENCES payees(id),
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
