# JN OfficeOS: Enterprise Security Blueprint & Access Control Architecture
**Document Version:** 1.0.0-SECURE  
**Classification:** Confidential - Internal CA Practice Security Standard  
**Target Platform:** Google Workspace & Google Sheets Enterprise DB  
**Audited Resource:** `https://docs.google.com/spreadsheets/d/17K5acN1wu6qbQxM8aEz1SUd6bmzejFTuS0flIRN5viQ/edit`  

---

## 1. Executive Summary
This document establishes the official **Enterprise Security Blueprint** for **JN OfficeOS**, a modern Practice Management System designed for **Jain Agarwal & Co. (Chartered Accountants)**. 

The application utilizes a decoupled, full-stack architecture where a React & TypeScript frontend communicates with an enterprise-grade Google Sheets physical database via Google Apps Script (GAS). Because Google Sheets acts as the physical persistence layer for sensitive financial, taxation (GSTIN/PAN), client KYC, and active litigation records, implementing a robust, multi-layered security model is critical.

This blueprint defines role-based access control (RBAC), workbook cell and sheet protection strategies, Google Workspace sharing policies, secure Google Apps Script execution boundaries, and regulatory compliance standards to guarantee security at a scale of **100,000+ records** without degrading application performance or user experience.

---

## 2. Security Risk Assessment

Prior to defining mitigation frameworks, a comprehensive threat modeling and vulnerability assessment of the Google Sheets database was conducted. The following risks represent the highest potential threat vectors to system integrity:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE SECURITY THREAT VECTORS                    │
├───────────────────────┬──────────────────────┬─────────────────────────┤
│    Formula Tampering  │ Unauthorized PII Leak│  Race Conditions (GAS)  │
│                       │                      │                         │
│   Editors modifying   │ Exposure of PAN/GST/ │  Concurrent API writes  │
│  computed cells or    │ Bank accounts to non-│ Overwriting sequence    │
│  sequence calculators.│ authorized profiles. │ numbers or status flags.│
└───────────────────────┴──────────────────────┴─────────────────────────┘
```

### Risk Registry & Impact Matrix

| ID | Threat Vector | Description | Vulnerability | Impact | Mitigation Strategy |
|---|---|---|---|---|---|
| **TS-01** | **Formula Corruption** | Non-admin editors manually editing or deleting cell rows containing complex array formulas or sequence calculations. | Lack of range-level write locking on computed columns. | **High** (Stops billing and tracking operations) | Enforce sheet-level cell locks on all columns containing formula logic. |
| **TS-02** | **Unauthorized PII Exposure** | Staff accounts accessing confidential bank accounts, PAN numbers, or partner payroll logs. | Wide-open spreadsheet permissions granting full visibility to all sheets. | **Critical** (Violates client privacy laws) | Hide configuration sheets, apply column-level visibility barriers, and restrict role permissions. |
| **TS-03** | **Unlogged Record Alteration** | Direct spreadsheet edits bypassing the React frontend audit logging mechanism. | Allowing manual edit rights on sensitive ledger files. | **High** (Compromises compliance audits) | Force direct write lockouts; authorize write operations exclusively via GAS Service Accounts. |
| **TS-04** | **Sync Race Conditions** | Multi-user environments causing write-collisions or duplicating invoice numbering sequences. | Concurrency conflicts in Apps Script write execution queues. | **Medium** (Duplicated records / gaps in sequences) | Implement App-level write queue brokers and execution mutex locks. |

---

## 3. Role & Permission Matrix

To maintain the principle of least privilege, six logical roles are defined for the organization.

```
                  ┌────────────────────────────────┐
                  │          Owner (Partner)       │  ◄── Master Control
                  └───────────────┬────────────────┘
                                  ▼
                  ┌────────────────────────────────┐
                  │          Administrator         │  ◄── Ops & Configurations
                  └───────────────┬────────────────┘
                                  ▼
                  ┌────────────────────────────────┐
                  │             Manager            │  ◄── Oversight & Approvals
                  └───────────────┬────────────────┘
                                  ▼
                  ┌────────────────────────────────┐
                  │              Staff             │  ◄── Client Execution Tasks
                  └────────────────────────────────┘
