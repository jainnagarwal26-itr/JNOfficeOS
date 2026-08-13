-- ==============================================================================
-- JN OfficeOS V2.4 - Module A: Staff Daily Work Reporting DDL & RLS
-- Description: Dedicated table for staff daily work reports with 1-report-per-day constraint and hardened RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.jn_staff_daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES public.jn_users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_summary TEXT NOT NULL,
    completed_work TEXT,
    pending_work TEXT,
    client_related_work TEXT,
    case_related_work TEXT,
    hours_worked NUMERIC(5,2) DEFAULT 0.00,
    priority_items TEXT,
    remarks TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'REVIEWED'
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.jn_users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_staff_daily_report UNIQUE(staff_user_id, report_date)
);

-- INDEXING
CREATE INDEX IF NOT EXISTS idx_staff_daily_reports_staff_date ON public.jn_staff_daily_reports(staff_user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_staff_daily_reports_status ON public.jn_staff_daily_reports(status);

-- RLS POLICIES
ALTER TABLE public.jn_staff_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read own reports or Owner read all" ON public.jn_staff_daily_reports;
DROP POLICY IF EXISTS "Staff insert own report" ON public.jn_staff_daily_reports;
DROP POLICY IF EXISTS "Staff update own draft/submitted report or Owner update" ON public.jn_staff_daily_reports;
DROP POLICY IF EXISTS "Staff delete own draft report" ON public.jn_staff_daily_reports;

-- SELECT POLICY
CREATE POLICY "Staff read own reports or Owner read all" ON public.jn_staff_daily_reports
FOR SELECT USING (
  staff_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND role IN ('OWNER', 'SUPERADMIN'))
);

-- INSERT POLICY
CREATE POLICY "Staff insert own report" ON public.jn_staff_daily_reports
FOR INSERT WITH CHECK (
  staff_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND role IN ('OWNER', 'SUPERADMIN'))
);

-- UPDATE POLICY
CREATE POLICY "Staff update own draft/submitted report or Owner update" ON public.jn_staff_daily_reports
FOR UPDATE USING (
  staff_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND role IN ('OWNER', 'SUPERADMIN'))
) WITH CHECK (
  staff_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND role IN ('OWNER', 'SUPERADMIN'))
);

-- DELETE POLICY (Only Drafts by owner/staff)
CREATE POLICY "Staff delete own draft report" ON public.jn_staff_daily_reports
FOR DELETE USING (
  (staff_user_id = auth.uid() AND status = 'DRAFT')
  OR EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND role IN ('OWNER', 'SUPERADMIN'))
);
