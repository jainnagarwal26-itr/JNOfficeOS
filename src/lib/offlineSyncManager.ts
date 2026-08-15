/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  // Check if browser is online
  public static isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pending-sync-updated", { detail: queue }));
    }
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
  }

  // Clear specific item from queue
  public static removeFromQueue(itemId: string): void {
    const queue = this.getPendingQueue();
    const filtered = queue.filter((item) => item.id !== itemId);
    this.savePendingQueue(filtered);
  }

  // Safe sync queue stub (Supabase is single source of truth)
  public static async syncQueue(): Promise<boolean> {
    return true;
  }
}
