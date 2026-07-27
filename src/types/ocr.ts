/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OCRJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type DocumentClassificationType =
  | "PAN_CARD"
  | "AADHAAR_CARD"
  | "GST_CERTIFICATE"
  | "ITR_ACKNOWLEDGEMENT"
  | "FORM_16"
  | "INVOICE"
  | "RECEIPT"
  | "CANCELLED_CHEQUE"
  | "BANK_STATEMENT"
  | "BALANCE_SHEET"
  | "PROFIT_LOSS_STATEMENT"
  | "AUDIT_REPORT"
  | "UNKNOWN";

export type OCRProviderType =
  | "GOOGLE_DOCUMENT_AI"
  | "AZURE_DOCUMENT_INTELLIGENCE"
  | "AWS_TEXTRACT"
  | "TESSERACT"
  | "GEMINI_VISION"
  | "OPENAI_VISION"
  | "BROWSER_VISION_FALLBACK";

export interface OCRJob {
  id: string;
  jobId: string;
  documentId: string;
  clientId?: string;
  status: OCRJobStatus;
  provider: OCRProviderType;
  priority: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
}

export interface OCRPage {
  id: string;
  pageId: string;
  resultId: string;
  pageNumber: number;
  pageText: string;
  width?: number;
  height?: number;
  confidence: number;
  createdAt: string;
}

export interface OCRResult {
  id: string;
  resultId: string;
  jobId: string;
  documentId: string;
  rawText: string;
  pageCount: number;
  language: string;
  overallConfidence: number;
  providerMetadata?: Record<string, any>;
  pages?: OCRPage[];
  createdAt: string;
}

export interface DocumentClassification {
  id: string;
  classificationId: string;
  documentId: string;
  resultId?: string;
  documentType: DocumentClassificationType;
  confidence: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface DocumentField {
  id: string;
  fieldId: string;
  documentId: string;
  resultId: string;
  fieldName: string;
  fieldValue: string;
  normalizedValue?: string;
  fieldType: "text" | "number" | "date" | "currency" | "boolean";
  confidence: number;
  pageNumber: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  validationStatus: "VALIDATED" | "WARNING" | "FAILED";
  createdAt: string;
}

export interface DocumentValidation {
  id: string;
  validationId: string;
  documentId: string;
  ruleCode: string;
  ruleName: string;
  status: "PASSED" | "WARNING" | "FAILED";
  errorMessage?: string;
  checkedAt: string;
}

export interface FieldExtractionResult {
  classification: DocumentClassificationType;
  classificationConfidence: number;
  rawText: string;
  fields: Array<Omit<DocumentField, "id" | "fieldId" | "documentId" | "resultId" | "createdAt">>;
  validations: Array<Omit<DocumentValidation, "id" | "validationId" | "documentId" | "checkedAt">>;
  overallConfidence: number;
}
