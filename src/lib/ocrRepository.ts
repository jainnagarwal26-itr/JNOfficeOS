/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./supabase";
import { OCRJob, OCRResult, DocumentClassification, DocumentField, DocumentValidation } from "../types/ocr";

const STORAGE_KEYS = {
  OCR_JOBS: "jn_officeos_ocr_jobs",
  OCR_RESULTS: "jn_officeos_ocr_results",
  DOC_CLASSIFICATIONS: "jn_officeos_doc_classifications",
  DOC_FIELDS: "jn_officeos_doc_fields"
};

export class OCRRepository {
  private static jobsCache: OCRJob[] = [];
  private static resultsCache: OCRResult[] = [];
  private static classificationsCache: DocumentClassification[] = [];
  private static fieldsCache: DocumentField[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.jobsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.OCR_JOBS) || "[]");
      this.resultsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.OCR_RESULTS) || "[]");
      this.classificationsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOC_CLASSIFICATIONS) || "[]");
      this.fieldsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOC_FIELDS) || "[]");
    } catch (e) {
      console.error("Failed to initialize local OCR repository cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEYS.OCR_JOBS, JSON.stringify(this.jobsCache));
    localStorage.setItem(STORAGE_KEYS.OCR_RESULTS, JSON.stringify(this.resultsCache));
    localStorage.setItem(STORAGE_KEYS.DOC_CLASSIFICATIONS, JSON.stringify(this.classificationsCache));
    localStorage.setItem(STORAGE_KEYS.DOC_FIELDS, JSON.stringify(this.fieldsCache));
  }

  public static async createOCRJob(job: OCRJob): Promise<OCRJob> {
    this.init();
    this.jobsCache.unshift(job);
    this.persist();

    // Supabase Persistence
    if (supabase) {
      try {
        await supabase.from("jn_ocr_jobs").insert([{
          job_id: job.jobId,
          document_id: job.documentId,
          client_id: job.clientId,
          status: job.status,
          provider: job.provider,
          priority: job.priority,
          retry_count: job.retryCount,
          max_retries: job.maxRetries,
          error_message: job.errorMessage,
          created_at: job.createdAt,
          created_by: job.createdBy
        }]);
      } catch (e) {
        console.error("Supabase OCR job insert failed", e);
      }
    }
    return job;
  }

  public static async saveOCRResult(
    result: OCRResult,
    classification: DocumentClassification,
    fields: DocumentField[],
    validations: DocumentValidation[]
  ): Promise<void> {
    this.init();
    
    this.resultsCache.unshift(result);
    this.classificationsCache.unshift(classification);
    this.fieldsCache.push(...fields);
    
    // Update job status in cache
    const jobIndex = this.jobsCache.findIndex(j => j.id === result.jobId || j.jobId === result.jobId);
    if (jobIndex !== -1) {
      this.jobsCache[jobIndex].status = "COMPLETED";
      this.jobsCache[jobIndex].completedAt = new Date().toISOString();
    }

    this.persist();

    // Supabase Async Sync
    if (supabase) {
      try {
        await supabase.from("jn_ocr_results").insert([{
          result_id: result.resultId,
          job_id: result.jobId,
          document_id: result.documentId,
          raw_text: result.rawText,
          page_count: result.pageCount,
          overall_confidence: result.overallConfidence,
          created_at: result.createdAt
        }]);

        await supabase.from("jn_document_classification").insert([{
          classification_id: classification.classificationId,
          document_id: classification.documentId,
          result_id: classification.resultId,
          document_type: classification.documentType,
          confidence: classification.confidence,
          created_at: classification.createdAt
        }]);

        if (fields.length > 0) {
          const mappedFields = fields.map(f => ({
            field_id: f.fieldId,
            document_id: f.documentId,
            result_id: f.resultId,
            field_name: f.fieldName,
            field_value: f.fieldValue,
            normalized_value: f.normalizedValue,
            field_type: f.fieldType,
            confidence: f.confidence,
            page_number: f.pageNumber,
            validation_status: f.validationStatus,
            created_at: f.createdAt
          }));
          await supabase.from("jn_document_fields").insert(mappedFields);
        }
      } catch (e) {
        console.error("Supabase OCR Result Sync Error:", e);
      }
    }
  }

  public static getOCRResultByDocumentId(documentId: string): OCRResult | undefined {
    this.init();
    return this.resultsCache.find(r => r.documentId === documentId);
  }

  public static getClassificationByDocumentId(documentId: string): DocumentClassification | undefined {
    this.init();
    return this.classificationsCache.find(c => c.documentId === documentId);
  }

  public static getFieldsByDocumentId(documentId: string): DocumentField[] {
    this.init();
    return this.fieldsCache.filter(f => f.documentId === documentId);
  }
}
