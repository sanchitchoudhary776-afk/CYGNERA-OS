-- ═══════════════════════════════════════════════════════════════
--  CYGNERA OS · NOTES TABLE MIGRATION
--  Designed for 1000+ students on the Supabase free tier (500MB limit).
--  Strategy: relational rows, compressed content, soft deletes.
--  Run this SQL in your Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id           TEXT        PRIMARY KEY,          -- Client-generated UUID (no sequence overhead)
  user_id      UUID        NOT NULL,             -- References auth.users
  title        TEXT        NOT NULL DEFAULT 'Untitled',
  content      TEXT        NOT NULL DEFAULT '',  -- Markdown content
  subject      TEXT        NOT NULL DEFAULT 'General',
  tags         TEXT[]      DEFAULT '{}',         -- Array — max 10 tags enforced by app
  word_count   INTEGER     DEFAULT 0,
  ai_summary   TEXT,                             -- Short summary ≤500 chars (nullable)
  ai_concepts  TEXT[],                           -- ≤8 concepts (nullable)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ                       -- Soft delete — NULL = active
);

-- 2. Indexes (essential for 1000+ students)
CREATE INDEX IF NOT EXISTS notes_user_id_idx   ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;                      -- Partial index — only active notes, much smaller

-- 3. Row Level Security (RLS) — CRITICAL for multi-tenant safety
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Users can only see & edit their own notes
CREATE POLICY "notes: own read"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes: own insert"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes: own update"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No hard deletes via API — soft delete only (updated via UPDATE policy above)

-- 4. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();

-- 5. Storage estimate for capacity planning:
--    Average note: ~2KB (title + content + metadata)
--    1000 students × 50 notes × 2KB = ~100MB used
--    Supabase free tier: 500MB → comfortable headroom for 5000 students
--    With the soft-delete purge below, storage stays lean.

-- 6. Auto-purge hard delete: permanently remove soft-deleted notes older than 30 days.
--    Run this as a cron job in Supabase Dashboard → Edge Functions → Schedule.
--    Or paste in SQL Editor to run manually.
--
-- DELETE FROM public.notes
-- WHERE deleted_at IS NOT NULL
--   AND deleted_at < NOW() - INTERVAL '30 days';
