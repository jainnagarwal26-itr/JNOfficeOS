/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Non-Destructive Production Migration & Preservation Utility
 */

import { supabaseService } from "./supabaseService";
import { getClients, getUsers } from "./db";
import { ComplianceRepository } from "./complianceRepository";

export interface MigrationReport {
  timestamp: string;
  totalUsersFound: number;
  usersMigrated: number;
  usersSkipped: number;
  totalClientsFound: number;
  clientsMigrated: number;
  clientsSkipped: number;
  totalComplianceRecordsFound: number;
  complianceRecordsMigrated: number;
  complianceRecordsSkipped: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  errors: string[];
  preservedClientIds: string[];
}

export async function runAutomatedDataMigration(): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalUsersFound: 0,
    usersMigrated: 0,
    usersSkipped: 0,
    totalClientsFound: 0,
    clientsMigrated: 0,
    clientsSkipped: 0,
    totalComplianceRecordsFound: 0,
    complianceRecordsMigrated: 0,
    complianceRecordsSkipped: 0,
    status: "SUCCESS",
    errors: [],
    preservedClientIds: []
  };

  try {
    // 1. SAFE MIGRATION OF USERS (Chirag Jain & Staff)
    const users = getUsers();
    report.totalUsersFound = users.length;
    for (const user of users) {
      const res = await supabaseService.upsertUser(user);
      if (res.success) {
        report.usersMigrated++;
      } else {
        report.errors.push(`User ${user.email}: ${res.error}`);
      }
    }

    // 2. SAFE MIGRATION OF PRODUCTION CLIENTS (Preserve CL000001, CL000002, CL000004)
    const clients = getClients();
    report.totalClientsFound = clients.length;

    for (const client of clients) {
      report.preservedClientIds.push(client.id);
      const res = await supabaseService.upsertClient(client);
      if (res.success) {
        report.clientsMigrated++;
      } else if (res.error) {
        report.errors.push(`Client ${client.id} (${client.name}): ${res.error}`);
      }
    }

    // 3. SAFE MIGRATION OF COMPLIANCE REGISTER RECORDS
    const complianceRecords = ComplianceRepository.getAllRecords();
    report.totalComplianceRecordsFound = complianceRecords.length;

    for (const record of complianceRecords) {
      const res = await supabaseService.upsertComplianceRegisterRecord(record);
      if (res.success) {
        report.complianceRecordsMigrated++;
      } else if (res.error) {
        report.errors.push(`Compliance Record ${record.recordId}: ${res.error}`);
      }
    }

    if (report.errors.length > 0 && report.clientsMigrated === 0 && report.usersMigrated === 0) {
      report.status = "FAILED";
    } else if (report.errors.length > 0) {
      report.status = "PARTIAL";
    }

    console.log("[ProductionMigration] Non-Destructive Data Sync Complete:", report);
  } catch (err: any) {
    report.status = "FAILED";
    report.errors.push(`Fatal Migration Exception: ${err.message}`);
  }

  return report;
}
