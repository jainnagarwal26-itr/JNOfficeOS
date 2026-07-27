/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ComplianceMasterItem, ClientComplianceConfig, ComplianceRegisterRecord, 
  ComplianceActivityLog, ComplianceAuditLog 
} from "../types/compliance";
import { supabase } from "./supabase";
import { getClients } from "./db";

const STORAGE_KEY_MASTER = "jn_officeos_compliance_master";
const STORAGE_KEY_CONFIGS = "jn_officeos_client_compliances";
const STORAGE_KEY_REGISTER = "jn_officeos_compliance_register";
const STORAGE_KEY_ACTIVITIES = "jn_officeos_compliance_activities";
const STORAGE_KEY_AUDITS = "jn_officeos_compliance_audits";

export const DEFAULT_COMPLIANCE_CATALOG: ComplianceMasterItem[] = [
  { id: "cm_1", code: "ITR_INDIVIDUAL", name: "Income Tax Return (Individual/HUF)", category: "DIRECT_TAX", frequency: "YEARLY", authority: "Income Tax Department", defaultDueDay: 31, isActive: true },
  { id: "cm_2", code: "ITR_CORPORATE", name: "Income Tax Return (Company/Audit Cases)", category: "DIRECT_TAX", frequency: "YEARLY", authority: "Income Tax Department", defaultDueDay: 31, isActive: true },
  { id: "cm_3", code: "TAX_AUDIT", name: "Tax Audit Report (Form 3CA/3CB-3CD)", category: "DIRECT_TAX", frequency: "YEARLY", authority: "Income Tax Department", defaultDueDay: 30, isActive: true },
  { id: "cm_4", code: "TDS_QUARTERLY", name: "TDS Quarterly Return (Form 24Q/26Q/27Q)", category: "DIRECT_TAX", frequency: "QUARTERLY", authority: "Income Tax Department", defaultDueDay: 31, isActive: true },
  { id: "cm_5", code: "GSTR_1", name: "GST Return GSTR-1 (Outward Supplies)", category: "INDIRECT_TAX", frequency: "MONTHLY", authority: "GSTN Portal", defaultDueDay: 11, isActive: true },
  { id: "cm_6", code: "GSTR_3B", name: "GST Return GSTR-3B (Summary & Tax Payment)", category: "INDIRECT_TAX", frequency: "MONTHLY", authority: "GSTN Portal", defaultDueDay: 20, isActive: true },
  { id: "cm_7", code: "CMP_08", name: "GST Composition Statement (CMP-08)", category: "INDIRECT_TAX", frequency: "QUARTERLY", authority: "GSTN Portal", defaultDueDay: 18, isActive: true },
  { id: "cm_8", code: "GSTR_9", name: "GST Annual Return (GSTR-9 & 9C)", category: "INDIRECT_TAX", frequency: "YEARLY", authority: "GSTN Portal", defaultDueDay: 31, isActive: true }
];

export class ComplianceRepository {
  private static masterCache: ComplianceMasterItem[] = [];
  private static configsCache: ClientComplianceConfig[] = [];
  private static registerCache: ComplianceRegisterRecord[] = [];
  private static activitiesCache: ComplianceActivityLog[] = [];
  private static auditsCache: ComplianceAuditLog[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.masterCache = DEFAULT_COMPLIANCE_CATALOG;
      localStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(DEFAULT_COMPLIANCE_CATALOG));
      
