-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 7: Enterprise Notifications, Alerts & Communication Hub DDL
-- Description: 3NF Normalized DDL for Notifications, Templates, Queue Engine, Channel Queues, Delivery Logs, Views
-- ==============================================================================

-- 1. NOTIFICATION DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES jn_users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    channel VARCHAR(50) DEFAULT 'IN_APP',
    metadata JSONB,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES jn_users(id);
ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(100) DEFAULT 'SYSTEM';
ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE jn_notifications ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS jn_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'CLIENT_WELCOME', 'CASE_ASSIGNED', 'INVOICE_GENERATED', 'DOCUMENT_EXPIRING'
    template_name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'IN_APP', -- 'IN_APP', 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH'
    subject_template TEXT,
    body_template TEXT NOT NULL,
    placeholders TEXT[], -- Array of allowed placeholders e.g. ARRAY['client_name', 'case_number', 'amount', 'due_date']
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES jn_notifications(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH'
    recipient_address VARCHAR(255) NOT NULL, -- email, phone number, push token
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED'
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES jn_notification_queue(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    attachment_urls TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES jn_notification_queue(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(50) NOT NULL,
    template_code VARCHAR(100) NOT NULL,
    template_params JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES jn_notification_queue(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_response JSONB,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ANALYTICAL SQL VIEWS FOR NOTIFICATION DOMAIN
CREATE OR REPLACE VIEW v_notification_summary AS
SELECT 
    n.id AS notification_id,
    n.recipient_id,
    u.full_name AS recipient_name,
    u.email AS recipient_email,
    n.notification_type,
    n.title,
    n.is_read,
    n.read_at,
    n.created_at
FROM jn_notifications n
LEFT JOIN jn_users u ON n.recipient_id = u.id
WHERE n.deleted_at IS NULL AND n.is_active = true;

CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT 
    recipient_id,
    COUNT(id) AS unread_count,
    MAX(created_at) AS latest_notification_at
FROM jn_notifications
WHERE is_read = false AND deleted_at IS NULL
GROUP BY recipient_id;

CREATE OR REPLACE VIEW v_failed_notifications AS
SELECT 
    q.id AS queue_id,
    q.channel,
    q.recipient_address,
    q.status,
    q.retry_count,
    q.error_message,
    q.scheduled_at,
    q.created_at
FROM jn_notification_queue q
WHERE q.status IN ('FAILED', 'RETRYING');

-- 3. RLS POLICIES FOR NOTIFICATION DOMAIN
ALTER TABLE jn_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_whatsapp_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON jn_notifications FOR SELECT USING (recipient_id = auth.uid() OR is_staff());
CREATE POLICY "Staff view templates" ON jn_notification_templates FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage notification queues" ON jn_notification_queue FOR ALL USING (is_admin());
