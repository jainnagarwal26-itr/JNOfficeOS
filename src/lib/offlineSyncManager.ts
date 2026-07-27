/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { googleSheetsService, cleanPhoneNumberFromSheets } from "./googleSheetsService";
import { addAuditLog } from "./db";

export interface PendingSyncItem {
  id: string;
  table: string;
  action: "create" | "update" | "delete";
  idKey: string;
  idValue: string;
  data: any;
  timestamp: string;
}

const PENDING_SYNC_KEY = "jn_officeos_pending_sync";

export class OfflineSyncManager {
  private static isSyncingInProgress = false;

  // Check if browser is online
  public static isOnline(): boolean {
    return navigator.onLine;
  }

  // Get all pending sync items
  public static getPendingQueue(): PendingSyncItem[] {
    const queueStr = localStorage.getItem(PENDING_SYNC_KEY);
    if (!queueStr) return [];
    try {
      return JSON.parse(queueStr);
    } catch (e) {
      return [];
    }
  }

  // Save pending sync queue
  public static savePendingQueue(queue: PendingSyncItem[]): void {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    // Trigger custom event so UI components can update their pending counters
    window.dispatchEvent(new CustomEvent("pending-sync-updated", { detail: queue }));
  }

  // Add item to pending sync queue
  public static addPendingSync(
    table: string,
    action: "create" | "update" | "delete",
    idKey: string,
    idValue: string,
    data: any
  ): void {
    const queue = this.getPendingQueue();
    
    // Deduplicate: If there is already a pending sync for the same table and id, merge or update it
    const existingIndex = queue.findIndex(
      (item) => item.table === table && item.idValue === idValue && item.action === action
    );

    const newItem: PendingSyncItem = {
      id: "ps_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      table,
      action,
      idKey,
      idValue,
      data: {
        ...data,
        Last_Modified: data.Last_Modified || data.updatedAt || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      queue[existingIndex] = newItem;
    } else {
      queue.push(newItem);
    }

    this.savePendingQueue(queue);
    console.log(`[Offline Sync Manager] Added pending sync item: ${action} on ${table} (ID: ${idValue})`);

    // Proactively attempt synchronization
    this.syncQueue();
  }

  // Clear specific item from queue
  public static removeFromQueue(itemId: string): void {
    const queue = this.getPendingQueue();
    const filtered = queue.filter((item) => item.id !== itemId);
    this.savePendingQueue(filtered);
  }

  // Synchronize the entire pending queue with conflict resolution
  public static async syncQueue(): Promise<boolean> {
    if (this.isSyncingInProgress) return false;
    if (!this.isOnline() || !googleSheetsService.isActiveSyncEnabled()) {
      return false;
    }

    const queue = this.getPendingQueue();
    if (queue.length === 0) return true;

    this.isSyncingInProgress = true;
    console.log(`[Offline Sync Manager] Starting synchronization for ${queue.length} pending items...`);

    let syncSuccessCount = 0;
    
    try {
      for (const item of queue) {
        // Double-check connectivity for each item
        if (!this.isOnline()) {
          console.warn("[Offline Sync Manager] Connection lost during synchronization. Halting.");
          break;
        }

        const { table, action, idKey, idValue, data } = item;
        
        // --- MANDATORY CONFLICT RESOLUTION ---
        let resolvedData = { ...data };
        let conflictResolved = false;

        if (action === "update" || action === "create") {
          try {
            // Read remote table to fetch latest server state
            const mappedTableName = googleSheetsService["resolveTable"] ? googleSheetsService["resolveTable"](table) : table;
            const response = await googleSheetsService["makeGetRequest"]({ action: "readAll", table: mappedTableName });
            
            if (response && response.success && Array.isArray(response.data)) {
              // Find the matching server record
              const serverRecord = response.data.find((row: any) => {
                const rowId = row[idKey] || row["id"] || row["ID"] || "";
                return rowId.toString().trim() === idValue.toString().trim();
              });

              if (serverRecord) {
                const serverModified = serverRecord["Last_Modified"] || serverRecord["Last Modified"] || serverRecord["Last_Updated"] || serverRecord["Last Updated"] || "";
                const localModified = data["Last_Modified"] || data["updatedAt"] || data["Last_Updated"] || "";

                if (serverModified && localModified) {
                  const serverTime = new Date(serverModified).getTime();
                  const localTime = new Date(localModified).getTime();

                  if (serverTime > localTime) {
                    // SERVER IS NEWER: Discard local modifications, apply server record to local cache
                    console.warn(`[Conflict Resolution] Conflict detected for ${table} (ID: ${idValue}). Google Sheets version is newer. Overwriting local state.`);
                    
                    // Refresh local storage cache with server version
                    this.updateLocalCacheWithServerRecord(table, idKey, idValue, serverRecord);
                    
                    // Log conflict in Audit Log
                    addAuditLog(
                      "system@jainagarwal.com",
                      "System Sync Gateway",
                      "STAFF" as any,
                      "SYNC_CONFLICT_RESOLVED",
                      "DATABASE",
                      `Conflict detected on ${table} (ID: ${idValue}). Google Sheets version (${serverModified}) was newer than local (${localModified}). Local state refreshed from server.`
                    );

                    conflictResolved = true;
                  } else {
                    // LOCAL IS NEWER: Upload local version (continue default flow)
                    console.log(`[Conflict Resolution] Local version for ${table} (ID: ${idValue}) is newer. Proceeding with upload.`);
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`[Offline Sync Manager] Pre-sync conflict check failed for ${table} (ID: ${idValue}):`, err);
          }
        }

        if (conflictResolved) {
          // Conflict resolved by applying server version, remove item from queue and skip pushing
          this.removeFromQueue(item.id);
          syncSuccessCount++;
          continue;
        }

        // --- PUSH RECORD TO SERVER ---
        let pushSuccess = false;
        try {
          if (action === "delete") {
            pushSuccess = await googleSheetsService.deleteRecord(table, idKey, idValue);
          } else {
            pushSuccess = await googleSheetsService.pushRecord(table, idKey, idValue, resolvedData);
          }
        } catch (e) {
          console.error(`[Offline Sync Manager] Push failed for queue item ${item.id}:`, e);
        }

        if (pushSuccess) {
          console.log(`[Offline Sync Manager] Successfully synced queue item ${item.id} (${action} on ${table})`);
          this.removeFromQueue(item.id);
          syncSuccessCount++;

          // Log in Audit Log
          addAuditLog(
            "system@jainagarwal.com",
            "System Sync Gateway",
            "STAFF" as any,
            "OFFLINE_SYNC_SUCCESS",
            "DATABASE",
            `Successfully synchronized pending offline ${action} for ${table} (ID: ${idValue}).`
          );
        } else {
          console.warn(`[Offline Sync Manager] Sync failed for item ${item.id}. Retrying later.`);
          // Halting sequential push to preserve order and referential consistency
          break;
        }
      }
    } finally {
      this.isSyncingInProgress = false;
    }

    const remaining = this.getPendingQueue().length;
    if (syncSuccessCount > 0) {
      // Notify UI
      window.dispatchEvent(new Event("sheets-database-synced"));
    }
    return remaining === 0;
  }

  // Local Storage cache update helper
  private static updateLocalCacheWithServerRecord(table: string, idKey: string, idValue: string, serverRecord: any): void {
    const resolvedKey = this.resolveLocalStorageKey(table);
    if (!resolvedKey) return;

    const stored = localStorage.getItem(resolvedKey);
    if (!stored) return;

    try {
      const list = JSON.parse(stored);
      if (Array.isArray(list)) {
        const index = list.findIndex((x: any) => (x.id || x[idKey] || x.Department_ID || x.Designation_ID || "").toString().trim() === idValue.toString().trim());
        if (index !== -1) {
          // Map backend record to frontend format
          const mappedRecord = this.mapServerRecordToLocal(table, serverRecord);
          list[index] = {
            ...list[index],
            ...mappedRecord
          };
          localStorage.setItem(resolvedKey, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.error("[Offline Sync Manager] Failed to update local cache with server record", e);
    }
  }

  // Map local storage keys
  private static resolveLocalStorageKey(table: string): string | null {
    const MAPPING: Record<string, string> = {
      "jn_clients": "jn_officeos_clients",
      "Clients": "jn_officeos_clients",
      "jn_services": "jn_officeos_services",
      "Services": "jn_officeos_services",
      "ServiceMaster": "jn_officeos_services",
      "jn_cases": "jn_officeos_cases",
      "Cases": "jn_officeos_cases",
      "jn_expenses": "jn_officeos_expenses",
      "Expenses": "jn_officeos_expenses",
      "jn_users": "jn_officeos_users",
      "Users": "jn_officeos_users"
    };
    return MAPPING[table] || null;
  }

  // Map server raw row back to frontend fields
  private static mapServerRecordToLocal(table: string, row: any): any {
    // Basic mapping of common structures
    if (table.includes("client")) {
      return {
        id: row["Client_ID"] || row["Client ID"] || row["id"],
        category: row["Client_Type"] || row["Category"] || "INDIVIDUAL",
        name: row["Client_Name"] || row["Client Name"] || "",
        tradeName: row["Trade_Name"] || row["Trade Name"] || "",
        pan: row["PAN"] || "",
        aadhaar: row["Aadhaar"] || "",
        gstin: row["GSTIN"] || "",
        email: row["Email"] || "",
        mobile: row["Phone"] || row["Mobile"] || "",
        status: row["Status"] || "Active",
        updatedAt: row["Last_Modified"] || row["Last_Updated"] || row["Last Updated"] || new Date().toISOString()
      };
    }
    if (table.includes("case")) {
      return {
        id: row["Case_ID"] || row["Case ID"] || row["id"],
        clientId: row["Client_ID"] || row["Client ID"] || "",
        clientName: row["Client_Name"] || row["Client Name"] || "",
        assignedStaffIds: row["Staff_ID"] || row["Assigned Staff IDs"] ? (row["Staff_ID"] || row["Assigned Staff IDs"]).toString().split(",").map((s: string) => s.trim()) : [],
        serviceId: row["Service_ID"] || row["Service ID"] || "",
        serviceName: row["Service_Name"] || row["Service Name"] || "",
        priority: row["Priority"] || "MEDIUM",
        status: row["Status"] || "NOT_STARTED",
        updatedAt: row["Updated_At"] || row["Updated At"] || row["Last_Modified"] || new Date().toISOString()
      };
    }
    if (table.includes("user") || table.includes("staff")) {
      const email = row["Email"] || row["email"] || "";
      const rawMobile = row["Mobile"] || row["mobile"] || row["Phone"] || row["phone"] || "";
      const mobile = cleanPhoneNumberFromSheets(rawMobile);
      const healedMobile = (!mobile || mobile.toUpperCase().includes("ERROR") || mobile.includes("#")) 
        ? (email.toLowerCase().includes("jainnagarwal26") ? "+91 8828147889" : (email.toLowerCase().includes("amit") ? "+91 9876543210" : ""))
        : mobile;
      return {
        id: row["User ID"] || row["User_ID"] || row["id"] || "",
        email: email,
        name: row["Name"] || row["name"] || "",
        username: row["Username"] || row["username"] || "",
        mobile: healedMobile,
        designation: row["Designation"] || row["designation"] || "",
        role: row["Role"] || row["role"] || "STAFF",
        status: row["Status"] || row["status"] || "ACTIVE"
      };
    }
    return row;
  }
}
