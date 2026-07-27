/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateHashSync } from "./hash";
import { supabase } from "./supabase";
import { OTPRequest } from "../types/clientActivation";
import { getClients } from "./db";

const STORAGE_KEY_OTP = "jn_officeos_otp_requests";

export class OTPService {
  private static otpCache: OTPRequest[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.otpCache = JSON.parse(localStorage.getItem(STORAGE_KEY_OTP) || "[]");
    } catch (e) {
      console.error("Failed to initialize OTP service cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(this.otpCache));
  }

  /**
   * Generates a 6-digit OTP, validates target mobile against CRM registered mobile,
   * stores hashed OTP with 10-minute expiry, and returns raw OTP for delivery.
   */
  public static async sendOTP(
    clientId: string,
    mobileNumber: string,
    purpose: OTPRequest["purpose"] = "ACTIVATION"
  ): Promise<{ success: boolean; rawOTP?: string; errorMessage?: string }> {
    this.init();

    // CRM Mobile Matching Check
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      return { success: false, errorMessage: "Client profile not found in CRM." };
    }

    const cleanInputMobile = mobileNumber.replace(/\D/g, "").slice(-10);
    const cleanCrmMobile = (client.mobile || "").replace(/\D/g, "").slice(-10);

    if (cleanInputMobile !== cleanCrmMobile) {
      return { success: false, errorMessage: "Mobile number mismatch. Must match CRM registered mobile number." };
    }

    // Generate 6-digit OTP
    const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = generateHashSync(`OTP_${clientId}_${rawOTP}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const otpId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const otpObj: OTPRequest = {
      id: otpId,
      otpId,
      clientId,
      mobileNumber,
      otpHash,
      expiresAt,
      isVerified: false,
      purpose,
      createdAt: new Date().toISOString()
    };

    this.otpCache.unshift(otpObj);
    this.persist();

    // Supabase Persistence
    if (supabase) {
      try {
        await supabase.from("jn_client_otp_requests").insert([{
          otp_id: otpId,
          client_id: clientId,
          mobile_number: mobileNumber,
          otp_hash: otpHash,
          expires_at: expiresAt,
          is_verified: false,
          purpose,
          created_at: otpObj.createdAt
        }]);
      } catch (e) {
        console.error("Supabase OTP insert error", e);
      }
    }

    return {
      success: true,
      rawOTP
    };
  }

  /**
   * Verifies input 6-digit OTP against stored SHA-256 hash
   */
  public static async verifyOTP(clientId: string, rawOTP: string): Promise<{ success: boolean; errorMessage?: string }> {
    this.init();

    const otpHash = generateHashSync(`OTP_${clientId}_${rawOTP.trim()}`);
    const match = this.otpCache.find(o => o.clientId === clientId && o.otpHash === otpHash && !o.isVerified);

    if (!match) {
      return { success: false, errorMessage: "Invalid OTP entered. Please try again." };
    }

    if (new Date(match.expiresAt).getTime() < Date.now()) {
      return { success: false, errorMessage: "OTP has expired. Please request a new OTP." };
    }

    match.isVerified = true;
    this.persist();
    return { success: true };
  }
}
