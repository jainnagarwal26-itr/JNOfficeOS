/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientDashboardData } from "../types/clientPortal";
import { getClients } from "./db";
import { FinancialRepository } from "./financialRepository";
import { DocumentRepository } from "./documentRepository";
import { OCRRepository } from "./ocrRepository";
import { ClientPortalRepository } from "./clientPortalRepository";

export class ClientDashboardService {
  /**
   * Aggregates real-time client overview metrics for the Client Self-Service Portal
   */
  public static async getClientDashboardData(clientId: string): Promise<ClientDashboardData> {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId) || {
      id: clientId,
      name: "Valued Client",
      tradeName: "",
      email: "",
      mobile: "",
      pan: "",
      gstin: ""
    };

    // Aggregate Ledger & Financial Data
    const ledger = FinancialRepository.getClientLedger(clientId);
    const invoices = FinancialRepository.getInvoices({ role: "OWNER", permissions: {} } as any)
      .filter(i => i.clientId === clientId);

    // Aggregate Documents & OCR Statuses
    const docs = DocumentRepository.getDocuments()
      .filter(d => d.clientId === clientId);
    
    const recentDocs = docs.slice(0, 5).map(d => {
      const ocrResult = OCRRepository.getOCRResultByDocumentId(d.id);
      const classification = OCRRepository.getClassificationByDocumentId(d.id);
      return {
        ...d,
        ocrResult,
        classification
      };
    });

    // Requests & Appointments
    const requests = await ClientPortalRepository.getRequestsByClientId(clientId);
    const appointments = await ClientPortalRepository.getAppointmentsByClientId(clientId);

    // Profile Completion Percentage
    let completion = 40; // Base
    if (client.pan) completion += 15;
    if (client.gstin) completion += 15;
    if (client.mobile) completion += 15;
    if (client.email) completion += 15;

    return {
      clientId: client.id,
      clientName: client.name,
      tradeName: (client as any).tradeName || "",
      email: (client as any).email || "",
      mobile: (client as any).mobile || "",
      pan: (client as any).pan || "",
      gstin: (client as any).gstin || "",
      profileCompletionPercent: completion,
      outstandingBalance: ledger.outstandingBalance,
      totalBilled: ledger.totalBilled,
      totalPaid: ledger.totalPaid,
      pendingTasksCount: requests.filter(r => r.status === "OPEN" || r.status === "IN_PROGRESS").length,
      activeDocumentsCount: docs.length,
      recentInvoices: invoices.slice(0, 5),
      recentDocuments: recentDocs,
      recentRequests: requests.slice(0, 5),
      upcomingAppointments: appointments.filter(a => a.status === "SCHEDULED").slice(0, 5)
    };
  }
}
