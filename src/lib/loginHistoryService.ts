/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoginHistoryEntry } from "../types/clientActivation";
import { ActivationService } from "./activationService";
import { supabase } from "./supabase";

const STORAGE_KEY_LOGIN_HIST = "jn_officeos_login_history";
const STORAGE_KEY_FAILED_ATTEMPTS = "jn_officeos_failed_attempts";

export class LoginHistoryService {
  private static historyCache: LoginHistoryEntry[] = [];
  private static failedAttemptsCache: Record<string, number> = {};
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.historyCache = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGIN_HIST) || "[]");
      this.failedAttemptsCache = JSON.parse(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS) || "{}");
    } catch (e) {
      console.error("Failed to initialize login history service cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY_LOGIN_HIST, JSON.stringify(this.historyCache));
    localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, JSON.stringify(this.failedAttemptsCache));
  }

  public static async recordLoginSuccess(clientId: string, email?: string, deviceInfo?: string): Promise<void> {
    this.init();
    
    // Reset failed counter
    this.failedAttemptsCache[clientId] = 0;

    const entry: LoginHistoryEntry = {
      id: `lh_${Date.now()}`,
      historyId: `lh_${Date.now()}`,
      clientId,
      userEmail: email,
      status: "SUCCESS",
      ipAddress: "127.0.0.1",
      deviceInfo: deviceInfo || "Browser",
      createdAt: new Date().toISOString()
    };

    this.historyCache.unshift(entry);
    this.persist();

    if (supabase) {
      try {
        await supabase.from("jn_client_login_history").insert([{
          history_id: entry.historyId,
          client_id: clientId,
          user_email: email,
          status: "SUCCESS",
          ip_address: "127.0.0.1",
          device_info: entry.deviceInfo,
          created_at: entry.createdAt
        }]);
      } catch (e) {
        console.error("Supabase login history insert error", e);
      }
    }
  }

  public static async recordLoginFailure(clientId: string, email?: string, reason?: string): Promise<{ isLocked: boolean; attemptsRemaining: number }> {
    this.init();

    const currentFailures = (this.failedAttemptsCache[clientId] || 0) + 1;
    this.failedAttemptsCache[clientId] = currentFailures;

    let isLocked = false;
    if (currentFailures >= 5) {
      isLocked = true;
      ActivationService.setPortalStatus(clientId, "Locked");
    }

    const entry: LoginHistoryEntry = {
      id: `lh_${Date.now()}`,
      historyId: `lh_${Date.now()}`,
      clientId,
      userEmail: email,
      status: isLocked ? "ACCOUNT_LOCKED" : "FAILED_PASSWORD",
      ipAddress: "127.0.0.1",
      failureReason: reason || "Invalid password",
      createdAt: new Date().toISOString()
    };

    this.historyCache.unshift(entry);
    this.persist();

    return {
      isLocked,
      attemptsRemaining: Math.max(0, 5 - currentFailures)
    };
  }

  public static unlockAccount(clientId: string): void {
    this.init();
    this.failedAttemptsCache[clientId] = 0;
    ActivationService.setPortalStatus(clientId, "Active");
    this.persist();
  }

  public static getHistoryByClientId(clientId: string): LoginHistoryEntry[] {
    this.init();
    return this.historyCache.filter(h => h.clientId === clientId);
  }
}
