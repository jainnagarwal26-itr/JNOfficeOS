# CHANGELOG - JN OfficeOS Enterprise Practice Management SaaS

All notable changes to the JN OfficeOS platform are documented in this file.

## [2.0.0-RC1] - 2026-07-26

### Added
- **Module 1 (Database Foundation)**: Base DDL schemas, `jn_users`, `jn_roles`, `jn_permissions`, `jn_number_sequences`, atomic sequence generator `generate_next_business_number()`, optimistic concurrency control counters, and `trg_audit_logger()`.
- **Module 2 (Auth & RLS)**: GoTrue JWT Auth integration, RBAC permission checker, Security Definer helper functions (`has_permission`, `get_current_user_role`), account lockout procedure (`record_failed_login`), and session revocation.
- **Module 3 (Enterprise CRM)**: 3NF tables for clients, contacts, addresses, tax information, full-text GIN index search engine (`to_tsvector`), and format/duplicate validation.
- **Module 4 (Case & Workflow Management)**: Engagement cases, configurable workflow transitions, task checklists, time tracking (billable/non-billable hours), and automatic timeline event logging.
- **Module 5 (Finance & Billing)**: Invoices, line items, receipts with partial payment allocation, office expenses, client ledgers, and Indian GST calculation engine (CGST, SGST, IGST).
- **Module 6 (Document Management System)**: Supabase Storage bucket integration (`jn-documents`, `jn-invoices`, `jn-profile-images`, `jn-signatures`, `jn-attachments`), document versioning (`V1`, `V2`), verifications, and secure signed URLs.
- **Module 7 (Notifications & Communication Hub)**: In-app alerts, Supabase Realtime WebSocket listener, template variable interpolation (`{{client_name}}`), and queue engines for Email/WhatsApp/SMS/Push.
- **Module 8 (Automation Engine)**: Pub-Sub `EventBus`, IF-THEN `RuleEngine`, multi-level approval chains (`ApprovalService`), and cron job scheduler (`SchedulerService`).
- **Module 9 (Executive BI & Analytics)**: `v_executive_dashboard` SQL View, `mv_monthly_financial_analytics` Materialized View with concurrent background refresh, KPI engine, and CSV export engine.
- **Module 10 (Release Certification)**: Complete RC-1 build validation, production environment setup, and zero-error compilation check.
