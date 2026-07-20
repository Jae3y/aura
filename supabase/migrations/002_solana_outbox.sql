-- Solana outbox: persists pending blockchain writes so they survive server restarts.
CREATE TABLE public.solana_outbox (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name  TEXT NOT NULL CHECK (table_name IN ('threat_events', 'voice_commands', 'none')),
  row_id      UUID NOT NULL,
  event_name  TEXT NOT NULL,
  memo        JSONB NOT NULL DEFAULT '{}',
  attempts    INT NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solana_outbox_pending ON public.solana_outbox (created_at)
  WHERE status = 'pending';

ALTER TABLE public.solana_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.solana_outbox
  FOR ALL
  USING (auth.role() = 'service_role');
