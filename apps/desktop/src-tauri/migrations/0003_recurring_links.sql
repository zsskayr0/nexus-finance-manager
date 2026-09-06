ALTER TABLE pending_items ADD COLUMN recurring_transaction_id TEXT REFERENCES recurring_transactions(id);

CREATE TABLE IF NOT EXISTS recurring_exclusions (
  recurring_transaction_id  TEXT NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  occurrence_date           TEXT NOT NULL,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (recurring_transaction_id, occurrence_date)
);
