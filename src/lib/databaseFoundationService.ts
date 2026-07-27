/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 1: Database Foundation & Core Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export interface SystemHealthStatus {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  databaseConnected: boolean;
  activeSessions: number;
}

export class DatabaseFoundationService {

  /**
   * Generates the next human-readable business number (e.g. CL000001, JNA/2026-27/000001, CAS000001)
   */
  async getNextBusinessNumber(sequenceCode: "CLIENT" | "INVOICE" | "RECEIPT" | "CASE" | "SERVICE" | "DOC" | "EXPENSE"): Promise<string> {
    if (!isSupabaseConfigured()) {
      const fallbackCounter = Math.floor(100000 + Math.random() * 900000);
      const prefixes: Record<string, string> = {
        CLIENT: "CL",
        INVOICE: "JNA/2026-27/",
        RECEIPT: "REC",
        CASE: "CAS",
        SERVICE: "SRV",
        DOC: "DOC",
        EXPENSE: "EXP"
      };
      return `${prefixes[sequenceCode] || "SEQ-"}${fallbackCounter}`;
    }

    try {
      const { data, error } = await supabase.rpc("generate_next_business_number", {
        p_sequence_code: sequenceCode
      });

      if (error) throw error;
      return data as string;
    } catch (err: any) {
      console.error(`[FoundationService] Error generating sequence ${sequenceCode}:`, err);
      return `${sequenceCode}-${Date.now().toString().slice(-6)}`;
    }
  }

  /**
   * System Health Audit Query
   */
  async checkSystemHealth(): Promise<SystemHealthStatus> {
    const startTime = performance.now();
    if (!isSupabaseConfigured()) {
      return {
        status: "HEALTHY",
        latencyMs: Math.round(performance.now() - startTime),
        databaseConnected: false,
        activeSessions: 1
      };
    }

    try {
      const { data, error } = await supabase.from("jn_system_health").select("count").limit(1);
      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        return { status: "DEGRADED", latencyMs, databaseConnected: false, activeSessions: 0 };
      }

      return {
        status: "HEALTHY",
        latencyMs,
        databaseConnected: true,
        activeSessions: 1
      };
    } catch (err) {
      return {
        status: "DOWN",
        latencyMs: Math.round(performance.now() - startTime),
        databaseConnected: false,
        activeSessions: 0
      };
    }
  }
}

export const databaseFoundationService = new DatabaseFoundationService();
