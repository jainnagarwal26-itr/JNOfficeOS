/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateHashSync } from "./hash";
import { supabase } from "./supabase";
import { ActivationToken, PortalAccessStatus } from "../types/clientActivation";
import { getClients } from "./db";

const STORAGE_KEY_TOKENS = "jn_officeos_activation_tokens";
const STORAGE_KEY_STATUSES = "jn_officeos_portal_access_statuses";

export class ActivationService {
  private static tokensCache: ActivationToken[] = [];
  private static statusesCache: Record<string, PortalAccessStatus> = {};
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.tokensCache = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || "[]");
      this.statusesCache = JSON.parse(localStorage.getItem(STORAGE_KEY_STATUSES) || "{}");
    } catch (e) {
      console.error("Failed to initialize activation service cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(this.tokensCache));
    localStorage.setItem(STORAGE_KEY_STATUSES, JSON.stringify(this.statusesCache));
  }

  public static getPortalStatus(clientId: string): PortalAccessStatus {
    this.init();
    return this.statusesCache[clientId] || "Disabled";
  }

  public static setPortalStatus(clientId: string, status: PortalAccessStatus): void {
    this.init();
    this.statusesCache[clientId] = status;
    this.persist();
  }

  /**
   * Generates a 256-bit cryptographically secure token, stores only its SHA-256 HASH,
   * sets 24-hour expiry, and returns the raw activation URL.
   */
  public static async generateActivationToken(clientId: string): Promise<{ rawToken: string; activationUrl: string; expiresAt: string }> {
    this.init();
    
    // Generate 256-bit raw random token
    const randomArray = new Uint8Array(32);
    crypto.getRandomValues(randomArray);
    const rawToken = Array.from(randomArray, byte => byte.toString(16).padStart(2, "0")).join("");

    // Compute SHA-256 Hash of raw token (NEVER store raw token)
    const tokenHash = generateHashSync(`ACT_TOKEN_${rawToken}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 Hours
    const tokenId = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const tokenObj: ActivationToken = {
      id: tokenId,
      tokenId,
      clientId,
      tokenHash,
      expiresAt,
      isUsed: false,
      createdAt: new Date().toISOString()
    };

    // Invalidate prior active tokens for this client
    this.tokensCache = this.tokensCache.map(t => t.clientId === clientId ? { ...t, isUsed: true } : t);
    this.tokensCache.unshift(tokenObj);

    // Update status to 'Invitation Sent'
    this.statusesCache[clientId] = "Invitation Sent";
    this.persist();

    // Supabase Persistence
    if (supabase) {
      try {
        await supabase.from("jn_client_activation_tokens").insert([{
          token_id: tokenId,
          client_id: clientId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          is_used: false,
          created_at: tokenObj.createdAt
        }]);
      } catch (e) {
        console.error("Supabase activation token insert error", e);
      }
    }

    const activationUrl = `${window.location.origin}/activate/${rawToken}`;
    return {
      rawToken,
      activationUrl,
      expiresAt
    };
  }

  /**
   * Validates raw activation token against SHA-256 hash in storage/DB
   */
  public static async validateActivationToken(rawToken: string): Promise<{ isValid: boolean; clientId?: string; errorMessage?: string }> {
    this.init();

    if (!rawToken || rawToken.trim() === "") {
      return { isValid: false, errorMessage: "Invalid activation token format." };
    }

    const tokenHash = generateHashSync(`ACT_TOKEN_${rawToken.trim()}`);
    const matchedToken = this.tokensCache.find(t => t.tokenHash === tokenHash);

    if (!matchedToken) {
      return { isValid: false, errorMessage: "Activation link not found or invalid." };
    }

    if (matchedToken.isUsed) {
      return { isValid: false, errorMessage: "This activation link has already been used." };
    }

    if (new Date(matchedToken.expiresAt).getTime() < Date.now()) {
      return { isValid: false, errorMessage: "Activation link has expired (24-hour limit exceeded). Please request a new link from office." };
    }

    return {
      isValid: true,
      clientId: matchedToken.clientId
    };
  }

  /**
   * Marks token as consumed after successful activation
   */
  public static async consumeActivationToken(rawToken: string): Promise<void> {
    this.init();
    const tokenHash = generateHashSync(`ACT_TOKEN_${rawToken.trim()}`);
    const index = this.tokensCache.findIndex(t => t.tokenHash === tokenHash);
    if (index !== -1) {
      this.tokensCache[index].isUsed = true;
      this.tokensCache[index].usedAt = new Date().toISOString();
      const cid = this.tokensCache[index].clientId;
      this.statusesCache[cid] = "Active";
      this.persist();
    }
  }
}
