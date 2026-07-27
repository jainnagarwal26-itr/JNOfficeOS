-- ==============================================================================
-- JN OfficeOS V2.1 - Enterprise SaaS Database Migration
-- PHASE 1: Enterprise AI Foundation & Knowledge Base DDL
-- Description: Additive DDL for AI Models, Conversations, Messages, Embeddings Hooks, Knowledge Base & AI Audit Logs
-- ==============================================================================

-- 1. AI FOUNDATION & KNOWLEDGE BASE TABLES

CREATE TABLE IF NOT EXISTS jn_ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'gemini-1.5-pro', 'gpt-4o', 'claude-3-5-sonnet'
    model_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL DEFAULT 'Google Gemini',
    max_tokens INTEGER DEFAULT 8192,
    cost_per_1k_input_tokens NUMERIC(10,6) DEFAULT 0.00,
    cost_per_1k_output_tokens NUMERIC(10,6) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    context_type VARCHAR(50), -- 'CLIENT', 'CASE', 'INVOICE', 'DOCUMENT', 'GENERAL'
    context_id UUID,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES jn_ai_conversations(id) ON DELETE CASCADE,
    sender_role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    message_content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_knowledge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES jn_knowledge_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    is_published BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_ai_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- 'KNOWLEDGE_ARTICLE', 'DOCUMENT', 'CASE', 'SOP'
    source_id UUID NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding_vector JSONB, -- Abstract vector representation hook
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id),
    model_code VARCHAR(100) NOT NULL,
    prompt_text TEXT NOT NULL,
    response_text TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10,6) DEFAULT 0.000000,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FULL-TEXT SEARCH INDEXES FOR KNOWLEDGE BASE
CREATE INDEX IF NOT EXISTS idx_knowledge_search ON jn_knowledge_articles USING gin (
    to_tsvector('english'::regconfig, COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- 3. RLS POLICIES FOR AI FOUNDATION
ALTER TABLE jn_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own AI conversations" ON jn_ai_conversations FOR ALL USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "Users access own AI messages" ON jn_ai_messages FOR ALL USING (is_staff());
CREATE POLICY "Staff view knowledge articles" ON jn_knowledge_articles FOR SELECT USING (is_staff());
CREATE POLICY "Admin view AI audit logs" ON jn_ai_audit_logs FOR SELECT USING (is_admin());
