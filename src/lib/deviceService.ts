/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateHashSync } from "./hash";
import { RegisteredDevice } from "../types/clientActivation";
import { supabase } from "./supabase";

const STORAGE_KEY_DEVICES = "jn_officeos_registered_devices";

export class DeviceService {
  private static devicesCache: RegisteredDevice[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.devicesCache = JSON.parse(localStorage.getItem(STORAGE_KEY_DEVICES) || "[]");
    } catch (e) {
      console.error("Failed to initialize device service cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(this.devicesCache));
  }

  public static getDeviceFingerprint(): string {
    const ua = navigator.userAgent;
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    return generateHashSync(`FP_${ua}_${screenRes}`);
  }

  public static getDeviceInfo(): { name: string; browser: string; os: string } {
    const ua = navigator.userAgent;
    let browser = "Chrome";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";

    let os = "Windows";
    if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone")) os = "iOS";

    return {
      name: `${os} (${browser})`,
      browser,
      os
    };
  }

  public static async registerOrUpdateDevice(clientId: string): Promise<{ isNewDevice: boolean; device: RegisteredDevice }> {
    this.init();

    const fingerprint = this.getDeviceFingerprint();
    const info = this.getDeviceInfo();
    const existing = this.devicesCache.find(d => d.clientId === clientId && d.deviceFingerprint === fingerprint);

    if (existing) {
      existing.lastLoginAt = new Date().toISOString();
      this.persist();
      return { isNewDevice: false, device: existing };
    }

    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDevice: RegisteredDevice = {
      id: deviceId,
      deviceId,
      clientId,
      deviceFingerprint: fingerprint,
      deviceName: info.name,
      browser: info.browser,
      os: info.os,
      ipAddress: "127.0.0.1",
      isTrusted: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.devicesCache.unshift(newDevice);
    this.persist();

    if (supabase) {
      try {
        await supabase.from("jn_client_registered_devices").insert([{
          device_id: deviceId,
          client_id: clientId,
          device_fingerprint: fingerprint,
          device_name: info.name,
          browser: info.browser,
          os: info.os,
          ip_address: "127.0.0.1",
          is_trusted: true,
          last_login_at: newDevice.lastLoginAt,
          created_at: newDevice.createdAt
        }]);
      } catch (e) {
        console.error("Supabase device insert error", e);
      }
    }

    return { isNewDevice: true, device: newDevice };
  }

  public static getDevicesByClientId(clientId: string): RegisteredDevice[] {
    this.init();
    return this.devicesCache.filter(d => d.clientId === clientId);
  }
}
