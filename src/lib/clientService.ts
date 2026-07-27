/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: High-Level Client Service Engine
 */

import { EnterpriseClientProfile } from "../types/client";
import { clientValidation } from "./clientValidation";
import { clientRepository } from "./clientRepository";
import { databaseFoundationService } from "./databaseFoundationService";

export class ClientService {

  /**
   * Register a new Client with Validation, Auto Sequence Generation, and Duplicate Check
   */
  async registerNewClient(profile: Partial<EnterpriseClientProfile>): Promise<{ success: boolean; data?: EnterpriseClientProfile; errors?: string[] }> {
    // 1. Field Format Validation
    const validation = clientValidation.validateProfile(profile);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Duplicate Prevention Check
    const dupCheck = await clientValidation.checkDuplicateClient(profile.pan, profile.gstin, profile.email);
    if (dupCheck.isDuplicate) {
      return {
        success: false,
        errors: [`Duplicate Client Detected! ${dupCheck.duplicateField} already belongs to client: ${dupCheck.existingClientName}`]
      };
    }

    // 3. Generate Business Client Number (e.g. CL000001)
    const clientNumber = profile.clientNumber || await databaseFoundationService.getNextBusinessNumber("CLIENT");

    const newProfile: EnterpriseClientProfile = {
      clientNumber,
      category: profile.category || "Individual",
      clientName: profile.clientName!,
      tradeName: profile.tradeName || "",
      businessName: profile.businessName || "",
      clientSource: profile.clientSource || "Direct",
      referredBy: profile.referredBy || "",
      pan: profile.pan || "",
      aadhaar: profile.aadhaar || "",
      gstin: profile.gstin || "",
      tan: profile.tan || "",
      officeAddress: profile.officeAddress || "",
      city: profile.city || "",
      state: profile.state || "Maharashtra",
      pinCode: profile.pinCode || "",
      email: profile.email || "",
      mobile: profile.mobile || "",
      status: profile.status || "Active",
      tags: profile.tags || []
    };

    // 4. Persist to Database
    const res = await clientRepository.saveClientProfile(newProfile);
    if (!res.success) {
      return { success: false, errors: [res.error || "Failed to save client profile"] };
    }

    return { success: true, data: res.data };
  }
}

export const clientService = new ClientService();
