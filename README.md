# 🏢 JN OfficeOS v2.3 — Enterprise CA & Tax Practice OS

> **Enterprise Practice Management, Tax Advisory CRM, Financial Engine & Compliance Register for Chartered Accountant & Tax Advisory Firms.**

[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🌟 Executive Overview

**JN OfficeOS** is a comprehensive, enterprise-grade operating system designed for Chartered Accountant (CA) firms, Tax Consultants, and Financial Advisory practices. It unifies Client CRM, Workflows, Compliance Tracking, Invoicing, Document Management, and Real-Time Supabase RDBMS Data Synchronization into a single, high-performance web platform.

---

## 🔥 Key Core Modules

### 1. 📊 Executive Practice Workspace & BI Analytics
- **Real-Time KPIs**: Track Active Clients, Open Corporate Cases, Total Revenue, Realized Payments, and Outstanding Receivables.
- **Visual Analytics**: Interactive bar charts and revenue breakdowns by financial year, category, and service type.
- **Office Queue**: Real-time activity feed and urgent deadline notifications.

### 2. 📁 Client CRM & Identity Directory
- **360° Client Profile**: Complete tracking of Client Category (Individual, Firm, Pvt Ltd, LLP), PAN, GSTIN, TAN, Aadhaar, and Bank Details.
- **Assigned Compliance Tags**: Selective assignment of GST, Income Tax (ITR), TDS, Tax Audit, Professional Tax, and ROC services per client.
- **Staff Assignments**: Dedicated Relationship Manager and Staff Executive mapping for every client.

### 3. 📂 Enterprise Case Directory & Workflow Engine
- **Case Lifecycle Management**: Milestone-based tracking for GST Returns, ITR Filings, Statutory Audits, and Litigation Cases.
- **Checklist & Timeline**: Granular task checklists with completion timestamps, staff notes, and audit logs.

### 4. 📜 Real-Time Invoicing & Financial Engine
- **Multi-Format Invoicing**: Generate Tax Invoices, Bills of Supply, Proforma Invoices, Credit Notes, Debit Notes, and Receipts.
- **Automated Tax Calculation**: Intra-State (CGST + SGST) vs Inter-State (IGST) automatic tax bifurcation based on Place of Supply.
- **Real-Time Supabase Sync**: Direct real-time bi-directional synchronization with Supabase PostgreSQL (`jn_invoices` & `jn_invoice_items`).
- **Double-Entry Ledgers**: Real-time client ledger history with debit/credit tracking and running balances.

### 5. 📅 Compliance Register & Recurring Task Engine
- **Statutory Tracking**: Automated due-date calendars for GSTR-3B, GSTR-1, ITR, Form 3CD/3CB, TDS Return (24Q/26Q), PT, and MCA filings.
- **Filing Workflow**: Mark-as-filed dialogs with ARN/ACK number logging, fee tracking, and document attachment.

### 6. 🗄️ Smart DMS Master & Document Storage
- **Categorized Document Repository**: Secure client-wise storage for PAN Cards, Incorporation Certificates, Tax Audit Reports, and Financial Statements.
- **Supabase Storage Integration**: Real-time upload and retrieval from dedicated Supabase S3-compatible buckets.

### 7. 👥 User & Staff Role Management
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for `OWNER` (Admin/Partner) and `STAFF` (Consultants/Assistants).
- **Staff Profiles**: Official Designation, Department, Mobile, Email, and Access Rights mapping.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Core** | React 18 (Hooks, Context), TypeScript 5.5 |
| **Build & Bundler** | Vite 6.4 |
| **Styling** | Vanilla CSS, Tailwind CSS 3.4, Framer Motion |
| **Icons** | Lucide React |
| **Backend DB** | Supabase PostgreSQL RDBMS |
| **Database Schema** | 42 Relational Tables across 16 SQL Domain Migrations |
| **Storage & Buckets** | 5 Supabase S3 Storage Buckets (`jn-client-documents`, `jn-invoices`, `jn-audits`, `jn-templates`, `jn-avatars`) |
| **PDF Generation** | Client-Side PDF Renderer with HTML2PDF & Native Print fallbacks |

---

## 🗄️ Database Architecture (Supabase RDBMS)

The application communicates directly with Supabase PostgreSQL using 16 domain-specific migration scripts located in `supabase/migrations/`:

```
supabase/migrations/
├── 01_enterprise_database_foundation.sql
├── 01_enterprise_schema.sql
├── 02_enterprise_auth_and_rls.sql
├── 02_rls_policies.sql
├── 03_enterprise_crm_domain.sql
├── 03_triggers_functions_indexes.sql
├── 04_enterprise_case_management.sql
├── 04_storage_buckets.sql
├── 05_enterprise_finance_domain.sql
├── 06_enterprise_document_management.sql
├── 07_enterprise_notifications.sql
├── 08_enterprise_automation.sql
├── 09_enterprise_reporting_and_analytics.sql
├── 10_enterprise_ai_foundation.sql
├── 11_enterprise_ocr_domain.sql
├── 12_enterprise_client_portal.sql
├── 13_enterprise_client_activation.sql
├── 14_enterprise_compliance_engine.sql
├── 15_client_centric_compliance_workspace.sql
└── 16_enterprise_connectivity_and_indexing.sql
```

---

## 🚀 Local Setup & Installation Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/jainnagarwal26-itr/JNOfficeOS.git
cd JNOfficeOS
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://hljwxadlzlfokeyimcbm.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 📄 License & Credits

Developed for **Jain Agarwal & Co.** (Chartered Accountants & Tax Advisors).  
Copyright © 2026 Jain Agarwal & Co. All rights reserved.