      this.configsCache = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIGS) || "[]");
      
      const rawRegister: ComplianceRegisterRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTER) || "[]");
      const validCodes = new Set(DEFAULT_COMPLIANCE_CATALOG.map(c => c.code));
      this.registerCache = rawRegister.filter(r => validCodes.has(r.complianceCode));
      
      this.activitiesCache = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || "[]");
      this.auditsCache = JSON.parse(localStorage.getItem(STORAGE_KEY_AUDITS) || "[]");
    } catch (e) {
      console.error("Failed to initialize compliance repository", e);
      this.masterCache = DEFAULT_COMPLIANCE_CATALOG;
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(this.masterCache));
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(this.configsCache));
    localStorage.setItem(STORAGE_KEY_REGISTER, JSON.stringify(this.registerCache));
    localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(this.activitiesCache));
    localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(this.auditsCache));
  }

  // --- COMPLIANCE CATALOG ---
  public static getMasterCatalog(): ComplianceMasterItem[] {
    this.init();
    return this.masterCache;
  }

  // --- CLIENT COMPLIANCE CONFIGURATIONS ---
  public static getClientConfigs(clientId: string): ClientComplianceConfig[] {
    this.init();
    return this.configsCache.filter(c => c.clientId === clientId);
  }

  public static isComplianceEnabled(clientId: string, complianceCode: string): boolean {
    this.init();
    const config = this.configsCache.find(c => c.clientId === clientId && c.complianceCode === complianceCode);
    // Default to true for demo if not explicitly disabled
    return config ? config.isEnabled : true;
  }

  public static setClientComplianceConfig(clientId: string, complianceCode: string, isEnabled: boolean): void {
    this.init();
    const existingIndex = this.configsCache.findIndex(c => c.clientId === clientId && c.complianceCode === complianceCode);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      this.configsCache[existingIndex].isEnabled = isEnabled;
      this.configsCache[existingIndex].updatedAt = now;
    } else {
      const configObj: ClientComplianceConfig = {
        id: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        configId: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clientId,
        complianceCode,
        isEnabled,
        createdAt: now,
        updatedAt: now
      };
      this.configsCache.push(configObj);
    }
    this.persist();
  }

  // --- COMPLIANCE REGISTER RECORDS ---
  public static getAllRecords(): ComplianceRegisterRecord[] {
    this.init();
    return this.registerCache;
  }

  public static getRecordsByClientId(clientId: string): ComplianceRegisterRecord[] {
    this.init();
    return this.registerCache.filter(r => r.clientId === clientId);
  }

  public static saveRecord(record: ComplianceRegisterRecord, updatedBy: string): void {
    this.init();
    const index = this.registerCache.findIndex(r => r.recordId === record.recordId || r.id === record.id);
    const oldRecord = index !== -1 ? this.registerCache[index] : null;

    if (index !== -1) {
      this.registerCache[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      this.registerCache.unshift(record);
    }

    // Generate Audit Trail if modified
    if (oldRecord) {
      if (oldRecord.status !== record.status) {
        this.addAuditLog(record.recordId, record.clientId, "status", oldRecord.status, record.status, updatedBy);
      }
      if (oldRecord.ackNumber !== record.ackNumber) {
        this.addAuditLog(record.recordId, record.clientId, "ackNumber", oldRecord.ackNumber || "N/A", record.ackNumber || "N/A", updatedBy);
      }
    } else {
      this.addAuditLog(record.recordId, record.clientId, "record", "CREATED", "NEW_RECORD", updatedBy);
    }

    this.persist();

    // Supabase Persistence
    if (supabase) {
      try {
        supabase.from("jn_compliance_register").upsert([{
          record_id: record.recordId,
          client_id: record.clientId,
          compliance_code: record.complianceCode,
          compliance_name: record.complianceName,
          category: record.category,
          fy: record.fy,
          ay: record.ay,
          period: record.period,
          due_date: record.dueDate,
          filed_date: record.filedDate,
          status: record.status,
          ack_number: record.ackNumber,
          assigned_staff_id: record.assignedStaffId,
          assigned_staff_name: record.assignedStaffName,
          reviewed_by: record.reviewedBy,
          approved_by: record.approvedBy,
          remarks: record.remarks,
          created_at: record.createdAt,
          updated_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.error("Supabase compliance register upsert error", e);
      }
    }
  }

  // --- ACTIVITIES & AUDIT LOGS ---
  public static addActivityLog(recordId: string, clientId: string, action: string, performedBy: string, details?: string): void {
    this.init();
    const act: ComplianceActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recordId,
      clientId,
      action,
      performedBy,
      details,
      createdAt: new Date().toISOString()
    };
    this.activitiesCache.unshift(act);
    this.persist();
  }

  public static addAuditLog(recordId: string, clientId: string, fieldName: string, oldValue: string, newValue: string, changedBy: string): void {
    this.init();
    const audit: ComplianceAuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      auditId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recordId,
      clientId,
      fieldName,
      oldValue,
      newValue,
      changedBy,
      ipAddress: "127.0.0.1",
      createdAt: new Date().toISOString()
    };
    this.auditsCache.unshift(audit);
    this.persist();
  }

  public static getActivities(clientId?: string): ComplianceActivityLog[] {
    this.init();
    if (clientId) return this.activitiesCache.filter(a => a.clientId === clientId);
    return this.activitiesCache;
  }
}
