/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TableSchema } from "../types";

export const GOOGLE_SHEETS_SCHEMA: TableSchema[] = [
  {
    tableName: "jn_clients",
    description: "Stores client profile details, tax identifiers (GSTIN, PAN), contact info, and status.",
    columns: [
      { name: "Client ID", type: "string", description: "Unique client identifier (e.g., CLI-00001)", required: true },
      { name: "Client Name", type: "string", description: "Full Legal or Entity Name", required: true },
      { name: "Trade Name", type: "string", description: "Business Trade Name (if applicable)", required: false },
      { name: "GSTIN", type: "string", description: "15-digit Goods and Services Tax Identification Number", required: false },
      { name: "PAN", type: "string", description: "10-character Permanent Account Number", required: false },
      { name: "Email", type: "string", description: "Primary contact email address", required: true },
      { name: "Mobile", type: "string", description: "Contact mobile number", required: true },
      { name: "Address", type: "string", description: "Registered business or correspondence address", required: true },
      { name: "Group Category", type: "string", description: "E.g., GST Client, ITR Client, Corporate, Loan Case", required: true },
      { name: "Status", type: "string", description: "ACTIVE or INACTIVE", required: true },
      { name: "Created At", type: "date", description: "Date of client registration", required: true }
    ]
  },
  {
    tableName: "jn_services",
    description: "Central catalog of services provided by the firm along with standard fees.",
    columns: [
      { name: "Service ID", type: "string", description: "Unique service identifier (e.g., SRV-001)", required: true },
      { name: "Service Name", type: "string", description: "Name of the professional service", required: true },
      { name: "Category", type: "string", description: "E.g., Income Tax, GST, Audit, Loans, Business Registration", required: true },
      { name: "Standard Fee (INR)", type: "number", description: "Standard base fee for the service", required: true },
      { name: "Description", type: "string", description: "Detailed scope of the service", required: false },
      { name: "Created At", type: "date", description: "Date service was added to catalog", required: true }
    ]
  },
  {
    tableName: "jn_invoices",
    description: "Invoices raised for services rendered, including tax details and status.",
    columns: [
      { name: "Invoice Number", type: "string", description: "Sequential Invoice No. (e.g., JNA/2026-27/00001)", required: true },
      { name: "Invoice Date", type: "date", description: "Date of invoice generation", required: true },
      { name: "Client ID", type: "string", description: "ID of the billed client", required: true },
      { name: "Client Name", type: "string", description: "Name of the billed client", required: true },
      { name: "Service ID List", type: "string", description: "Comma-separated service IDs rendered", required: true },
      { name: "Sub Total (INR)", type: "number", description: "Taxable value of services", required: true },
      { name: "GST Amount (INR)", type: "number", description: "Applicable GST (e.g., 18%)", required: true },
      { name: "Total Amount (INR)", type: "number", description: "Grand total (Sub Total + GST)", required: true },
      { name: "Due Date", type: "date", description: "Payment deadline date", required: true },
      { name: "Status", type: "string", description: "UNPAID, PAID, OVERDUE, or VOID", required: true },
      { name: "Created At", type: "date", description: "System timestamp of creation", required: true }
    ]
  },
  {
    tableName: "jn_receipts",
    description: "Records of payments received from clients matching respective invoices.",
    columns: [
      { name: "Receipt Number", type: "string", description: "Unique Receipt No. (e.g., REC/2026-27/00001)", required: true },
      { name: "Receipt Date", type: "date", description: "Date of payment receipt", required: true },
      { name: "Invoice Number", type: "string", description: "Associated invoice number", required: true },
      { name: "Client Name", type: "string", description: "Name of the paying client", required: true },
      { name: "Amount Received (INR)", type: "number", description: "Amount paid by client", required: true },
      { name: "Payment Mode", type: "string", description: "E.g., Bank Transfer, UPI, Cheque, Cash", required: true },
      { name: "Transaction Ref No", type: "string", description: "Upi ID, Cheque number or Bank Transaction reference", required: false },
      { name: "Remarks", type: "string", description: "Internal notes or remarks", required: false },
      { name: "Created At", type: "date", description: "System timestamp of creation", required: true }
    ]
  },
  {
    tableName: "jn_expenses",
    description: "Tracks office expenses such as rent, utilities, software subscriptions, salaries.",
    columns: [
      { name: "Expense ID", type: "string", description: "Unique Expense ID (e.g., EXP-00001)", required: true },
      { name: "Date", type: "date", description: "Expense transaction date", required: true },
      { name: "Category", type: "string", description: "E.g., Salaries, Rent, Utilities, Printing & Stationery, Travel", required: true },
      { name: "Paid To", type: "string", description: "Name of vendor, entity or person paid", required: true },
      { name: "Amount (INR)", type: "number", description: "Expense amount paid", required: true },
      { name: "Payment Mode", type: "string", description: "E.g., Bank, UPI, Cash", required: true },
      { name: "Reference Number", type: "string", description: "Payment transaction reference", required: false },
      { name: "Remarks", type: "string", description: "Brief description of expense purpose", required: false },
      { name: "Created At", type: "date", description: "System timestamp of creation", required: true }
    ]
  },
  {
    tableName: "jn_users",
    description: "System user profiles, login credentials and status tracking.",
    columns: [
      { name: "User ID", type: "string", description: "Unique user UUID", required: true },
      { name: "Email", type: "string", description: "Login email (unique)", required: true },
      { name: "Password Hash", type: "string", description: "SHA-256 salted password hash", required: true },
      { name: "Role", type: "string", description: "OWNER or STAFF", required: true },
      { name: "Status", type: "string", description: "ACTIVE or INACTIVE", required: true },
      { name: "Created At", type: "date", description: "Date of profile creation", required: true }
    ]
  },
  {
    tableName: "jn_staff",
    description: "Detailed staff directories, user profiles, designation and permission blocks.",
    columns: [
      { name: "User ID", type: "string", description: "User ID linking back to jn_users authentication master", required: true },
      { name: "Name", type: "string", description: "Full legal or display name", required: true },
      { name: "Username", type: "string", description: "Unique identifier name", required: true },
      { name: "Mobile", type: "string", description: "Contact mobile number", required: true },
      { name: "Designation", type: "string", description: "E.g., Managing CA, Consultant", required: true },
      { name: "Joining Date", type: "date", description: "Staff joining date", required: true },
      { name: "Permissions", type: "json", description: "Granular access configuration", required: true }
    ]
  },
  {
    tableName: "jn_audit_log",
    description: "Immutable practice ledger logs tracking security actions, authentication, and database modifications.",
    columns: [
      { name: "Log ID", type: "string", description: "Unique audit log identifier", required: true },
      { name: "Timestamp", type: "date", description: "System timestamp of event", required: true },
      { name: "User Email", type: "string", description: "Email of the actor", required: true },
      { name: "User Name", type: "string", description: "Name of the actor", required: true },
      { name: "Role", type: "string", description: "Role at time of action", required: true },
      { name: "Action", type: "string", description: "Short description of action (e.g. USER_LOGIN)", required: true },
      { name: "Category", type: "string", description: "AUTH, SECURITY, DATABASE, SETTINGS, or SYSTEM", required: true },
      { name: "Details", type: "string", description: "Exhaustive details of change state", required: true }
    ]
  }
];
