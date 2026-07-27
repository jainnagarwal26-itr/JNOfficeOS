-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 8: Enterprise Automation Engine & Business Rules DDL
-- Description: 3NF Normalized DDL for Business Rules, Conditions, Actions, Executions, Scheduler Jobs, Approvals, Views
-- ==============================================================================

-- 1. AUTOMATION DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_business_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'RULE_OVERDUE_INVOICE_REMINDER', 'RULE_DOCUMENT_EXPIRY_NOTIFY'
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    event_trigger VARCHAR(100) NOT NULL, -- 'CLIENT_CREATED', 'CASE_STATUS_CHANGED', 'INVOICE_OVERDUE', 'DOCUMENT_EXPIRING', 'PAYMENT_RECEIVED'
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

ALTER TABLE jn_business_rules ADD COLUMN IF NOT EXISTS rule_code VARCHAR(100);
ALTER TABLE jn_business_rules ADD COLUMN IF NOT EXISTS event_trigger VARCHAR(100);
ALTER TABLE jn_business_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jn_business_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE jn_business_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS jn_rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES jn_business_rules(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    operator VARCHAR(50) NOT NULL, -- 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS'
    field_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jn_rule_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES jn_business_rules(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'SEND_NOTIFICATION', 'QUEUE_EMAIL', 'QUEUE_WHATSAPP', 'CREATE_TASK', 'UPDATE_STATUS'
    action_config JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS jn_rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES jn_business_rules(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'PARTIAL'
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'JOB_DAILY_OUTSTANDING_REMINDER', 'JOB_GST_DUE_REMINDER'
    job_name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(50) NOT NULL DEFAULT '0 9 * * *', -- Standard 5-part cron
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'INVOICE', 'QUOTATION', 'CASE_CLOSURE', 'DOCUMENT_DELETE'
    entity_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES jn_users(id),
    current_approver_role VARCHAR(50) NOT NULL, -- 'MANAGER', 'REVIEWER', 'PARTNER', 'OWNER'
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ANALYTICAL SQL VIEWS FOR AUTOMATION DOMAIN
CREATE OR REPLACE VIEW v_rule_execution_summary AS
SELECT 
    r.id AS rule_id,
    r.rule_code,
    r.rule_name,
    r.event_trigger,
    COUNT(e.id) AS total_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'SUCCESS') AS successful_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'FAILED') AS failed_executions,
    MAX(e.executed_at) AS last_executed_at
FROM jn_business_rules r
LEFT JOIN jn_rule_executions e ON r.id = e.rule_id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.rule_code, r.rule_name, r.event_trigger;

CREATE OR REPLACE VIEW v_failed_automations AS
SELECT 
    e.id AS execution_id,
    r.rule_code,
    r.rule_name,
    e.event_name,
    e.error_message,
    e.executed_at
FROM jn_rule_executions e
JOIN jn_business_rules r ON e.rule_id = r.id
WHERE e.status = 'FAILED';

CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT 
    a.id AS approval_id,
    a.entity_type,
    a.entity_id,
    u.full_name AS requester_name,
    a.current_approver_role,
    a.status,
    a.created_at
FROM jn_approval_workflows a
JOIN jn_users u ON a.requested_by = u.id
WHERE a.status = 'PENDING';

-- 3. RLS POLICIES FOR AUTOMATION DOMAIN
ALTER TABLE jn_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage rules" ON jn_business_rules FOR ALL USING (is_admin());
CREATE POLICY "Admin manage scheduler" ON jn_scheduler_jobs FOR ALL USING (is_admin());
CREATE POLICY "Staff view approvals" ON jn_approval_workflows FOR SELECT USING (is_staff());
