/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: CRM Contact Person Types
 */

export interface ClientContactPerson {
  id?: string;
  clientId: string;
  contactName: string;
  role: string; // Director, Accountant, HR Manager, Authorized Signatory
  email?: string;
  phone?: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}
