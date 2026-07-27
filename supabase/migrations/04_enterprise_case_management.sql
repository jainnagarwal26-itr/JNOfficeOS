-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 4: Enterprise Case & Workflow Management DDL
-- Description: 3NF Normalized DDL for Cases, Assignments, Tasks, Timelines, Comments, Time Entries, Workflow Views
-- ==============================================================================

-- 1. CASE MANAGEMENT DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT true,
    attachment_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'CASE_CREATED', 'ASSIGNED', 'STATUS_CHANGE', 'TASK_COMPLETED', 'COMMENT_ADDED', 'TIME_LOGGED', 'CLOSED'
    event_title VARCHAR(255) NOT NULL,
    event_details JSONB,
    performed_by UUID REFERENCES jn_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_case_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES jn_case_tasks(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    hours_spent NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    hourly_rate NUMERIC(15,2) DEFAULT 0.00,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_case_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    bucket_id VARCHAR(100) NOT NULL DEFAULT 'jn-documents',
    file_size_bytes BIGINT DEFAULT 0,
    uploaded_by UUID REFERENCES jn_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_case_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    prerequisite_case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'MUST_FINISH_BEFORE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(case_id, prerequisite_case_id)
);

-- 2. FULL-TEXT SEARCH GIN INDEXES FOR CASE DOMAIN
CREATE INDEX IF NOT EXISTS idx_case_search_gin ON jn_cases USING gin (
    to_tsvector('english'::regconfig, 
        COALESCE(case_number, '') || ' ' || 
        COALESCE(case_title, '') || ' ' || 
        COALESCE(category, '')
    )
);

-- 3. ANALYTICAL SQL VIEWS FOR CASE DOMAIN
CREATE OR REPLACE VIEW v_case_summary AS
SELECT 
    c.id AS case_id,
    c.case_number,
    c.case_title,
    c.category,
    c.status,
    c.priority,
    c.due_date,
    c.estimated_hours,
    c.actual_hours,
    c.fee_amount,
    cl.client_number,
    cl.client_name,
    cl.pan,
    cl.gstin,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_completed = true) AS completed_tasks,
    COALESCE(SUM(te.hours_spent), 0.00) AS total_hours_logged,
    c.created_at
FROM jn_cases c
JOIN jn_clients cl ON c.client_id = cl.id
LEFT JOIN jn_case_tasks t ON c.id = t.case_id
LEFT JOIN jn_case_time_entries te ON c.id = te.case_id AND te.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.is_active = true
GROUP BY c.id, c.case_number, c.case_title, c.category, c.status, c.priority, c.due_date, c.estimated_hours, c.actual_hours, c.fee_amount, cl.client_number, cl.client_name, cl.pan, cl.gstin, c.created_at;

CREATE OR REPLACE VIEW v_staff_workload AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    u.department,
    COUNT(DISTINCT ca.case_id) FILTER (WHERE cs.status NOT IN ('FILED_COMPLETED', 'CANCELLED')) AS active_cases_assigned,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_completed = false) AS pending_tasks,
    COALESCE(SUM(te.hours_spent), 0.00) AS total_logged_hours
FROM jn_users u
LEFT JOIN jn_case_assignments ca ON u.id = ca.user_id
LEFT JOIN jn_cases cs ON ca.case_id = cs.id AND cs.deleted_at IS NULL
LEFT JOIN jn_case_tasks t ON u.id = t.assigned_to AND t.is_completed = false
LEFT JOIN jn_case_time_entries te ON u.id = te.user_id AND te.deleted_at IS NULL
WHERE u.is_active = true AND u.deleted_at IS NULL
GROUP BY u.id, u.full_name, u.email, u.department;

-- 4. RLS POLICIES FOR CASE DOMAIN
ALTER TABLE jn_case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_case_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_case_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff view case comments" ON jn_case_comments FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff create case comments" ON jn_case_comments FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Internal staff view case timeline" ON jn_case_timeline FOR SELECT USING (is_staff());

CREATE POLICY "Internal staff view time entries" ON jn_case_time_entries FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff log time entries" ON jn_case_time_entries FOR ALL USING (is_staff());
