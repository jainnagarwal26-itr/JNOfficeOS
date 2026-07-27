/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OCRJob, OCRResult, DocumentClassification, DocumentField, DocumentValidation, OCRProviderType } from "../types/ocr";
import { OCRProviderFactory } from "./ocrProvider";
import { DocumentClassificationService } from "./documentClassificationService";
import { FieldExtractionService } from "./fieldExtractionService";
import { ValidationService } from "./validationService";
import { OCRRepository } from "./ocrRepository";
import { knowledgeService } from "./knowledgeService";

export interface OCRProcessResponse {
  job: OCRJob;
  result: OCRResult;
  classification: DocumentClassification;
  fields: DocumentField[];
  validations: DocumentValidation[];
}

export class OCRService {
  /**
   * Main High-Level Enterprise OCR Processing Orchestration Engine
   * Executes Upload → Provider Extraction → Classification → Field Extraction → Validation → DB Storage → RAG Indexing
   */
  public static async processDocumentOCR(
    documentId: string,
    fileBuffer: ArrayBuffer,
    mimeType: string,
    filename: string,
    clientId?: string,
    providerType: OCRProviderType = "BROWSER_VISION_FALLBACK"
  ): Promise<OCRProcessResponse> {
    const timestamp = new Date().toISOString();
    const jobId = `job_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resultId = `res_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const classificationId = `cls_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Create PENDING OCR Job Record
    const initialJob: OCRJob = {
      id: jobId,
      jobId,
      documentId,
      clientId,
      status: "PROCESSING",
      provider: providerType,
      priority: 1,
      retryCount: 0,
      maxRetries: 3,
      createdAt: timestamp,
      startedAt: timestamp
    };
    await OCRRepository.createOCRJob(initialJob);

    // 2. Execute OCR Extraction via Provider Strategy
    const provider = OCRProviderFactory.getProvider(providerType);
    const rawOutput = await provider.processDocument(fileBuffer, mimeType, filename);

    // 3. Document Classification
    const classResult = DocumentClassificationService.classifyDocument(rawOutput.rawText, filename);
    const classification: DocumentClassification = {
      id: classificationId,
      classificationId,
      documentId,
      resultId,
      documentType: classResult.documentType,
      confidence: classResult.confidence,
      isVerified: false,
      createdAt: timestamp
    };

    // 4. Field & Entity Extraction
    const extractedFieldItems = FieldExtractionService.extractFields(rawOutput.rawText, classResult.documentType);
    const fields: DocumentField[] = extractedFieldItems.map((f, idx) => ({
      id: `fld_${Date.now()}_${idx}`,
      fieldId: `fld_${Date.now()}_${idx}`,
      documentId,
      resultId,
      fieldName: f.fieldName,
      fieldValue: f.fieldValue,
      normalizedValue: f.normalizedValue,
      fieldType: f.fieldType,
      confidence: f.confidence,
      pageNumber: f.pageNumber,
      validationStatus: "VALIDATED",
      createdAt: timestamp
    }));

    // 5. Checksum & Format Validation
    const validationRuleResults = ValidationService.validateExtractedFields(extractedFieldItems);
    const validations: DocumentValidation[] = validationRuleResults.map((v, idx) => ({
      id: `val_${Date.now()}_${idx}`,
      validationId: `val_${Date.now()}_${idx}`,
      documentId,
      ruleCode: v.ruleCode,
      ruleName: v.ruleName,
      status: v.status,
      errorMessage: v.errorMessage,
      checkedAt: timestamp
    }));

    // 6. Complete OCR Result Document
    const result: OCRResult = {
      id: resultId,
      resultId,
      jobId,
      documentId,
      rawText: rawOutput.rawText,
      pageCount: rawOutput.pageCount,
      language: "eng",
      overallConfidence: rawOutput.confidence,
      providerMetadata: rawOutput.metadata,
      createdAt: timestamp
    };

    // 7. Persist to Database & Local Cache
    await OCRRepository.saveOCRResult(result, classification, fields, validations);

    // 8. Feed OCR Extracted Text to AI RAG Foundation Engine
    try {
      knowledgeService.addArticle({
        title: `OCR Document Context: ${filename} [${classResult.documentType}]`,
        category: "TAX_LAW",
        content: `Document Name: ${filename}\nCategory: ${classResult.documentType}\nDocument ID: ${documentId}\nClient ID: ${clientId || "N/A"}\nExtracted Text:\n${rawOutput.rawText}`,
        tags: ["OCR", classResult.documentType, "INTELLIGENT_DOCUMENT_PROCESSING"]
      });
    } catch (e) {
      console.warn("Failed to index OCR result into RAG Knowledge Base", e);
    }

    initialJob.status = "COMPLETED";
    initialJob.completedAt = new Date().toISOString();

    return {
      job: initialJob,
      result,
      classification,
      fields,
      validations
    };
  }
}
