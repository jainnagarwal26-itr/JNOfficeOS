/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PortalAccessStatus = "Disabled" | "Invitation Sent" | "Active" | "Suspended" | "Locked";

export interface ActivationToken {
  id: string;
  tokenId: string;
  clientId: string;
  tokenHash: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  historyId: string;
  clientId: string;
  userEmail?: string;
  status: "SUCCESS" | "FAILED_PASSWORD" | "ACCOUNT_LOCKED" | "OTP_REQUIRED";
  ipAddress?: string;
  deviceInfo?: string;
  failureReason?: string;
  createdAt: string;
}

export interface RegisteredDevice {
  id: string;
  deviceId: string;
  clientId: string;
  deviceFingerprint: string;
  deviceName: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  isTrusted: boolean;
  lastLoginAt: string;
  createdAt: string;
}

export interface PasswordResetToken {
  id: string;
  resetId: string;
  clientId: string;
  resetTokenHash: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
}

export interface OTPRequest {
  id: string;
  otpId: string;
  clientId: string;
  mobileNumber: string;
  otpHash: string;
  expiresAt: string;
  isVerified: boolean;
  purpose: "ACTIVATION" | "LOGIN_DEVICE_OTP" | "PASSWORD_RESET";
  createdAt: string;
}
