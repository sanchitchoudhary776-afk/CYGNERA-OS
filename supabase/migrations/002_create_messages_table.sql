-- ═══════════════════════════════════════════════════════════════
--  CYGNERA OS · MESSAGES TABLE MIGRATION
--  Designed for direct, real-time student messages.
--  Auto-deletes messages older than 24 hours (1 day) from Supabase.
--  Run this SQL in your Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the network_messages table
CREATE TABLE IF NOT EXISTS public.network_messages (
  id           TEXT        PRIMARY KEY,          -- Client-generated UUID (no sequence overhead)
  sender_id    TEXT        NOT NULL,             -- User ID of sender (UUID string or mock ID)
  recipient_id TEXT        NOT NULL,             -- User ID of recipient (UUID string or mock ID)
  text         TEXT        NOT NULL,             -- Message content
  reactions    JSONB       NOT NULL DEFAULT '{}'::jsonb, -- Emoji reactions mapping: { "👍": 2, "❤️": 1 }
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast real-time reads & filter queries
CREATE INDEX IF NOT EXISTS network_messages_sender_idx ON public.network_messages (sender_id);
CREATE INDEX IF NOT EXISTS network_messages_recipient_idx ON public.network_messages (recipient_id);
CREATE INDEX IF NOT EXISTS network_messages_created_at_idx ON public.network_messages (created_at DESC);

-- 3. Row Level Security (RLS) — CRITICAL for multi-tenant safety
ALTER TABLE public.network_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages they sent or received
DROP POLICY IF EXISTS "messages: read own" ON public.network_messages;
CREATE POLICY "messages: read own"
  ON public.network_messages FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id))
    OR sender_id = 'me' OR recipient_id = 'me'
  );

-- Allow users to insert messages where they are the sender
DROP POLICY IF EXISTS "messages: insert own" ON public.network_messages;
CREATE POLICY "messages: insert own"
  ON public.network_messages FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = sender_id)
    OR sender_id = 'me'
  );

-- Allow updates (like reactions) if they are sender or recipient
DROP POLICY IF EXISTS "messages: update own" ON public.network_messages;
CREATE POLICY "messages: update own"
  ON public.network_messages FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id))
    OR sender_id = 'me' OR recipient_id = 'me'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id))
    OR sender_id = 'me' OR recipient_id = 'me'
  );

-- 4. Auto-purge: Delete messages older than 24 hours (1 day)
CREATE OR REPLACE FUNCTION purge_old_network_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.network_messages
  WHERE created_at < NOW() - INTERVAL '1 day';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the purge function after every INSERT statement
DROP TRIGGER IF EXISTS trigger_purge_old_network_messages ON public.network_messages;
CREATE TRIGGER trigger_purge_old_network_messages
  AFTER INSERT ON public.network_messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION purge_old_network_messages();