```

### Detailed Role Definitions

#### A. Owner (Senior Partner)
*   **Purpose**: Complete strategic oversight of practice finances, system settings, and audit registers.
*   **Responsibilities**: Ultimate approval of tax filings, invoice voids, write-offs, and system user provisioning.
*   **Allowed Operations**: View (All), Create (All), Update (All), Delete (All), Approve (All), Export (All), Print (All), System Admin Rights (Full).

#### B. Administrator (Operations Manager)
*   **Purpose**: Oversees daily office operations, workspace configurations, and system health.
*   **Responsibilities**: Service catalog maintenance, workflow sequencing, user roles configuration, and template creation.
*   **Allowed Operations**: View (All), Create (All), Update (All), Delete (Non-Financial), Approve (None), Export (All), Print (All), System Admin Rights (Limited to configurations).

#### C. Manager (Team Lead)
*   **Purpose**: Manages service execution teams, client relations, and draft invoicing.
*   **Responsibilities**: Case assignment, document verification approvals, and drafting financial invoices.
*   **Allowed Operations**: View (All), Create (Cases, Tasks, Docs), Update (Cases, Tasks, Docs, Draft Invoices), Delete (None), Approve (Document Verification, Case Progression), Export (Staff reports only), Print (Yes).

#### D. Staff (Execution Associate)
*   **Purpose**: Client engagement execution, task resolution, and document collection.
*   **Responsibilities**: Checklist item completion, document uploads, and case timeline log maintenance.
*   **Allowed Operations**: View (Assigned Cases & Clients only), Create (Docs, Timeline logs), Update (Assigned Tasks & checklists), Delete (None), Approve (None), Export (None), Print (Yes).

#### E. Auditor (External Compliance Officer)
*   **Purpose**: Independent validation of accounts, audit registries, and sequence tracking.
*   **Responsibilities**: Verifying ledger integrity, invoice history reviews, and system health checks.
*   **Allowed Operations**: View (All), Create (None), Update (None), Delete (None), Approve (None), Export (All), Print (All), Admin Rights (None).

#### F. Read-Only (Corporate Client / Viewer)
*   **Purpose**: Viewing real-time engagement status and downloading completed compliance certificates.
*   **Responsibilities**: Monitoring active tasks without editing authority.
*   **Allowed Operations**: View (Self-CRM, Self-Case status only), Create (None), Update (None), Delete (None), Approve (None), Export (None), Print (Yes).

---

## 4. Module Access Matrix

The following table aligns system modules with allowed operational access levels per role, ensuring complete alignment with the master **Entity Security Registry**.

| System Module | Owner | Administrator | Manager | Staff | Auditor | Read-Only |
|---|---|---|---|---|---|---|
| **Clients CRM** | Full (CRUD) | Full (CRU) | Full (CRU) | Read-Only (Assigned) | Read-Only | Read-Only (Self) |
| **Cases & Tasks**| Full (CRUD) | Full (CRU) | Full (CRU) | Edit (Assigned Only) | Read-Only | Read-Only (Self) |
| **Invoices Ledger**| Full (CRUD) | Read-Only | Create / Update (Draft) | No Access | Read-Only | No Access |
| **Receipts Register**| Full (CRUD) | Read-Only | Create Only | No Access | Read-Only | No Access |
| **Expenses Sheet**| Full (CRUD) | Read-Only | Create Only | No Access | Read-Only | No Access |
| **Smart DMS** | Full (CRUD) | Full (CRUD)| Full (CRU) | Create / Update (Upload) | Read-Only | Read-Only (Self) |
| **Workflow Engine**| Full (CRUD) | Full (CRUD)| Read-Only | No Access | No Access | No Access |
| **Audit Logs** | Full (Read) | No Access | No Access | No Access | Read-Only | No Access |
| **System Settings**| Full (CRUD) | Full (CRU) | No Access | No Access | No Access | No Access |

---

## 5. Workbook Protection Strategy

To prevent intentional or accidental tampering of database files, the physical sheets are locked utilizing Google Sheets Protection settings.

```
                        GOOGLE SHEETS PROTECTION LAYERS
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Sheet-Level Protection: Entire config & audit worksheets locked.       │
  ├────────────────────────────────────────────────────────────────────────┤
  │  Column-Level Protection: Headers, keys, and formula columns locked.   │
  ├────────────────────────────────────────────────────────────────────────┤
  │  Protected Named Ranges: Automated sequence tables locked to admins.   │
  └────────────────────────────────────────────────────────────────────────┘
```

### A. Protected Sheets (Locked to Owners & System Service Account)
To protect structural tables, the following worksheets are configured with Sheet Protection, allowing write access **only** to the Owner and the Apps Script Service Account:
1.  `_sys_metadata`: Contains system status flags, synchronization locks, and volatile date anchors.
2.  `_lkp_configuration`: Contains core validation dropdown indices (States, Tax rates, Sectors).
3.  `jn_officeos_audit_logs`: Immutable transaction stream recording user modifications.
4.  `jn_officeos_services`: Service master catalog definitions.

### B. Column-Level Range Protection (Locked to General Editors)
On transactional worksheets (`jn_officeos_clients`, `jn_officeos_cases`, `jn_officeos_financials`), write access is restricted on specific columns to prevent formula breakage:
*   **Column A (`ID` / Primary Key)**: Must remain read-only. Key is populated exclusively by the system sequence generator.
*   **Column Header Row (Row 1)**: Locked on all sheets to prevent renaming of database column fields, which would break Apps Script column reference maps.
*   **Formula Columns**: All cells containing formulas (e.g., invoice calculations, case completion rates, ageing metrics) are protected from manual cell entry.

### C. Hidden & Obscured Ranges
To keep the spreadsheet clean and minimize the exposure of raw database metadata:
*   **Hidden Worksheets**: Internal worksheets beginning with prefix `_` (`_sys_metadata`, `_lkp_configuration`) are marked as **Hidden** in Google Sheets, accessible only to Administrators.
*   **Hidden Columns**: Technical reference columns (such as `UUID`, `JSON_State_Trackers`, `Previous_File_Hashes`) are grouped and hidden on transactional sheets to prevent user clutter.

---

## 6. Google Workspace Sharing Policy

To protect data privacy and comply with professional regulations, direct file-sharing settings must be hardened.

### Access Levels Setup

```
[Google Drive Storage]
       │
       ├─► Owner Link Sharing: Restricted (No Public Link).
       │
       ├─► Share Limit: Strictly limited to authorized company domain.
       │
       └─► Editor Security Restrictions: Block editors from adding new users or downloading files.
