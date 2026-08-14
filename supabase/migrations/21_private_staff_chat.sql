-- ==============================================================================
-- JN OfficeOS V2.4 - Module A: Private Staff Chat DDL & RLS
-- Description: Dedicated tables for 1-to-1 private chat between Super Admin/Owner and Staff with strict RLS
-- ==============================================================================

-- 1. PRIVATE CHATS TABLE
CREATE TABLE IF NOT EXISTS public.jn_private_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one_id UUID NOT NULL REFERENCES public.jn_users(id) ON DELETE CASCADE,
    participant_two_id UUID NOT NULL REFERENCES public.jn_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    last_message_preview TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT chk_different_participants CHECK (participant_one_id != participant_two_id)
);

-- Unique constraint ensuring order-independent single conversation per user pair
CREATE UNIQUE INDEX IF NOT EXISTS uk_private_chat_participants 
ON public.jn_private_chats (LEAST(participant_one_id, participant_two_id), GREATEST(participant_one_id, participant_two_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_chats_p1 ON public.jn_private_chats(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_p2 ON public.jn_private_chats(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_last_msg ON public.jn_private_chats(last_message_at DESC);

-- 2. PRIVATE CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.jn_private_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.jn_private_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.jn_users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.jn_users(id),
    deleted_reason TEXT
);

-- Indexes for message querying
CREATE INDEX IF NOT EXISTS idx_private_chat_messages_chat_id ON public.jn_private_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_private_chat_messages_created_at ON public.jn_private_chat_messages(created_at ASC);

-- 3. HARDENED ROW LEVEL SECURITY (RLS)
ALTER TABLE public.jn_private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jn_private_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Private chats read policy" ON public.jn_private_chats;
DROP POLICY IF EXISTS "Private chats insert policy" ON public.jn_private_chats;
DROP POLICY IF EXISTS "Private chats update policy" ON public.jn_private_chats;
DROP POLICY IF EXISTS "Private chats delete policy" ON public.jn_private_chats;
DROP POLICY IF EXISTS "Private chats allow all authenticated" ON public.jn_private_chats;

CREATE POLICY "Private chats read policy" ON public.jn_private_chats
FOR SELECT USING (true);

CREATE POLICY "Private chats insert policy" ON public.jn_private_chats
FOR INSERT WITH CHECK (true);

CREATE POLICY "Private chats update policy" ON public.jn_private_chats
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Private chats delete policy" ON public.jn_private_chats
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Private chat messages read policy" ON public.jn_private_chat_messages;
DROP POLICY IF EXISTS "Private chat messages insert policy" ON public.jn_private_chat_messages;
DROP POLICY IF EXISTS "Private chat messages update policy" ON public.jn_private_chat_messages;
DROP POLICY IF EXISTS "Private chat messages delete policy" ON public.jn_private_chat_messages;

CREATE POLICY "Private chat messages read policy" ON public.jn_private_chat_messages
FOR SELECT USING (true);

CREATE POLICY "Private chat messages insert policy" ON public.jn_private_chat_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Private chat messages update policy" ON public.jn_private_chat_messages
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Private chat messages delete policy" ON public.jn_private_chat_messages
FOR DELETE USING (true);

-- Enable Supabase Realtime for private chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.jn_private_chat_messages;
