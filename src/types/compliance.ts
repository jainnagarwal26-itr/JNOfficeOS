/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComplianceCategory = 
  | "DIRECT_TAX" 
  | "INDIRECT_TAX" 
  | "CORPORATE_LAW" 
  | "LABOUR_LAW" 
  | "LICENSING" 
  | "OTHER";

export type ComplianceFrequency = 
  | "MONTHLY" 
  | "QUARTERLY" 
  | "YEARLY" 
  | "ONE_TIME";

export type ComplianceStatus = 
  | "NOT_STARTED" 
  | "IN_PROGRESS" 
  | "WAITING_CLIENT" 
  | "UNDER_REVIEW" 
  | "FILED" 
  | "VERIFIED" 
  | "COMPLETED" 
  | "REOPENED" 
  | "OVERDUE" 
  | "CANCELLED";

export type ITRFormType = "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4" | "ITR-5" | "ITR-6" | "ITR-7";
export type GSTFormType = "GSTR-1" | "GSTR-3B" | "CMP-08" | "GSTR-9";
export type TDSFormType = "24Q" | "26Q" | "27Q" | "27EQ";

export interface ComplianceMasterItem {
  id: string;
  code: string;
  name: string;
  category: ComplianceCategory;
  frequency: ComplianceFrequency;
  authority: string;
  defaultDueDay?: number;
  description?: string;
  isActive: boolean;
}

export interface ClientComplianceConfig {
  id: string;
  configId: string;
  clientId: string;
  complianceCode: string;
  isEnabled: boolean;
  assignedStaffId?: string;
  customRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRegisterRecord {
  id: string;
  recordId: string;
  clientId: string;
  complianceCode: string;
  complianceName: string;
  category: ComplianceCategory;
  subType?: string;
  formType?: string;
  fy: string; // e.g. "2026-27"
  ay: string; // e.g. "2027-28"
  period: string; // e.g. "April 2026", "Q1 (Apr-Jun)", "Annual"
  dueDate: string; // ISO Date YYYY-MM-DD
  filedDate?: string; // ISO Date YYYY-MM-DD
  status: ComplianceStatus;
  ackNumber?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  reviewedBy?: string;
  approvedBy?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientComplianceHealth {
  clientId: string;
  score: number; // 0 to 100
  status: "GREEN" | "YELLOW" | "RED";
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface ComplianceActivityLog {
  id: string;
  activityId: string;
  recordId: string;
  clientId: string;
  action: string;
  performedBy: string;
  details?: string;
  createdAt: string;
}

export interface ComplianceAuditLog {
  id: string;
  auditId: string;
  recordId: string;
  clientId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  userRole?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ComplianceStatistics {
  totalClients: number;
  applicableClients: number;
  totalRecords: number;
  filedCount: number;
  pendingCount: number;
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  dueThisMonthCount: number;
  completionPercentage: number;
  riskScore: number;
  firmHealthScore: number;
}

export interface ComplianceRiskAnalysis {
  clientName: string;
  clientId: string;
  overdueCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactor: string;
}