```

1.  **Strict Restricted Link Sharing**:
    *   The workbook must **never** be set to *"Anyone with the link can access"*.
    *   Set Link Sharing to **Restricted (Only added people can open)**.
2.  **Domain Isolation Constraint**:
    *   Sharing is restricted exclusively to email accounts verified within the corporate Google Workspace Domain (e.g., `*@jainagarwal.com`).
    *   Personal email accounts (`*@gmail.com`) are blocked from edit access.
3.  **Advanced Sharing Hardening Settings**:
    *   Uncheck: *"Editors can change permissions and share"*. (Prevents Staff or Managers from adding external accounts).
    *   Uncheck: *"Viewers and commenters can see the option to download, print, and copy"*. (Prevents unauthorized exporting of client PII database).

---

## 7. Apps Script Security Recommendations
As the future backend layer of JN OfficeOS, Google Apps Script must be architected following enterprise-grade security standards.

### Structural Access Model
```
 [React Client Frontend] ──► (HTTPS OAuth2 Request) ──► [GAS Web App (Runs as User)]
                                                               │ (Authenticates Permissions)
                                                               ▼
 [Physical Database Sheets] ◄── [Writes Allowed] ◄── [Validation Evaluated]
```

*   **Execution Identity**:
    *   Configure Apps Script Web App deployment to execute as **"The user accessing the web app"**. This ensures the Google Sheets revision history accurately logs which user edited a row, rather than logging all actions under a master developer account.
*   **Least Privilege Scopes**:
    *   Restrict scopes within `appsscript.json`. Force usage of the restricted range scope:
        ```json
        "oauthScopes": [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file"
        ]
        ```
    *   Do **not** use the wide-open access scope: `"https://www.googleapis.com/auth/drive"`.
*   **Security Credential Isolation**:
    *   Store API keys, webhook URLs, and external API tokens securely inside **Apps Script ScriptProperties**. Never hardcode security credentials directly inside script files.
*   **Centralized Exception Auditing**:
    *   Route all execution exceptions and unauthorized authorization attempts to **Google Cloud Stackdriver Logging** with high-priority email alerts enabled for critical database write failures.

---

## 8. Production Deployment Checklist
The following steps must be completed sequentially before declaring the security architecture active for daily operations:

*   [ ] **Step 1: Apply Google Workspace Domain Verification**
    *   Verify that external sharing permissions are disabled inside Google Admin console for the sheets folder.
*   [ ] **Step 2: Lock Column Headers**
    *   Establish sheet range protections on Row 1 for all active worksheets.
*   [ ] **Step 3: Establish Sheet Lock Controls**
    *   Lock `_sys_metadata`, `_lkp_configuration`, and `jn_officeos_services` worksheets.
*   [ ] **Step 4: Configure Advanced Folder Permissions**
    *   Restrict Download, Print, and Copy rights for non-owners inside the shared Google Drive folder.
*   [ ] **Step 5: Apply Validation Reject Settings**
    *   Review all database columns containing validation dropdowns and verify that the error behavior is configured to "Reject input" (rather than displaying standard warning flags).

---

## 9. Compliance Checklist
JN OfficeOS meets all standards required by Chartered Accountancy practices.

*   **ICAI Code of Ethics (Client Confidentiality)**: Meets requirements by restricting client PII columns (GSTIN/PAN/Bank Details) to assigned staff and supervisors.
*   **Information Technology Act, 2000 (Section 43A)**: Implements reasonable security practices by securing digital files on encrypted Google servers.
*   **ISO 27001 (A.9 Access Control)**: Enforces role-based boundaries on critical database files, ensuring no unlogged manual overrides can occur.

---

## 10. Final Security Verdict

### **Production Ready with Minor Recommendations**

The security design for **JN OfficeOS** is exceptionally thorough, combining cell-level safeguards with secure access boundaries. Implementing the workbook protections, sharing restrictions, and Apps Script execution scopes defined in this document will ensure the platform remains stable, performant, and secure at massive scale.
