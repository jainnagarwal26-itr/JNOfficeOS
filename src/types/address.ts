/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: CRM Address Types
 */

export type AddressType =
  | "Registered Office"
  | "Head Office"
  | "Branch Office"
  | "Factory"
  | "Correspondence Address";

export interface ClientAddress {
  id?: string;
  clientId: string;
  addressType: AddressType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}
