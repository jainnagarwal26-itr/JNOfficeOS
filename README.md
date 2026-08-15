# 🏢 JN OfficeOS — Enterprise Practice & Financial Operating System

> **Comprehensive Enterprise Practice Management, Tax Advisory CRM, Central Invoice Engine, Private Staff Chat, and Statutory Compliance Register for Chartered Accountants & Tax Advisory Firms.**

[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-gold?style=for-the-badge)](LICENSE)

---

## 🌟 Executive Overview

**JN OfficeOS** is an enterprise-grade operating system built specifically for Chartered Accountant (CA) firms, Tax Consultants, and Corporate Advisory practices. It brings together Client CRM, Statutory Compliance Register, Case & Workflow Management, Centralized Invoicing & Ledger, Smart DMS Document Vault, Private Staff Chat with Real-Time Desktop Notifications, and Staff Daily Reports into a unified, high-performance web platform powered by **Supabase PostgreSQL**.

---

## 🔥 Key Core Modules

### 1. 📜 Central Invoice & Financial Engine
- **Centralized Integrity Layer**: Powered by `CentralInvoiceRepository` as the single authoritative read/write path with atomic PostgreSQL transactions.
- **In-Place Multi-Item Editing**: Edit Service Name, Description, Quantity, Rate, Discount, and GST Rates in real-time with instant reactive calculations for Taxable Value, CGST, SGST, IGST, Round-Off, and Amount in Words.
- **Client-Side High-Res PDF Engine**: Integrated `html2canvas` and `jsPDF` vector rendering for crisp, downloadable PDFs (`JNA-YYYY-YY-XXXXXX-Client-Name.pdf`) and dedicated A4 print preview.
- **Multi-Format Invoicing**: Supports Tax Invoices, Bills of Supply, Proforma Invoices, Credit/Debit Notes, and Payment Receipts.
- **Running Client Ledgers**: Double-entry bookkeeping ledger with debit/credit breakdown, payment logging, and balance tracking.

### 2. 💬 Private Staff Chat & Real-Time Alert System
- **Confidential Messaging**: End-to-end isolated communication channels between Staff and Partners (`STF000001`–`STF000004`).
- **Real-Time Delivery & Notifications**: Supabase Realtime WebSocket synchronization with instant desktop banner popups, browser notifications, and auditory alerts.
- **Read Receipts & Unread Counters**: Tracks delivery timestamps and message status with unread notification badges.

### 3. 📅 Statutory Compliance Register
- **491 Pre-configured Statutory Due Dates**: Comprehensive tracking across GSTR-3B, GSTR-1, ITR-1 to ITR-7, Tax Audit Form 3CA/3CD, TDS Returns (24Q, 26Q, 27Q), Professional Tax (PTEC `SRV00015`, PTRC `SRV00016`), and MCA/ROC filings.
- **Filing Workflow**: Interactive filing dialogs recording Filing Date, ARN / Acknowledgement Numbers, Challan BSR/CIN, and document attachments.

### 4. 📁 Client CRM & Identity Directory
- **360° Client Dossier**: Complete records of Client Type (Individual, Partnership, Pvt Ltd, LLP), PAN, GSTIN, TAN, Aadhaar, Bank Details, and Addresses.
- **Master Directory**: Master directory with automated State & Place of Supply recognition for Intra-State vs Inter-State GST tax splitting.
- **Staff Mapping**: Dedicated Relationship Manager and Staff Executive assignment per client.

### 5. 📂 Enterprise Case Management & Workflows
- **Case Lifecycle Tracking**: Milestone-based tracking for GST Returns, ITR Filings, Statutory Audits, Assessment Proceedings, and Appeals.
- **Granular Task Checklists**: Structured checklists with timestamped completions, internal notes, and audit logs.

### 6. 🗄️ Smart DMS PRO Document Vault
- **Categorized Secure Storage**: Client-wise and category-wise storage for Permanent Files, PAN/Aadhaar, Incorporation Documents, Financial Statements, and Audit Reports.
- **Storage Integration**: Direct integration with dedicated Supabase S3-compatible storage buckets.

### 7. 📝 Staff Daily Reports & Timesheets
- **Daily Activity Logging**: Track daily tasks completed, time spent, client billable hours, and task progress per staff member.
- **Partner Review**: Real-time dashboard for Partners to review staff work logs and productivity metrics.

### 8. 👥 Role-Based Access Control (RBAC) & Security
- **Dual-Tier Permissions**: Strict permission enforcement separating `OWNER` (Partners) from `STAFF` (Associates/Assistants).
- **PostgreSQL Row-Level Security (RLS)**: Database-level policy protection ensuring authoritative data boundaries.
- **Immutable Audit Trail**: System-wide audit logging for all critical operations (login, invoices, compliance filings, client updates).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Core** | React 19, TypeScript 5.8, Motion (Framer Motion) |
| **Build & Tooling** | Vite 6.4, PostCSS, LightningCSS |
| **Styling** | Tailwind CSS 4.0, Custom Curated HSL Themes |
| **Icons & UI** | Lucide React, QRCode React, Recharts |
| **Database & Auth** | Supabase PostgreSQL RDBMS, Supabase Realtime WebSockets |
| **PDF Generation** | jsPDF 4.2 + html2canvas (High-Res 2x Scale Client-Side Rendering) |
| **Security** | PostgreSQL RLS Policies, Argon2 / SHA-256 Hashing, OTP Verification |

---

## 🏗️ System Architecture

```
                                  ┌──────────────────────────────┐
                                  │      React 19 Frontend       │
                                  │   (Vite + Tailwind CSS 4)    │
                                  └──────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
     ┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
     │  FinancialEngine.tsx   │     │ PrivateStaffChat.tsx   │     │ ComplianceRegister.tsx │
     │  (Invoice / Ledgers)   │     │ (Real-Time Messaging)  │     │   (491 Due Dates)      │
     └───────────┬────────────┘     └────────────┬───────────┘     └────────────┬───────────┘
                 │                               │                              │
                 ▼                               ▼                              ▼
     ┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
     │CentralInvoiceRepository│     │ PrivateChatRepository  │     │  ComplianceRepository  │
     └───────────┬────────────┘     └────────────┬───────────┘     └────────────┬───────────┘
                 │                               │                              │
                 └───────────────────────────────┼──────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     Supabase PostgreSQL      │
                                  │   Authoritative RDBMS & RLS  │
                                  └──────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (or **pnpm** / **yarn**)

### 1. Clone the Repository
```bash
git clone https://github.com/jainnagarwal26-itr/JNOfficeOS.git
cd JNOfficeOS
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://hljwxadlzlfokeyimcbm.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 5. Production Build
```bash
npm run build
```

---

## 🔒 Production Baselines & Data Integrity

- **Database Source of Truth**: Supabase PostgreSQL (`hljwxadlzlfokeyimcbm`)
- **Active Client Identities**: `CL000001`, `CL000002`, `CL000003`
- **Active Staff Identities**: `STF000001` (Partner/Owner), `STF000002` (Staff), `STF000003` (Staff), `STF000004` (Staff)
- **Services Master**: 29 Standard Practice Services across 7 Categories (including PTEC `SRV00015`, PTRC `SRV00016`)
- **Compliance Baseline**: 491 Statutory Due Date Records
- **Google Sheets**: Fully Decommissioned — Supabase PostgreSQL is the sole authoritative backend.

---

## 📄 License & Intellectual Property

Developed exclusively for **Jain Agarwal & Co.** (Chartered Accountants & Tax Advisors).  
Copyright © 2026 Jain Agarwal & Co. All rights reserved.
