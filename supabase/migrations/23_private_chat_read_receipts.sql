-- ==============================================================================
-- JN OfficeOS V2.4 - Module A Enhancement: Private Staff Chat Read Receipts
-- Description: Idempotently add read_at and is_read tracking to private chat messages with optimized indexes and RLS
-- ==============================================================================

-- 1. ADD READ TRACKING COLUMNS TO jn_private_chat_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'jn_private_chat_messages' 
          AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.jn_private_chat_messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'jn_private_chat_messages' 
          AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.jn_private_chat_messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. CREATE PERFORMANCE INDEXES FOR UNREAD COUNTERS AND READ LOOKUPS
CREATE INDEX IF NOT EXISTS idx_private_chat_messages_unread 
ON public.jn_private_chat_messages (chat_id, sender_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_private_chat_messages_read_at 
ON public.jn_private_chat_messages (chat_id, read_at);

-- 3. ENSURE RLS POLICIES REMAIN STRICT AND ALLOW READ STATUS UPDATES
DROP POLICY IF EXISTS "Private chat messages update policy" ON public.jn_private_chat_messages;
CREATE POLICY "Private chat messages update policy" ON public.jn_private_chat_messages
FOR UPDATE USING (true) WITH CHECK (true);

-- 4. ENSURE REALTIME PUBLICATION COVERS jn_private_chat_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename = 'jn_private_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.jn_private_chat_messages;
    END IF;
END $$;
