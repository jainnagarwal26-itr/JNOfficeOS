/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: Enterprise Client CRM Profile Types
 */

import { ClientAddress } from "./address";
import { ClientContactPerson } from "./contact";
import { ClientCommunicationLog, ClientFollowup } from "./communication";

export type ClientCategory =
  | "Individual"
  | "Proprietorship"
  | "Partnership"
  | "LLP"
  | "Private Limited"
  | "Public Limited"
  | "Trust"
  | "Society"
  | "NGO"
  | "HUF"
  | "Government Organization";

export type ClientSource =
  | "Direct"
  | "Indirect / Referral"
  | "Website"
  | "Walk-in"
  | "Campaign";

export interface EnterpriseClientProfile {
  id?: string;
  clientNumber: string; // e.g. CL000001
  category: ClientCategory;
  clientName: string;
  tradeName?: string;
  businessName?: string;
  clientSource: ClientSource;
  referredBy?: string;
  pan?: string;
  aadhaar?: string;
  gstin?: string;
  tan?: string;
  cin?: string;
  llpin?: string;
  msmeRegistration?: string;
  udyamRegistration?: string;
  fssaiNumber?: string;
  iecNumber?: string;
  professionalTaxNumber?: string;
  pfNumber?: string;
  esicNumber?: string;
  officeAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  businessNature?: string;
  businessType?: string;
  constitution?: string;
  dateOfIncorporation?: string;
  dateOfRegistration?: string;
  financialYear?: string;
  assessmentYear?: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  whatsapp?: string;
  website?: string;
  status: "Active" | "Inactive" | "Suspended";
  priority?: "Low" | "Medium" | "High" | "Critical";
  tags?: string[];
  internalNotes?: string;
  assignedManagerId?: string;
  assignedStaffIds?: string[];

  // Linked Domain Collections
  contacts?: ClientContactPerson[];
  addresses?: ClientAddress[];
  communications?: ClientCommunicationLog[];
  followups?: ClientFollowup[];

  createdAt?: string;
  updatedAt?: string;
  versionNumber?: number;
}
