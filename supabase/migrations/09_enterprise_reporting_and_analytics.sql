-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 9: Executive Dashboards, Business Intelligence & Reporting Views DDL
-- Description: Analytical Views, Materialized Views & High-Performance Executive Query Engines
-- ==============================================================================

-- 1. EXECUTIVE BI DASHBOARD VIEW
CREATE OR REPLACE VIEW v_executive_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM jn_clients WHERE deleted_at IS NULL AND is_active = true) AS total_clients,
    (SELECT COUNT(*) FROM jn_clients WHERE status = 'Active' AND deleted_at IS NULL) AS active_clients,
    (SELECT COUNT(*) FROM jn_cases WHERE deleted_at IS NULL AND is_active = true) AS total_cases,
    (SELECT COUNT(*) FROM jn_cases WHERE status NOT IN ('FILED_COMPLETED', 'CANCELLED') AND deleted_at IS NULL) AS pending_cases,
    (SELECT COUNT(*) FROM jn_cases WHERE status = 'FILED_COMPLETED' AND deleted_at IS NULL) AS completed_cases,
    (SELECT COALESCE(SUM(total_amount), 0.00) FROM jn_invoices WHERE status NOT IN ('CANCELLED', 'DRAFT') AND deleted_at IS NULL) AS total_revenue,
    (SELECT COALESCE(SUM(balance_due), 0.00) FROM jn_invoices WHERE status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE') AND deleted_at IS NULL) AS total_outstanding_receivables,
    (SELECT COALESCE(SUM(amount_paid), 0.00) FROM jn_invoices WHERE status NOT IN ('CANCELLED', 'DRAFT') AND deleted_at IS NULL) AS total_collections,
    (SELECT COALESCE(SUM(amount), 0.00) FROM jn_expenses WHERE deleted_at IS NULL) AS total_expenses,
    (SELECT COUNT(*) FROM jn_documents WHERE deleted_at IS NULL AND is_active = true) AS total_documents,
    (SELECT COUNT(*) FROM jn_documents WHERE expiry_date IS NOT NULL AND expiry_date <= (CURRENT_DATE + INTERVAL '30 days') AND deleted_at IS NULL) AS expiring_documents;

-- 2. CASE ANALYTICS VIEW
CREATE OR REPLACE VIEW v_case_analytics AS
SELECT 
    category,
    status,
    priority,
    COUNT(id) AS case_count,
    COALESCE(AVG(estimated_hours), 0.00) AS avg_estimated_hours,
    COALESCE(AVG(actual_hours), 0.00) AS avg_actual_hours,
    COALESCE(SUM(fee_amount), 0.00) AS total_fee_amount
FROM jn_cases
WHERE deleted_at IS NULL AND is_active = true
GROUP BY category, status, priority;

-- 3. MATERIALIZED VIEW FOR MONTHLY FINANCIAL PERFORMANCE
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_financial_analytics AS
SELECT 
    TO_CHAR(invoice_date, 'YYYY-MM') AS month_year,
    COUNT(id) AS invoice_count,
    COALESCE(SUM(sub_total), 0.00) AS taxable_revenue,
    COALESCE(SUM(gst_amount), 0.00) AS total_gst,
    COALESCE(SUM(total_amount), 0.00) AS gross_revenue,
    COALESCE(SUM(amount_paid), 0.00) AS total_collected
FROM jn_invoices
WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'DRAFT')
GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
ORDER BY month_year DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_fin_month ON mv_monthly_financial_analytics(month_year);

-- 4. STORED PROCEDURE TO REFRESH MATERIALIZED ANALYTICS VIEW
CREATE OR REPLACE FUNCTION refresh_materialized_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_financial_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
