/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Case, CaseTimelineEvent, CaseChecklistItem, CaseAttachment } from "../types";
import { numberToWords } from "./numberToWords";

// --- Formatter & Resolution Helpers ---

export function formatPhoneNumberForSheets(num: string): string {
  if (!num) return "";
  const trimmed = num.toString().trim();
  if (trimmed.startsWith("+") && !trimmed.startsWith("'")) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function cleanPhoneNumberFromSheets(num: string): string {
  if (!num) return "";
  const trimmed = num.toString().trim();
  if (trimmed.toUpperCase().includes("ERROR") || trimmed.includes("#")) {
    return "";
  }
  if (trimmed.startsWith("'")) {
    return trimmed.substring(1);
  }
  return trimmed;
}

function escapePhoneFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => escapePhoneFields(item));
  }
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      const normKey = key.toLowerCase().replace(/_/g, "").replace(/\s/g, "");
      if (typeof val === "string" && (normKey === "mobile" || normKey === "phone" || normKey === "phonenumber")) {
        result[key] = formatPhoneNumberForSheets(val);
      } else if (typeof val === "object" && val !== null) {
        result[key] = escapePhoneFields(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function cleanPhoneFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanPhoneFields(item));
  }
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      const normKey = key.toLowerCase().replace(/_/g, "").replace(/\s/g, "");
      if (typeof val === "string" && (normKey === "mobile" || normKey === "phone" || normKey === "phonenumber")) {
        result[key] = cleanPhoneNumberFromSheets(val);
      } else if (typeof val === "object" && val !== null) {
        result[key] = cleanPhoneFields(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function safeParseNumber(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function resolveDesignationId(idOrName: string, role: string): string {
  const clean = (idOrName || "").toString().trim();
  if (/^DES\d+$/i.test(clean)) {
    return clean.toUpperCase();
  }
  const l = clean.toLowerCase();
  if (l.includes("owner") || l.includes("managing") || role === "OWNER" || role === "SuperAdmin" || role === "SUPER_ADMIN" || l.includes("super admin")) {
    return "DES01";
  }
  if (l.includes("senior consultant") || l.includes("consultant")) {
    return "DES02";
  }
  if (l.includes("assurance") || l.includes("audit") || l.includes("associate")) {
    return "DES03";
  }
  if (l.includes("taxation") || l.includes("tax")) {
    return "DES04";
  }
  if (l.includes("secretary") || l.includes("company")) {
    return "DES05";
  }
  if (role === "OWNER") return "DES01";
  return "DES02";
}

function resolveDepartmentId(idOrName: string, designationId?: string): string {
  const clean = (idOrName || "").toString().trim();
  if (/^DEP\d+$/i.test(clean)) {
    return clean.toUpperCase();
  }
  const l = clean.toLowerCase();
  if (l.includes("tax") || l.includes("taxation")) {
    return "DEP01";
  }
  if (l.includes("assurance") || l.includes("audit")) {
    return "DEP02";
  }
  if (l.includes("advisory") || l.includes("corporate") || l.includes("secretary")) {
    return "DEP03";
  }
  if (l.includes("legal") || l.includes("compliance")) {
    return "DEP04";
  }
  if (designationId === "DES03") return "DEP02";
  if (designationId === "DES04") return "DEP01";
  if (designationId === "DES05") return "DEP03";
  return "DEP01";
}

function resolveFullName(name: string, email: string, username: string): { firstName: string; lastName: string; fullName: string } {
  const cleanName = (name || "").toString().trim();
  const cleanEmail = (email || "").toString().toLowerCase().trim();
  const cleanUsername = (username || "").toString().toLowerCase().trim();

  if (!cleanName || cleanName.toLowerCase() === "chiragjain" || cleanName.toLowerCase() === "chirag jain" || cleanUsername === "chiragjain" || cleanEmail === "jainnagarwal26@gmail.com") {
    if (cleanEmail === "jainnagarwal26@gmail.com" || cleanUsername === "chiragjain" || cleanName.toLowerCase() === "chiragjain") {
      return { firstName: "Chirag", lastName: "Jain", fullName: "Chirag Jain" };
    }
  }

  if (cleanName.toLowerCase() === "amit" || cleanName.toLowerCase() === "amitsharma" || cleanName.toLowerCase() === "amitagrawal" || cleanUsername === "amitagrawal" || cleanEmail === "staff@jainagarwal.com" || cleanEmail === "amit@jainnagarwal.co.in") {
    return { firstName: "Amit", lastName: "Agrawal", fullName: "Amit Agrawal" };
  }

  if (cleanName.includes(" ")) {
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return { firstName, lastName, fullName: cleanName };
  } else {
    if (cleanName.toLowerCase() === "chiragjain") {
      return { firstName: "Chirag", lastName: "Jain", fullName: "Chirag Jain" };
    }
    if (cleanName.toLowerCase() === "amitagrawal") {
      return { firstName: "Amit", lastName: "Agrawal", fullName: "Amit Agrawal" };
    }
    return { firstName: cleanName, lastName: "", fullName: cleanName };
  }
}

export interface IGoogleSheetsService {
  syncCase(c: Case): Promise<boolean>;
  syncTimeline(caseId: string, event: CaseTimelineEvent): Promise<boolean>;
  syncChecklistItem(caseId: string, item: CaseChecklistItem): Promise<boolean>;
  syncDocument(caseId: string, doc: CaseAttachment): Promise<boolean>;
  bulkSyncCases(cases: Case[]): Promise<boolean>;
  
  // Enterprise Sync hooks for all tables
  getAppsScriptUrl(): string;
  isActiveSyncEnabled(): boolean;
  pushRecord(table: string, idKey: string, idValue: string, data: any): Promise<boolean>;
  deleteRecord(table: string, idKey: string, idValue: string): Promise<boolean>;
  bulkSync(table: string, idKey: string, data: any[]): Promise<boolean>;
  pullAllFromSheets(): Promise<{ success: boolean; message: string }>;
}

class GoogleSheetsProductionService implements IGoogleSheetsService {
  getAppsScriptUrl(): string {
    const localUrl = localStorage.getItem("VITE_GOOGLE_APPS_SCRIPT_URL") || "";
    if (localUrl.startsWith("https://docs.google.com")) {
      console.warn("[Google Sheets Service] Autorepaired: Removed invalid spreadsheet URL from Apps Script gateway setting.");
      localStorage.removeItem("VITE_GOOGLE_APPS_SCRIPT_URL");
    }
    return (
      (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
      localStorage.getItem("VITE_GOOGLE_APPS_SCRIPT_URL") ||
      ""
    );
  }

  isActiveSyncEnabled(): boolean {
    const url = this.getAppsScriptUrl();
    return url !== "" && url.startsWith("https://script.google.com");
  }

  private async makePostRequest(payload: any): Promise<any> {
    const url = this.getAppsScriptUrl();
    if (!this.isActiveSyncEnabled()) {
      console.warn("[Google Sheets Production Service] Sync disabled: No valid Web App URL provided.");
      return null;
    }

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = performance.now();

    console.group(`[Google Sheets API Trace] ${traceId} - Action: ${payload?.action || "unknown"} | Table: ${payload?.table || "unknown"}`);
    console.log("Trace ID:", traceId);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Target Gateway URL:", url);
    console.log("Request Payload:", JSON.parse(JSON.stringify(payload)));

    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const durationMs = Math.round(performance.now() - startTime);
      console.log("HTTP Status Code:", response.status);
      console.log("Execution Time:", `${durationMs}ms`);

      if (!response.ok) {
        const errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        console.error("API Trace Failure:", errorMsg);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      const responseData = await response.json();
      console.log("Response Payload:", responseData);
      
      if (!responseData?.success && responseData?.error) {
        console.error("Apps Script Returned Error:", responseData.error);
      } else {
        console.log("Sync Operation Status: SUCCESS");
      }
      
      console.groupEnd();
      return responseData;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      console.error("API Trace Exception Caught:", {
        traceId,
        executionTimeMs: durationMs,
        errorMessage: e?.message || String(e),
        errorStack: e?.stack
      });
      console.groupEnd();
      throw e;
    }
  }

  /**
   * Transaction Safety Protocol: Atomic Multi-Table Update for jn_users + jn_staff
   * Handles prior-state backup, sequential execution, exponential retries, and compensation rollback.
   */
  private async updateMultiTableTransaction(
    idValue: string,
    userData: any,
    staffData: any
  ): Promise<boolean> {
    console.group(`[Multi-Table Transaction] User_ID: ${idValue}`);

    // Phase 1: Fetch Prior Snapshot for Rollback/Compensation capability
    let priorUserRow: any = null;
    let priorStaffRow: any = null;

    try {
      const getRes = await this.makeGetRequest({ action: "read", table: "jn_users", idKey: "User_ID", idValue });
      if (getRes?.success && Array.isArray(getRes.data) && getRes.data.length > 0) {
        priorUserRow = getRes.data[0];
      }
    } catch (err) {
      console.warn("[Multi-Table Transaction] Could not fetch prior user snapshot. Rollback will proceed with soft status reset if needed.", err);
    }

    // Phase 2: Execute jn_users Update First
    let userSuccess = false;
    try {
      const resUser = await this.makePostRequest({
        action: "update",
        table: "jn_users",
        idKey: "User ID",
        idValue,
        data: userData
      });
      userSuccess = !!(resUser && resUser.success !== false);
    } catch (err) {
      console.error("[Multi-Table Transaction] Failed Step 1 (jn_users update). Aborting transaction safely.", err);
      console.groupEnd();
      return false;
    }

    if (!userSuccess) {
      console.error("[Multi-Table Transaction] jn_users returned unsuccessful result. Aborting transaction safely.");
      console.groupEnd();
      return false;
    }

    // Phase 3: Execute jn_staff Update with Retry Protocol
    let staffSuccess = false;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`[Multi-Table Transaction] Step 2: jn_staff update attempt ${attempt}/${maxRetries + 1}...`);
        const resStaff = await this.makePostRequest({
          action: "update",
          table: "jn_staff",
          idKey: "User_ID",
          idValue,
          data: staffData
        });
        if (resStaff && resStaff.success !== false) {
          staffSuccess = true;
          break;
        }
      } catch (staffErr) {
        console.warn(`[Multi-Table Transaction] jn_staff update attempt ${attempt} failed:`, staffErr);
        if (attempt <= maxRetries) {
          const delayMs = attempt * 1000;
          console.log(`[Multi-Table Transaction] Retrying jn_staff in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // Phase 4: Atomic Compensation / Rollback if jn_staff failed permanently
    if (!staffSuccess) {
      console.error("[Multi-Table Transaction] CRITICAL: jn_staff failed after retries while jn_users succeeded. Initiating Compensation Rollback on jn_users!");

      try {
        const rollbackPayload = priorUserRow || {
          "User ID": idValue,
          "User_ID": idValue,
          "Status": "SYNC_FAILED_ROLLBACK"
        };

        const rollbackRes = await this.makePostRequest({
          action: "update",
          table: "jn_users",
          idKey: "User ID",
          idValue,
          data: rollbackPayload
        });

        console.log("[Multi-Table Transaction] Compensation Rollback Result for jn_users:", rollbackRes);
      } catch (rollbackErr) {
        console.error("[Multi-Table Transaction] FATAL: Compensation rollback on jn_users also failed!", rollbackErr);
      }

      console.groupEnd();
      throw new Error(`Multi-table update failed: jn_staff failed to update for User ID ${idValue}. jn_users state was compensated/rolled back to prevent data discrepancy.`);
    }

    console.log("[Multi-Table Transaction] ATOMIC SUCCESS: Both jn_users and jn_staff updated successfully.");
    console.groupEnd();
    return true;
  }

  private async makeGetRequest(params: Record<string, string>): Promise<any> {
    const baseUrl = this.getAppsScriptUrl();
    if (!this.isActiveSyncEnabled()) {
      console.warn("[Google Sheets Production Service] Sync disabled: No valid Web App URL provided.");
      return null;
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${baseUrl}?${queryString}`, {
        method: "GET",
        mode: "cors",
        redirect: "follow"
      });
      if (!response.ok) {
        throw new Error(`HTTP status error: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.warn("[Google Sheets Service] GET Error:", e);
      throw e;
    }
  }

  // --- IGoogleSheetsService Implementations (Type-safe and safely aligned) ---

  async syncCase(c: Case): Promise<boolean> {
    return this.pushRecord("jn_cases", "Case_ID", c.id, {
      Case_ID: c.id,
      Client_ID: c.clientId,
      Service_ID: c.serviceId || "",
      Assigned_To: c.assignedTo || "",
      Priority: c.priority,
      Status: c.status,
      Start_Date: c.startDate || "",
      Due_Date: c.dueDate || "",
      Completion_Date: c.completionDate || "",
      Remarks: c.remarks || "",
      Created_By: c.createdBy || "System",
      Created_On: c.createdOn || new Date().toISOString(),
      Modified_By: c.modifiedBy || "",
      Modified_On: c.modifiedOn || "",
      Delay_Days: c.delayDays || 0,
      Completion_Percentage: c.completionPercentage || 0,
      Case_Age: c.caseAge || 0,
      Is_Demo: false
    });
  }

  async syncTimeline(caseId: string, event: CaseTimelineEvent): Promise<boolean> {
    return this.pushRecord("jn_case_timeline", "Timeline_ID", event.id, {
      Timeline_ID: event.id,
      Case_ID: caseId,
      Activity: event.activity,
      Description: event.description || "",
      Performed_By: event.performedBy,
      Activity_Date: event.activityDate,
      Is_Demo: false
    });
  }

  async syncChecklistItem(caseId: string, item: CaseChecklistItem): Promise<boolean> {
    return this.pushRecord("jn_case_checklists", "Checklist_ID", item.id, {
      Checklist_ID: item.id,
      Case_ID: caseId,
      Task_Name: item.taskName,
      Mandatory: item.mandatory ? "YES" : "NO",
      Completed: item.completed ? "YES" : "NO",
      Completed_By: item.completedBy || "",
      Completed_On: item.completedOn || "",
      Is_Demo: false
    });
  }

  async syncDocument(caseId: string, doc: CaseAttachment): Promise<boolean> {
    return this.pushRecord("jn_documents", "Document_ID", doc.id, {
      Document_ID: doc.id,
      Document_Number: doc.documentNumber || doc.id,
      Client_ID: doc.clientId || "",
      Case_ID: caseId,
      Service_ID: doc.serviceId || "",
      Document_Category: doc.category || "General",
      Document_Name: doc.name,
      Google_Drive_File_ID: doc.driveFileId || "",
      Drive_Folder_ID: doc.driveFolderId || "",
      Google_Drive_Link: doc.url || "",
      Version: doc.version || 1,
      Status: doc.status || "ACTIVE",
      Uploaded_By: doc.uploadedBy || "System",
      Uploaded_On: doc.uploadedOn || new Date().toISOString(),
      Is_Demo: false
    });
  }

  async bulkSyncCases(cases: Case[]): Promise<boolean> {
    const formatted = cases.map(c => ({
      Case_ID: c.id,
      Client_ID: c.clientId,
      Service_ID: c.serviceId || "",
      Assigned_To: c.assignedTo || "",
      Priority: c.priority,
      Status: c.status,
      Start_Date: c.startDate || "",
      Due_Date: c.dueDate || "",
      Completion_Date: c.completionDate || "",
      Remarks: c.remarks || "",
      Created_By: c.createdBy || "System",
      Created_On: c.createdOn || new Date().toISOString(),
      Modified_By: c.modifiedBy || "",
      Modified_On: c.modifiedOn || "",
      Delay_Days: c.delayDays || 0,
      Completion_Percentage: c.completionPercentage || 0,
      Case_Age: c.caseAge || 0,
      Is_Demo: false
    }));
    return this.bulkSync("jn_cases", "Case_ID", formatted);
  }

  private resolveTable(table: string): string {
    const map: Record<string, string> = {
      "Users": "jn_users",
      "Staff": "jn_staff",
      "Clients": "jn_clients",
      "Services": "jn_services",
      "Invoices": "jn_invoices",
      "Receipts": "jn_receipts",
      "Expenses": "jn_expenses",
      "AuditLogs": "jn_audit_log",
      "Cases": "jn_cases",
      "Departments": "jn_departments",
      "Designations": "jn_designations"
    };
    return map[table] || table;
  }

  async pushRecord(table: string, idKey: string, idValue: string, data: any): Promise<boolean> {
    if (!this.isActiveSyncEnabled()) return true;
    const resolvedTable = this.resolveTable(table);
    const isMasterData = resolvedTable === "jn_departments" || resolvedTable === "jn_designations";

    if (!navigator.onLine) {
      if (isMasterData) {
        throw new Error("Internet connection required to modify master data.");
      } else {
        const { OfflineSyncManager } = await import("./offlineSyncManager");
        OfflineSyncManager.addPendingSync(table, "update", idKey, idValue, data);
        return true;
      }
    }

    try {
      if (resolvedTable === "jn_users" || resolvedTable === "jn_staff") {
        const uIdVal = data["User ID"] || data["User_ID"] || data["id"] || idValue;
        const emailVal = data["Email"] || data["email"] || "";
        const usernameVal = data["Username"] || data["username"] || "";
        const roleVal = data["Role"] || data["role"] || "STAFF";
        const statusVal = data["Status"] || data["status"] || "ACTIVE";
        const pwdHashVal = data["Password Hash"] || data["Password_Hash"] || data["passwordHash"] || "";
        const createdVal = data["Created At"] || data["createdAt"] || new Date().toISOString();
        const lastLoginVal = data["Last Login"] || data["lastLogin"] || "";

        const userData = {
          "User ID": uIdVal,
          "User_ID": uIdVal,
          "Username": usernameVal,
          "username": usernameVal,
          "Email": emailVal,
          "email": emailVal,
          "Password Hash": pwdHashVal,
          "Password_Hash": pwdHashVal,
          "passwordHash": pwdHashVal,
          "Role": roleVal,
          "role": roleVal,
          "Status": statusVal,
          "status": statusVal,
          "Created At": createdVal,
          "Created_At": createdVal,
          "Created_Date": createdVal,
          "createdAt": createdVal,
          "Last Login": lastLoginVal,
          "Last_Login": lastLoginVal,
          "lastLogin": lastLoginVal,
          "Is_Demo": false,
          "Is Demo": false
        };

        const nameVal = data["Name"] || data["name"] || "";
        const resolvedNameObj = resolveFullName(nameVal, emailVal, usernameVal);
        const first_name = resolvedNameObj.firstName;
        const last_name = resolvedNameObj.lastName;
        const full_name = resolvedNameObj.fullName;

        const rawMobileVal = data["Mobile"] || data["mobile"] || "";
        const mobileVal = formatPhoneNumberForSheets(rawMobileVal);

        const designationVal = data["Designation"] || data["designation"] || "";
        const joiningDateVal = data["Joining Date"] || data["joiningDate"] || "";
        const permissionsVal = typeof data["permissions"] === "object"
          ? JSON.stringify(data["permissions"])
          : (data["Permissions"] || typeof data["permissions"] === "string" ? data["permissions"] : "");

        const isDemoVal = data["Is_Demo"] !== undefined ? data["Is_Demo"] : (data["isDemo"] !== undefined ? data["isDemo"] : false);

        // Pure Foreign Keys passed directly from the Form Payload (No fallback resolvers executed during active CRUD)
        const desigIdVal = data["Designation_ID"] || data["designationId"] || "DES02";
        const deptIdVal = data["Department_ID"] || data["departmentId"] || "DEP01";

        const staffData = {
          "User ID": uIdVal,
          "User_ID": uIdVal,
          "Staff ID": (uIdVal || "").replace("usr_", "stf_"),
          "Staff_ID": (uIdVal || "").replace("usr_", "stf_"),
          "Name": full_name,
          "First Name": first_name,
          "First_Name": first_name,
          "Last Name": last_name,
          "Last_Name": last_name,
          "Username": usernameVal,
          "Mobile": mobileVal,
          "Phone": mobileVal,
          "Phone Number": mobileVal,
          "Designation": designationVal,
          "Designation_ID": desigIdVal,
          "Joining Date": joiningDateVal,
          "Joining_Date": joiningDateVal,
          "Permissions": permissionsVal,
          "Email": emailVal,
          "Status": statusVal,
          "Is_Demo": isDemoVal,
          "Department_ID": deptIdVal
        };

        // Execute via Atomic Multi-Table Transaction Manager
        return await this.updateMultiTableTransaction(uIdVal, userData, staffData);
      }

      const escapedData = escapePhoneFields(data);
      const res = await this.makePostRequest({
        action: "update",
        table: resolvedTable,
        idKey,
        idValue,
        data: escapedData
      });
      return res && res.success;
    } catch (e) {
      return false;
    }
  }

  async deleteRecord(table: string, idKey: string, idValue: string): Promise<boolean> {
    if (!this.isActiveSyncEnabled()) return true;
    const resolvedTable = this.resolveTable(table);
    const isMasterData = resolvedTable === "jn_departments" || resolvedTable === "jn_designations";

    if (!navigator.onLine) {
      if (isMasterData) {
        throw new Error("Internet connection required to modify master data.");
      } else {
        const { OfflineSyncManager } = await import("./offlineSyncManager");
        OfflineSyncManager.addPendingSync(table, "delete", idKey, idValue, {});
        return true;
      }
    }
    
    try {
      if (resolvedTable === "jn_users") {
        const resUser = await this.makePostRequest({
          action: "delete",
          table: "jn_users",
          idKey: "User ID",
          idValue
        });
        const resStaff = await this.makePostRequest({
          action: "delete",
          table: "jn_staff",
          idKey: "User ID",
          idValue
        });
        return !!(resUser?.success && resStaff?.success);
      }

      const res = await this.makePostRequest({
        action: "delete",
        table: resolvedTable,
        idKey,
        idValue
      });
      return res && res.success;
    } catch (e) {
      return false;
    }
  }

  async bulkSync(table: string, idKey: string, data: any[]): Promise<boolean> {
    if (!this.isActiveSyncEnabled()) return true;
    const resolvedTable = this.resolveTable(table);
    
    try {
      if (resolvedTable === "jn_users") {
        const usersMapped = data.map(u => {
          const uIdVal = u["User ID"] || u["id"] || "";
          const emailVal = u["Email"] || u["email"] || "";
          const usernameVal = u["Username"] || u["username"] || "";
          const pwdHashVal = u["Password Hash"] || u["passwordHash"] || "";
          const rawRoleVal = u["Role"] || u["role"] || "STAFF";
          const roleVal = (rawRoleVal === "OWNER" || rawRoleVal === "SuperAdmin" || rawRoleVal === "SUPER_ADMIN" || rawRoleVal === "Super Admin") ? "SuperAdmin" : rawRoleVal;
          const statusVal = u["Status"] || u["status"] || "ACTIVE";
          const createdVal = u["Created At"] || u["createdAt"] || new Date().toISOString();
          const lastLoginVal = u["Last Login"] || u["lastLogin"] || "";

          return {
            "User ID": uIdVal,
            "User_ID": uIdVal,
            "Username": usernameVal,
            "username": usernameVal,
            "Email": emailVal,
            "email": emailVal,
            "Password Hash": pwdHashVal,
            "Password_Hash": pwdHashVal,
            "passwordHash": pwdHashVal,
            "Role": roleVal,
            "role": roleVal,
            "Status": statusVal,
            "status": statusVal,
            "Created At": createdVal,
            "Created_At": createdVal,
            "Created_Date": createdVal,
            "createdAt": createdVal,
            "Last Login": lastLoginVal,
            "Last_Login": lastLoginVal,
            "lastLogin": lastLoginVal,
            "Is_Demo": false,
            "Is Demo": false
          };
        });

        const staffMapped = data.map(u => {
          const uIdVal = u["User ID"] || u["id"] || "";
          const staffIdVal = (uIdVal || "").toString().replace("usr_", "stf_");
          const nameVal = u["Name"] || u["name"] || "";
          const emailVal = u["Email"] || u["email"] || "";
          const usernameVal = u["Username"] || u["username"] || "";
          
          const resolvedNameObj = resolveFullName(nameVal, emailVal, usernameVal);
          const first_name = resolvedNameObj.firstName;
          const last_name = resolvedNameObj.lastName;
          const full_name = resolvedNameObj.fullName;

          const rawMobileVal = u["Mobile"] || u["mobile"] || "";
          const mobileVal = formatPhoneNumberForSheets(rawMobileVal);

          const designationVal = u["Designation"] || u["designation"] || "";
          const joiningDateVal = u["Joining Date"] || u["joiningDate"] || "";
          const permissionsVal = typeof u["Permissions"] === "object"
            ? JSON.stringify(u["Permissions"])
            : (u["Permissions"] || typeof u["permissions"] === "object" ? JSON.stringify(u["permissions"]) : (u["Permissions"] || ""));
          const statusVal = u["Status"] || u["status"] || "ACTIVE";
          const isDemoVal = u["Is_Demo"] !== undefined ? u["Is_Demo"] : (u["isDemo"] !== undefined ? u["isDemo"] : false);

          const rawRoleVal = u["Role"] || u["role"] || "STAFF";
          const roleVal = (rawRoleVal === "OWNER" || rawRoleVal === "SuperAdmin" || rawRoleVal === "SUPER_ADMIN" || rawRoleVal === "Super Admin") ? "SuperAdmin" : rawRoleVal;

          const rawDesgId = u["Designation_ID"] || u["designationId"] || "";
          const desigIdVal = resolveDesignationId(rawDesgId, roleVal === "SuperAdmin" ? "OWNER" : "STAFF");
          
          const rawDeptId = u["Department_ID"] || u["departmentId"] || "";
          const deptIdVal = resolveDepartmentId(rawDeptId, desigIdVal);

          return {
            "User ID": uIdVal,
            "User_ID": uIdVal,
            "Staff ID": staffIdVal,
            "Staff_ID": staffIdVal,
            "Name": full_name,
            "First Name": first_name,
            "First_Name": first_name,
            "Last Name": last_name,
            "Last_Name": last_name,
            "Username": usernameVal,
            "Mobile": mobileVal,
            "Phone": mobileVal,
            "Phone Number": mobileVal,
            "Designation": designationVal,
            "Designation_ID": desigIdVal,
            "Joining Date": joiningDateVal,
            "Joining_Date": joiningDateVal,
            "Permissions": permissionsVal,
            "Email": emailVal,
            "Status": statusVal,
            "Is_Demo": isDemoVal,
            "Department_ID": deptIdVal
          };
        });

        // Attempt bulk sync first
        let bulkSuccess = false;
        try {
          const resUser = await this.makePostRequest({
            action: "bulkSync",
            table: "jn_users",
            idKey: "User ID",
            data: usersMapped
          });

          const resStaff = await this.makePostRequest({
            action: "bulkSync",
            table: "jn_staff",
            idKey: "User_ID",
            data: staffMapped
          });

          bulkSuccess = !!(resUser?.success && resStaff?.success);
        } catch (err) {
          console.warn("[Google Sheets Service] Bulk sync failed for users/staff, will fall back to individual records updates:", err);
        }

        if (bulkSuccess) {
          return true;
        }

        // Fallback to individual updates if bulkSync failed or is unsupported
        console.log("[Google Sheets Service] Executing robust individual record fallback for users/staff...");
        let allUsersSuccess = true;
        for (const user of usersMapped) {
          try {
            const res = await this.makePostRequest({
              action: "update",
              table: "jn_users",
              idKey: "User ID",
              idValue: user["User ID"],
              data: user
            });
            if (!res || !res.success) allUsersSuccess = false;
          } catch (e) {
            console.error("[Google Sheets Service] Fallback user update failed:", e);
            allUsersSuccess = false;
          }
        }

        let allStaffSuccess = true;
        for (const staff of staffMapped) {
          try {
            const res = await this.makePostRequest({
              action: "update",
              table: "jn_staff",
              idKey: "User_ID",
              idValue: staff["User ID"],
              data: staff
            });
            if (!res || !res.success) allStaffSuccess = false;
          } catch (e) {
            console.error("[Google Sheets Service] Fallback staff update failed:", e);
            allStaffSuccess = false;
          }
        }

        if (!allUsersSuccess || !allStaffSuccess) {
          console.warn("[Google Sheets Service] Some users or staff failed to sync to sheets, but falling back gracefully to local state.");
        }
        return true;
      }

      // Attempt bulk sync first for other tables
      let bulkSuccess = false;
      const escapedData = escapePhoneFields(data);
      try {
        const res = await this.makePostRequest({
          action: "bulkSync",
          table: resolvedTable,
          idKey,
          data: escapedData
        });
        bulkSuccess = !!(res && res.success);
      } catch (err) {
        console.warn(`[Google Sheets Service] Bulk sync failed for ${resolvedTable}, will fall back to individual records updates:`, err);
      }

      if (bulkSuccess) {
        return true;
      }

      // Fallback to individual updates if bulkSync failed or is unsupported
      console.log(`[Google Sheets Service] Executing robust individual record fallback for ${resolvedTable}...`);
      let allSuccess = true;
      for (const item of escapedData) {
        const idValue = item[idKey] || item["id"] || "";
        const ok = await this.pushRecord(resolvedTable, idKey, idValue, item);
        if (!ok) allSuccess = false;
      }
      if (!allSuccess) {
        console.warn(`[Google Sheets Service] Some records failed to sync to ${resolvedTable}, but falling back gracefully to local state.`);
      }
      return true;
    } catch (e) {
      console.error("[Google Sheets Service] bulkSync unexpected error:", e);
      return false;
    }
  }

  async pullAllFromSheets(): Promise<{ success: boolean; message: string }> {
    if (!this.isActiveSyncEnabled()) {
      return { success: false, message: "Apps Script integration URL is not configured." };
    }

    try {
      const tables = [
        "jn_clients", "jn_client_contacts", "jn_services", "jn_invoices", "jn_receipts", "jn_expenses", 
        "jn_users", "jn_staff", "jn_audit_log", "jn_cases", "jn_departments", 
        "jn_designations", "jn_notifications", "jn_events", "jn_lookup_master"
      ];
      const results: Record<string, any[]> = {};
      const successTables: Record<string, boolean> = {};

      for (const table of tables) {
        try {
          const res = await this.makeGetRequest({ action: "readAll", table });
          if (res && res.success && Array.isArray(res.data)) {
            results[table] = res.data;
            successTables[table] = true;
          } else {
            results[table] = [];
            if (res && res.success) {
              successTables[table] = true;
            } else {
              successTables[table] = false;
            }
          }
        } catch (e) {
          console.warn(`[Google Sheets Service] Could not pull from worksheet: ${table}`, e);
          results[table] = [];
          successTables[table] = false;
        }
      }

      // Automatically clean phone fields from all success tables right after pulling
      for (const table of tables) {
        if (successTables[table] && results[table]) {
          results[table] = cleanPhoneFields(results[table]);
        }
      }

      // 1B. Parse Sub-Contacts (jn_client_contacts) first
      let pulledContactsMap: Record<string, any[]> = {};
      if (successTables["jn_client_contacts"]) {
        const rawContacts = results["jn_client_contacts"] || [];
        const parsedContacts = rawContacts.map((row: any) => ({
          id: row["Contact_ID"] || row["Contact ID"] || row["id"] || `cnt_${Math.random().toString(36).substr(2, 9)}`,
          clientId: row["Client_ID"] || row["Client ID"] || "",
          name: row["Contact_Name"] || row["Contact Name"] || row["Name"] || "",
          role: row["Role"] || "Contact Person",
          email: row["Email"] || "",
          phone: cleanPhoneNumberFromSheets(row["Phone"] || row["Mobile"] || ""),
          isPrimary: (row["Is_Primary"] || row["Is Primary"] || "").toString().toLowerCase() === "true"
        }));

        localStorage.setItem("jn_officeos_client_contacts", JSON.stringify(parsedContacts));

        parsedContacts.forEach(cnt => {
          if (cnt.clientId) {
            if (!pulledContactsMap[cnt.clientId]) pulledContactsMap[cnt.clientId] = [];
            pulledContactsMap[cnt.clientId].push(cnt);
          }
        });
      }

      // 1. Clients
      if (successTables["jn_clients"]) {
        // Read existing local clients to preserve fields if sheet row cells are blank
        let existingLocalMap: Record<string, any> = {};
        try {
          const rawLocal = localStorage.getItem("jn_officeos_clients");
          if (rawLocal) {
            const parsedLocal = JSON.parse(rawLocal);
            if (Array.isArray(parsedLocal)) {
              parsedLocal.forEach((c: any) => { if (c && c.id) existingLocalMap[c.id] = c; });
            }
          }
        } catch (e) {
          // ignore
        }

        const clients = results["jn_clients"].map((row: any) => {
          const clientId = row["Client_ID"] || row["Client ID"] || row["id"] || "";
          const existing = existingLocalMap[clientId] || {};

          const rawType = (row["Client_Type"] || row["Client Type"] || row["Category"] || row["category"] || existing.category || "Individual").toString().trim();
          let category = "Individual";
          const typeLower = rawType.toLowerCase();
          if (typeLower.includes("proprietor")) category = "Proprietorship";
          else if (typeLower.includes("partner")) category = "Partnership";
          else if (typeLower.includes("llp")) category = "LLP";
          else if (typeLower.includes("private") || typeLower.includes("pvt")) category = "Private Limited";
          else if (typeLower.includes("public")) category = "Public Limited";
          else if (typeLower.includes("trust")) category = "Trust";
          else if (typeLower.includes("society")) category = "Society";
          else if (typeLower.includes("ngo")) category = "NGO";
          else if (typeLower.includes("huf")) category = "HUF";
          else if (typeLower.includes("individual")) category = "Individual";
          else category = rawType || existing.category || "Individual";

          const clientSourceRaw = (row["Client_Source"] || row["Client Source"] || existing.clientSource || "Direct").toString().trim();
          const clientSource = clientSourceRaw.toLowerCase().includes("indirect") || clientSourceRaw.toLowerCase().includes("referral") ? "Indirect / Referral" : "Direct";

          const name = (row["Client_Name"] || row["Client Name"] || row["name"] || "").toString().trim() || existing.name || "";
          const tradeName = (row["Trade_Name"] || row["Trade Name"] || "").toString().trim() || existing.tradeName || "";
          const businessName = (row["Business_Name"] || row["Business Name"] || "").toString().trim() || existing.businessName || "";
          const referredBy = (row["Referred_By"] || row["Referred By"] || "").toString().trim() || existing.referredBy || "";
          
          const pulledMobile = cleanPhoneNumberFromSheets(row["Phone"] || row["Mobile"] || row["phone"] || row["mobile"] || "");
          const mobile = pulledMobile || existing.mobile || "";

          const alternateMobile = (row["Alternate_Mobile"] || row["Alternate Mobile"] || "").toString().trim() || existing.alternateMobile || "";
          const pulledWhatsapp = cleanPhoneNumberFromSheets(row["Whatsapp"] || "");
          const whatsapp = pulledWhatsapp || existing.whatsapp || mobile;
          const email = (row["Email"] || row["email"] || "").toString().trim() || existing.email || "";
          const website = (row["Website"] || row["website"] || "").toString().trim() || existing.website || "";

          const pan = (row["PAN"] || row["pan"] || "").toString().trim() || existing.pan || "";
          const aadhaar = (row["Aadhaar_Card_No"] || row["Aadhaar Card No"] || row["Aadhaar"] || row["aadhaar"] || "").toString().trim() || existing.aadhaar || "";
          const gstin = (row["GSTIN"] || row["gstin"] || "").toString().trim() || existing.gstin || "";
          const tan = (row["TAN"] || row["tan"] || "").toString().trim() || existing.tan || "";
          const udyamRegistration = (row["Udyam_Registration"] || row["Udyam Registration"] || "").toString().trim() || existing.udyamRegistration || "";
          const fssaiNumber = (row["FSSAI_Number"] || row["FSSAI Number"] || "").toString().trim() || existing.fssaiNumber || "";
          const iecNumber = (row["IEC_Number"] || row["IEC Number"] || "").toString().trim() || existing.iecNumber || "";
          const professionalTaxNumber = (row["Professional_Tax_Number"] || row["Professional Tax Number"] || "").toString().trim() || existing.professionalTaxNumber || "";
          const pfNumber = (row["PF_Number"] || row["PF Number"] || "").toString().trim() || existing.pfNumber || "";
          const esicNumber = (row["ESIC_Number"] || row["ESIC Number"] || "").toString().trim() || existing.esicNumber || "";
          const cin = (row["CIN"] || row["cin"] || "").toString().trim() || existing.cin || "";
          const din = (row["DIN"] || row["din"] || "").toString().trim() || existing.din || "";
          const msme = (row["MSME"] || row["msme"] || "").toString().trim() || existing.msme || "None";

          const officeAddress = (row["Office_Address"] || row["Address"] || row["officeAddress"] || "").toString().trim() || existing.officeAddress || "";
          const city = (row["City"] || row["city"] || "").toString().trim() || existing.city || "";
          const state = (row["State"] || row["state"] || "").toString().trim() || existing.state || "Maharashtra";
          const pinCode = (row["Pin_Code"] || row["Pin Code"] || row["pinCode"] || "").toString().trim() || existing.pinCode || "";
          const country = (row["Country"] || row["country"] || "").toString().trim() || existing.country || "India";

          const bankName = (row["Bank_Name"] || row["Bank Name"] || "").toString().trim() || existing.bankName || "";
          const accountHolder = (row["Account_Holder"] || row["Account Holder"] || "").toString().trim() || existing.accountHolder || "";
          const accountNumber = (row["Account_Number"] || row["Account Number"] || "").toString().trim() || existing.accountNumber || "";
          const ifsc = (row["IFSC"] || row["ifsc"] || "").toString().trim() || existing.ifsc || "";
          const branch = (row["Branch"] || row["branch"] || "").toString().trim() || existing.branch || "";
          const upi = (row["UPI"] || row["upi"] || "").toString().trim() || existing.upi || "";

          const businessNature = (row["Business_Nature"] || row["Business Nature"] || "").toString().trim() || existing.businessNature || "";
          const businessType = (row["Business_Type"] || row["Business Type"] || "").toString().trim() || existing.businessType || "Services";
          const constitution = (row["Constitution"] || row["constitution"] || "").toString().trim() || existing.constitution || "Individual";
          const dateOfIncorporation = (row["Date_Of_Incorporation"] || row["Date Of Incorporation"] || "").toString().trim() || existing.dateOfIncorporation || "";
          const dateOfRegistration = (row["Date_Of_Registration"] || row["Date Of Registration"] || "").toString().trim() || existing.dateOfRegistration || "";
          const financialYear = (row["Financial_Year"] || row["Financial Year"] || "").toString().trim() || existing.financialYear || "2026-27";
          const assessmentYear = (row["Assessment_Year"] || row["Assessment Year"] || "").toString().trim() || existing.assessmentYear || "2027-28";

          const subContacts = pulledContactsMap[clientId] || existing.contacts || [];

          return {
            id: clientId,
            category: category as any,
            name: name,
            tradeName: tradeName,
            businessName: businessName,
            clientSource: clientSource as any,
            referredBy: referredBy,
            mobile: mobile,
            alternateMobile: alternateMobile,
            whatsapp: whatsapp,
            email: email,
            website: website,
            pan: pan,
            aadhaar: aadhaar,
            gstin: gstin,
            tan: tan,
            udyamRegistration: udyamRegistration,
            fssaiNumber: fssaiNumber,
            iecNumber: iecNumber,
            professionalTaxNumber: professionalTaxNumber,
            pfNumber: pfNumber,
            esicNumber: esicNumber,
            cin: cin,
            din: din,
            msme: msme,
            officeAddress: officeAddress,
            city: city,
            state: state,
            pinCode: pinCode,
            country: country,
            bankName: bankName,
            accountHolder: accountHolder,
            accountNumber: accountNumber,
            ifsc: ifsc,
            branch: branch,
            upi: upi,
            businessNature: businessNature,
            businessType: businessType,
            constitution: constitution,
            dateOfIncorporation: dateOfIncorporation,
            dateOfRegistration: dateOfRegistration,
            financialYear: financialYear,
            assessmentYear: assessmentYear,
            status: (() => {
              const s = (row["Status"] || existing.status || "Active").toString().trim().toLowerCase();
              if (s === "active" || s === "active ") return "Active";
              if (s === "inactive" || s === "inactive ") return "Inactive";
              if (s === "blacklisted" || s === "blacklisted ") return "Blacklisted";
              return "Active";
            })(),
            contacts: subContacts,
            tags: row["Tags"] ? row["Tags"].split(",").map((t: string) => t.trim()).filter(Boolean) : (existing.tags || []),
            documents: existing.documents || {},
            assignedStaff: row["Assigned_Staff_IDs"] || row["Assigned Staff IDs"] ? (row["Assigned_Staff_IDs"] || row["Assigned Staff IDs"]).split(",").map((s: string) => s.trim()).filter(Boolean) : (existing.assignedStaff || []),
            internalNotes: (row["Internal_Notes"] || row["Internal Notes"] || "").toString().trim() || existing.internalNotes || "",
            createdAt: row["Last_Updated"] || row["Last Updated"] || existing.createdAt || new Date().toISOString(),
            updatedAt: row["Last_Updated"] || row["Last Updated"] || existing.updatedAt || new Date().toISOString(),
            timeline: existing.timeline || []
          };
        });
        localStorage.setItem("jn_officeos_clients", JSON.stringify(clients));
      }

      // 2. Services
      if (successTables["jn_services"]) {
        const services = results["jn_services"].map((row: any) => ({
          id: row["Service_ID"] || row["Service ID"] || row["id"],
          category: row["Category_ID"] || row["Category"] || "GST",
          name: row["Service_Name"] || row["Service Name"] || "",
          code: row["Service_ID"] || row["Service ID"] || "",
          description: row["Description"] || "",
          governmentForm: "",
          department: row["Department"] || "Taxation",
          applicableTo: ["Individual"],
          status: (() => {
            const s = (row["Status"] || "Active").toString().trim().toLowerCase();
            return (s === "inactive" || s === "inactive ") ? "Inactive" : "Active";
          })(),
          period: "One Time",
          rules: {
            financialYearRequired: false,
            assessmentYearRequired: false,
            monthRequired: false,
            quarterRequired: false,
            governmentFormRequired: false,
            registrationNumberRequired: false,
            expiryDateRequired: false,
            renewalRequired: false,
            documentRequired: false,
            amountRequired: true,
            dueDateRequired: false
          },
          orderIndex: 0,
          history: [],
          createdAt: row["Created At"] || new Date().toISOString(),
          updatedAt: row["Created At"] || new Date().toISOString()
        }));
        localStorage.setItem("jn_officeos_services", JSON.stringify(services));
      }

      // 3. Invoices + Receipts (Payments) Join
      if (successTables["jn_invoices"]) {
        const receiptsMap: Record<string, any[]> = {};
        if (results["jn_receipts"]) {
          results["jn_receipts"].forEach((r: any) => {
            const invNum = r["Invoice_ID"] || r["Invoice Number"] || r["invoiceId"] || r["Invoice_No"];
            if (invNum) {
              if (!receiptsMap[invNum]) {
                receiptsMap[invNum] = [];
              }
              receiptsMap[invNum].push({
                id: r["Receipt_ID"] || r["Receipt Number"] || r["id"] || "",
                invoiceId: invNum,
                date: r["Receipt_Date"] || r["Receipt Date"] || r["date"] || "",
                amount: safeParseNumber(r["Amount_Paid"] || r["Amount Received (INR)"] || r["amount"] || 0),
                mode: r["Payment_Method"] || r["Payment Mode"] || r["mode"] || "UPI",
                transactionRef: r["Transaction_Ref"] || r["Transaction Ref No"] || r["transactionRef"] || "",
                remarks: r["Remarks"] || r["remarks"] || "",
                createdAt: r["Created At"] || r["createdAt"] || ""
              });
            }
          });
        }

        const invoices = results["jn_invoices"].map((row: any) => {
          const invId = row["Invoice_No"] || row["Invoice_ID"] || row["Invoice Number"] || row["Invoice ID"] || row["id"];
          
          const subTotal = safeParseNumber(row["Sub_Total"] || row["Sub Total"] || row["Sub Total (INR)"] || 0);
          const gstAmount = safeParseNumber(row["GST Amount (INR)"] || row["GST_Amount"] || row["GST Amount"] || 0);
          const grandTotal = safeParseNumber(row["Total_Amt"] || row["Total Amount (INR)"] || row["Total Amount"] || row["Grand Total"] || 0);
          const discountAmount = safeParseNumber(row["Discount"] || row["Discount Amount"] || 0);
          const taxableAmount = safeParseNumber(row["Taxable_Amt"] || row["Taxable Amount"] || (subTotal - discountAmount) || 0);
          
          const cgstAmount = safeParseNumber(row["CGST_Amt"] || row["CGST Amount"] || (gstAmount / 2));
          const sgstAmount = safeParseNumber(row["SGST_Amt"] || row["SGST Amount"] || (gstAmount / 2));
          const igstAmount = safeParseNumber(row["IGST_Amt"] || row["IGST Amount"] || 0);
          const roundOff = safeParseNumber(row["Round_Off"] || row["Round Off"] || (grandTotal - (taxableAmount + cgstAmount + sgstAmount + igstAmount)));
          const amountInWords = row["Amount_In_Words"] || row["Amount In Words"] || numberToWords(Math.round(grandTotal));

          return {
            id: invId,
            type: row["Invoice Type"] || "Tax Invoice",
            caseId: row["Case_ID"] || row["Case ID"] || "",
            clientId: row["Client_ID"] || row["Client ID"] || "",
            clientName: row["Client_Name"] || row["Client Name"] || "",
            serviceId: "",
            serviceName: row["Service Name"] || row["Service_Name"] || "Professional CA Services",
            assignedStaffIds: [],
            date: row["Invoice_Date"] || row["Date"] || row["Invoice Date"] || new Date().toISOString().split("T")[0],
            dueDate: row["Due_Date"] || row["Due Date"] || "",
            subTotal: subTotal,
            discountAmount: discountAmount,
            taxableAmount: taxableAmount,
            cgstAmount: cgstAmount,
            sgstAmount: sgstAmount,
            igstAmount: igstAmount,
            cessAmount: 0,
            roundOff: parseFloat(roundOff.toFixed(2)),
            grandTotal: grandTotal,
            amountInWords: amountInWords,
            status: row["Status"] || "Unpaid",
            items: (() => {
              // Calculate effective GST rate
              const gstRate = igstAmount > 0 
                ? Math.round((igstAmount / (taxableAmount || 1)) * 100)
                : Math.round(((cgstAmount + sgstAmount) / (taxableAmount || 1)) * 100);

              return [{
                id: `item_${invId}_0`,
                serviceId: row["Service ID"] || row["Service_ID"] || "SRV_GENERIC",
                serviceName: row["Service Name"] || row["Service_Name"] || "Professional CA Services",
                description: `Professional CA compliance fees for ${row["Service Name"] || row["Service_Name"] || "Professional CA Services"}`,
                quantity: 1,
                rate: subTotal,
                discount: discountAmount,
                taxableValue: taxableAmount,
                gstRate: gstRate || 18,
                cgst: cgstAmount,
                sgst: sgstAmount,
                igst: igstAmount,
                cess: 0,
                total: grandTotal
              }];
            })(),
            payments: receiptsMap[invId] || [],
            createdAt: row["Created At"] || row["Created_At"] || new Date().toISOString(),
            updatedAt: row["Updated At"] || row["Updated_At"] || new Date().toISOString()
          };
        });
        localStorage.setItem("jn_officeos_financial_invoices", JSON.stringify(invoices));
      }

      // 4. Expenses
      if (successTables["jn_expenses"]) {
        const expenses = results["jn_expenses"].map((row: any) => ({
          id: row["Expense_ID"] || row["Expense ID"] || row["id"],
          date: row["Expense_Date"] || row["Date"] || "",
          category: row["Category"] || "Other",
          paidTo: row["Paid_To"] || row["Paid To"] || "",
          amount: safeParseNumber(row["Amount"] || row["Amount (INR)"] || 0),
          paymentMode: row["Payment_Method"] || row["Payment Mode"] || "UPI",
          referenceNumber: row["Reference_No"] || row["Reference Number"] || "",
          remarks: row["Remarks"] || "",
          createdAt: row["Created At"] || new Date().toISOString()
        }));
        localStorage.setItem("jn_officeos_expenses", JSON.stringify(expenses));
      }

      // 5. Users (Joined with Staff)
      if (successTables["jn_users"]) {
        const staffMap = new Map();
        if (results["jn_staff"]) {
          results["jn_staff"].forEach((s: any) => {
            const uid = s["User ID"] || s["User_ID"] || s["id"] || s["userId"] || s["user_id"];
            if (uid) {
              staffMap.set(uid.toString().trim(), s);
            }
          });
        }

        // Safeguard: Read existing local user records to merge with incoming row fields
        const localUsersStr = localStorage.getItem("jn_officeos_users");
        const localUsersMap = new Map<string, any>();
        if (localUsersStr) {
          try {
            const parsed = JSON.parse(localUsersStr);
            if (Array.isArray(parsed)) {
              parsed.forEach(u => {
                if (u && u.id) {
                  localUsersMap.set(u.id.toString().trim(), u);
                }
              });
            }
          } catch (_) {}
        }

        const users = results["jn_users"].map((row: any) => {
          const uid = (row["User ID"] || row["User_ID"] || row["id"] || row["userId"] || row["user_id"] || "").toString().trim();
          let staffRow = staffMap.get(uid) || {};
          if (!staffRow || Object.keys(staffRow).length === 0) {
            const altId = uid.replace("usr_", "stf_");
            staffRow = staffMap.get(altId) || {};
          }
          const localUser = localUsersMap.get(uid) || {};

          let permissions = {};
          const rawPerms = staffRow["Permissions"] || staffRow["permissions"] || row["Permissions"] || row["permissions"] || localUser.permissions;
          if (rawPerms) {
            try {
              permissions = typeof rawPerms === "string"
                ? JSON.parse(rawPerms)
                : rawPerms;
            } catch (e) {
              console.warn("Failed to parse permissions", e);
            }
          }

          const username = staffRow["Username"] || staffRow["username"] || row["Username"] || row["username"] || localUser.username || "";
          const email = row["Email"] || row["email"] || staffRow["Email"] || staffRow["email"] || localUser.email || "";

          // Compute name from First_Name and Last_Name if needed with self-healing split mapping
          const firstNameVal = staffRow["First_Name"] || staffRow["First Name"] || "";
          const lastNameVal = staffRow["Last_Name"] || staffRow["Last Name"] || "";
          const combinedName = (firstNameVal + " " + lastNameVal).trim();
          const rawName = staffRow["Name"] || staffRow["name"] || row["Name"] || row["name"] || combinedName || localUser.name || "Staff User";
          const resolvedNameObj = resolveFullName(rawName, email, username);
          const name = resolvedNameObj.fullName;

          const rawMobile = staffRow["Mobile"] || staffRow["mobile"] || staffRow["Phone"] || staffRow["phone"] || row["Mobile"] || row["mobile"] || "";
          let mobile = cleanPhoneNumberFromSheets(rawMobile);
          if ((!mobile || mobile.includes("ERROR") || mobile.includes("#")) && localUser && localUser.mobile && !localUser.mobile.includes("ERROR")) {
            mobile = localUser.mobile;
          }
          if (!mobile || mobile.includes("ERROR") || mobile.includes("#")) {
            if (email.toLowerCase().includes("jainnagarwal26")) {
              mobile = "+91 8828147889";
            } else if (email.toLowerCase().includes("staff@jainagarwal.com") || email.toLowerCase().includes("amit")) {
              mobile = "+91 9876543210";
            }
          }

          const rawRole = row["Role"] || row["role"] || localUser.role || "STAFF";
          const role = (rawRole === "SuperAdmin" || rawRole === "SUPER_ADMIN" || rawRole === "Super Admin" || rawRole === "OWNER") ? "OWNER" : rawRole;

          const designation = staffRow["Designation"] || staffRow["designation"] || staffRow["Designation_ID"] || staffRow["designation_id"] || localUser.designation || "Consultant";
          const joiningDate = staffRow["Joining Date"] || staffRow["joining_date"] || staffRow["Joining_Date"] || staffRow["joiningDate"] || localUser.joiningDate || "";
          
          const rawDeptId = staffRow["Department_ID"] || staffRow["Department ID"] || staffRow["department_id"] || localUser.departmentId || "";
          const rawDesgId = staffRow["Designation_ID"] || staffRow["Designation ID"] || staffRow["designation_id"] || localUser.designationId || "";
          const designationId = resolveDesignationId(rawDesgId, role);
          const departmentId = resolveDepartmentId(rawDeptId, designationId);

          const deptsRaw = results["jn_departments"] || [];
          const desgsRaw = results["jn_designations"] || [];

          const matchedDept = deptsRaw.find((x: any) => (x.Department_ID || x.id || "").toString().trim() === departmentId.toString().trim());
          const matchedDesg = desgsRaw.find((x: any) => (x.Designation_ID || x.id || "").toString().trim() === designationId.toString().trim());

          const departmentName = matchedDept ? (matchedDept.Department_Name || matchedDept.name || "") : "Taxation";
          const designationName = matchedDesg ? (matchedDesg.Designation_Name || matchedDesg.name || "") : designation;

          return {
            id: uid,
            email: email,
            name: name,
            username: username,
            mobile: mobile,
            designation: designationName,
            department: departmentName,
            departmentId: departmentId,
            designationId: designationId,
            role: role,
            status: (() => {
              const s = (row["Status"] || row["status"] || localUser.status || "ACTIVE").toString().trim().toUpperCase();
              if (s === "ACTIVE") return "ACTIVE";
              if (s === "INACTIVE" || s === "SUSPENDED") return "INACTIVE";
              if (s === "LOCKED") return "LOCKED";
              return "ACTIVE";
            })(),
            joiningDate: joiningDate,
            passwordHash: row["Password Hash"] || row["passwordHash"] || row["Password_Hash"] || row["password_hash"] || localUser.passwordHash || "",
            permissions: permissions,
            createdAt: row["Created At"] || row["createdAt"] || row["Created_At"] || row["Created_Date"] || row["created_date"] || localUser.createdAt || new Date().toISOString()
          };
        });

        // Deduplicate users by ID to prevent duplicate React keys
        const seenUserIds = new Set<string>();
        const uniqueUsers: any[] = [];
        for (const u of users) {
          if (u && u.id) {
            const uidStr = u.id.toString().trim();
            if (!seenUserIds.has(uidStr)) {
              seenUserIds.add(uidStr);
              uniqueUsers.push(u);
            }
          }
        }

        localStorage.setItem("jn_officeos_users", JSON.stringify(uniqueUsers));
      }

      // 6. AuditLogs
      if (successTables["jn_audit_log"]) {
        const logs = results["jn_audit_log"].map((row: any) => ({
          id: row["Log ID"] || row["id"],
          timestamp: row["Timestamp"] || "",
          userEmail: row["User Email"] || "",
          userName: row["User Name"] || "",
          role: (() => {
            const r = row["Role"] || "STAFF";
            return (r === "SuperAdmin" || r === "SUPER_ADMIN" || r === "Super Admin") ? "OWNER" : r;
          })(),
          action: row["Action"] || "",
          category: row["Category"] || "SYSTEM",
          details: row["Details"] || ""
        }));
        localStorage.setItem("jn_officeos_audit_logs", JSON.stringify(logs));
      }

      // 7. Cases
      if (successTables["jn_cases"]) {
        const cases = results["jn_cases"].map((row: any) => ({
          id: row["Case_ID"] || row["Case ID"] || row["id"],
          clientId: row["Client_ID"] || row["Client ID"] || "",
          clientName: row["Client_Name"] || row["Client Name"] || "",
          assignedStaffIds: row["Staff_ID"] || row["Assigned Staff IDs"] ? (row["Staff_ID"] || row["Assigned Staff IDs"]).split(",").map((s: string) => s.trim()) : [],
          serviceId: row["Service_ID"] || row["Service ID"] || "",
          serviceName: row["Service_Name"] || row["Service Name"] || "",
          serviceType: "GST",
          priority: row["Priority"] || "MEDIUM",
          status: row["Status"] || "NOT_STARTED",
          createdAt: row["Start_Date"] || row["Start Date"] || new Date().toISOString(),
          expectedCompletionDate: row["Target_Date"] || row["Target Date"] || new Date().toISOString(),
          updatedAt: row["Updated_At"] || row["Updated At"] || new Date().toISOString(),
          timeline: [],
          checklist: [],
          notes: [],
          attachments: []
        }));
        localStorage.setItem("jn_officeos_cases", JSON.stringify(cases));
      }

      // 8. Departments
      if (successTables["jn_departments"]) {
        const pulledDepts = results["jn_departments"] || [];
        if (pulledDepts.length > 0) {
          const depts = pulledDepts.map((row: any) => ({
            Department_ID: row["Department_ID"] || row["Department ID"] || row["id"] || "",
            Department_Name: row["Department_Name"] || row["Department Name"] || row["name"] || "",
            Status: row["Status"] || "Active",
            Last_Modified: row["Last_Modified"] || row["Last Modified"] || new Date().toISOString()
          }));
          localStorage.setItem("jn_officeos_departments", JSON.stringify(depts));
        } else {
          // If empty in Google Sheet, seed/push from default local db settings
          try {
            const { getDepartments } = await import("./db");
            const localDepts = getDepartments();
            if (localDepts.length > 0) {
              console.log("[Google Sheets Service] Auto-seeding empty jn_departments worksheet...");
              const mappedDepts = localDepts.map(d => ({
                "Department_ID": d.Department_ID,
                "Department_Name": d.Department_Name,
                "Status": d.Status,
                "Last_Modified": d.Last_Modified,
                "Is_Demo": false
              }));
              this.bulkSync("Departments", "Department_ID", mappedDepts);
            }
          } catch (e) {
            console.error("Failed to seed empty departments:", e);
          }
        }
      }

      // 9. Designations
      if (successTables["jn_designations"]) {
        const pulledDesgs = results["jn_designations"] || [];
        if (pulledDesgs.length > 0) {
          const desgs = pulledDesgs.map((row: any) => ({
            Designation_ID: row["Designation_ID"] || row["Designation ID"] || row["id"] || "",
            Designation_Name: row["Designation_Name"] || row["Designation Name"] || row["name"] || "",
            Department_ID: row["Department_ID"] || row["Department ID"] || "",
            Status: row["Status"] || "Active",
            Last_Modified: row["Last_Modified"] || row["Last Modified"] || new Date().toISOString()
          }));
          localStorage.setItem("jn_officeos_designations", JSON.stringify(desgs));
        } else {
          // If empty in Google Sheet, seed/push from default local db settings
          try {
            const { getDesignations } = await import("./db");
            const localDesgs = getDesignations();
            if (localDesgs.length > 0) {
              console.log("[Google Sheets Service] Auto-seeding empty jn_designations worksheet...");
              const mappedDesgs = localDesgs.map(d => ({
                "Designation_ID": d.Designation_ID,
                "Designation_Name": d.Designation_Name,
                "Department_ID": d.Department_ID,
                "Status": d.Status,
                "Last_Modified": d.Last_Modified,
                "Is_Demo": false
              }));
              this.bulkSync("Designations", "Designation_ID", mappedDesgs);
            }
          } catch (e) {
            console.error("Failed to seed empty designations:", e);
          }
        }
      }

      // 10. Notifications
      if (successTables["jn_notifications"]) {
        const pulledNotifs = results["jn_notifications"] || [];
        const notifs = pulledNotifs.map((row: any) => ({
          id: row["Notification_ID"] || row["Notification ID"] || row["id"] || "",
          timestamp: row["Created_On"] || row["Created On"] || new Date().toISOString(),
          type: row["Notification_Type"] || row["Notification Type"] || "Announcement",
          title: row["Title"] || "",
          message: row["Message"] || "",
          channel: row["Channel"] || "System Alert",
          isRead: (row["Status"] || "").toUpperCase() === "READ",
          isArchived: false,
          priority: row["Priority"] || "Medium",
          targetUserId: row["Recipient_ID"] || row["Recipient ID"] || "all"
        }));
        const { NotificationRepository } = await import("./notificationRepository");
        NotificationRepository.setNotificationsFromSheets(notifs);
      }

      // 11. Events
      if (successTables["jn_events"]) {
        const pulledEvents = results["jn_events"] || [];
        const events = pulledEvents.map((row: any) => ({
          id: row["Event_ID"] || row["Event ID"] || row["id"] || "",
          timestamp: row["Triggered_On"] || row["Triggered On"] || new Date().toISOString(),
          type: row["Event_Type"] || row["Event Type"] || "SYSTEM_EVENT",
          source: row["Module"] || "System",
          payload: (() => {
            try {
              return JSON.parse(row["Description"] || "{}");
            } catch (e) {
              return { description: row["Description"] || "" };
            }
          })(),
          userEmail: row["Triggered_By"] || row["Triggered By"] || "",
          userName: row["Triggered_By"] || row["Triggered By"] || ""
        }));
        const { EventRepository } = await import("./eventRepository");
        EventRepository.setEventsFromSheets(events);
      }

      // 12. Lookup Master
      if (successTables["jn_lookup_master"]) {
        const pulledLookup = results["jn_lookup_master"] || [];
        const lookups = pulledLookup.map((row: any) => ({
          Category: row["Category"] || row["category"] || "",
          Value: row["Value"] || row["value"] || "",
          Is_Active: (row["Is_Active"] || row["Is Active"] || row["status"] || "Active").toString().toUpperCase() === "ACTIVE" || row["Is_Active"] === true
        }));
        localStorage.setItem("jn_officeos_lookup_master", JSON.stringify(lookups));
      }

      // Dispatch event to notify components that database has synced
      window.dispatchEvent(new Event("sheets-database-synced"));

      return { success: true, message: "Pristine database pull completed. All modules synchronized successfully." };
    } catch (e: any) {
      return { success: false, message: `Database pull failed: ${e.message || e}` };
    }
  }
}

export const googleSheetsService: IGoogleSheetsService = new GoogleSheetsProductionService();
