ALTER TABLE recurring_transactions ADD COLUMN payment_method TEXT CHECK (payment_method IN ('pix','ted','cartao','dinheiro','boleto','outro'));
