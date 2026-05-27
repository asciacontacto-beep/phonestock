-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS expenses (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'ARS',
  category    TEXT        NOT NULL DEFAULT 'Operativo',
  deposit_id  UUID      REFERENCES deposits(id) ON DELETE SET NULL,
  seller_id   UUID,
  seller_name TEXT
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can manage expenses"
  ON expenses FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
