/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Document Management System Types
 */

export type DocumentCategory =
  | "PAN"
  | "Aadhaar"
  | "GST Certificate"
  | "ITR Acknowledgement"
  | "Balance Sheet"
  | "Profit & Loss"
  | "Bank Statement"
  | "Cancelled Cheque"
  | "ROC Documents"
  | "MOA"
  | "AOA"
  | "Partnership Deed"
  | "Trust Deed"
  | "MSME"
  | "FSSAI"
  | "Professional Tax"
  | "Digital Signature"
  | "Invoices"
  | "Receipts"
  | "Agreements"
  | "Custom Categories";

export type DocumentStatus =
  | "DRAFT"
  | "UPLOADED"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "ARCHIVED";

export interface DocumentVersion {
  id?: string;
  documentId: string;
  versionNumber: number;
  filePath: string;
  fileSizeBytes: number;
  versionRemarks?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface DocumentVerificationRecord {
  id?: string;
  documentId: string;
  verifierId: string;
  verifierName?: string;
  verificationStatus: "VERIFIED" | "REJECTED" | "REVERIFICATION_REQUESTED";
  remarks?: string;
  verifiedAt?: string;
}

export interface EnterpriseDocument {
  id?: string;
  documentNumber: string; // e.g. DOC000001
  clientId?: string;
  clientName?: string;
  caseId?: string;
  caseNumber?: string;
  category: DocumentCategory;
  documentName: string;
  originalFilename: string;
  bucketId: string; // 'jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
  status: DocumentStatus;
  issueDate?: string;
  expiryDate?: string;
  versionNumber: number;

  versions?: DocumentVersion[];
  verifications?: DocumentVerificationRecord[];

  createdAt?: string;
  updatedAt?: string;
}
