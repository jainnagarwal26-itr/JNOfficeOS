/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Document Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseDocument } from "../types/document";
import { SmartDocument, DocumentVersion, DocumentVerification, DocumentReminder, SmartChecklist, User } from "../types";

const STORAGE_KEY_DOCUMENTS = "jn_officeos_smart_documents";
const STORAGE_KEY_DELETED = "jn_officeos_smart_documents_deleted";
const STORAGE_KEY_CHECKLISTS = "jn_officeos_smart_checklists";
const STORAGE_KEY_REMINDERS = "jn_officeos_smart_reminders";

// Initial default checklists for Service Master alignment
const DEFAULT_CHECKLISTS: SmartChecklist[] = [
  { id: "CHK-001", serviceId: "SRV00001", serviceName: "GST Registration Services", mandatoryDocuments: ["PAN", "Aadhaar", "Cancelled Cheque", "Agreements"] },
  { id: "CHK-002", serviceId: "SRV00002", serviceName: "Income Tax Return - ITR-1 (Sahaj)", mandatoryDocuments: ["PAN", "Form 26AS", "AIS", "Cancelled Cheque"] },
  { id: "CHK-003", serviceId: "SRV00003", serviceName: "Income Tax Return - ITR-4 (Sugam)", mandatoryDocuments: ["PAN", "Form 26AS", "AIS", "Balance Sheet", "P&L"] },
  { id: "CHK-004", serviceId: "SRV00004", serviceName: "Private Limited Company Incorporation", mandatoryDocuments: ["PAN", "Aadhaar", "Passport", "DSC", "Agreements"] },
  { id: "CHK-005", serviceId: "SRV00005", serviceName: "Professional Tax - PTEC", mandatoryDocuments: ["PAN", "Cancelled Cheque", "Agreements"] },
  { id: "CHK-006", serviceId: "SRV00006", serviceName: "Professional Tax - PTRC", mandatoryDocuments: ["PAN", "Cancelled Cheque", "Agreements"] }
];

export class DocumentRepository {
  // Static memory cache
  private static docsCache: SmartDocument[] = [];
  private static deletedCache: SmartDocument[] = [];
  private static isInitialized = false;

  private static initCache() {
    if (this.isInitialized) return;
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const rawDocs = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
        if (rawDocs) {
          this.docsCache = JSON.parse(rawDocs);
        }
        const rawDeleted = localStorage.getItem(STORAGE_KEY_DELETED);
        if (rawDeleted) {
          this.deletedCache = JSON.parse(rawDeleted);
        }
      }
    } catch (e) {
      console.warn("[DocumentRepository] Error initializing local cache:", e);
    }
    this.isInitialized = true;
  }

  private static persistCache() {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(this.docsCache));
        localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(this.deletedCache));
      }
    } catch (e) {
      console.warn("[DocumentRepository] Error persisting local cache:", e);
    }
  }

  // --- Static API Methods (Consumed by SmartDmsMaster.tsx and UI components) ---

  static getDocuments(): SmartDocument[] {
    this.initCache();
    // Async background sync with Supabase RDBMS
    this.syncFromSupabase().catch(() => {});
    return this.docsCache.filter(d => !d.isDeleted);
  }

  static getDeletedDocuments(): SmartDocument[] {
    this.initCache();
    return this.deletedCache;
  }

  static getChecklists(): SmartChecklist[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(DEFAULT_CHECKLISTS));
    return DEFAULT_CHECKLISTS;
  }

  static detectDuplicates(fileName: string, fileSize: number): Array<{ id: string; name: string; version: number }> {
    this.initCache();
    const matches: Array<{ id: string; name: string; version: number }> = [];
    const lowerName = (fileName || "").toLowerCase().trim();

    for (const doc of this.docsCache) {
      if (doc.isDeleted) continue;
      const docName = (doc.name || "").toLowerCase().trim();
      const origFile = (doc.versions?.[0]?.fileName || "").toLowerCase().trim();
      if (docName === lowerName || origFile === lowerName) {
        matches.push({ id: doc.id, name: doc.name, version: doc.currentVersion });
      }
    }
    return matches;
  }

  static uploadDocument(
    name: string,
    category: any,
    clientId: string,
    user: User,
    file: { fileName: string; fileSize: number },
    links?: { caseId?: string; workflowId?: string; invoiceId?: string; paymentId?: string },
    expiryDate?: string
  ): SmartDocument {
    this.initCache();

    const docCount = this.docsCache.length + this.deletedCache.length + 1;
    const docId = `DOC-2026-${String(docCount).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const initialVersion: DocumentVersion = {
      versionNumber: 1,
      uploadedAt: now,
      uploadedBy: user?.fullName || user?.username || "Staff User",
      fileName: file.fileName,
      fileSize: file.fileSize,
      notes: "Initial document upload"
    };

    const initialVerification: DocumentVerification = {
      status: "Pending",
      notes: "Awaiting staff review"
    };

    const newDoc: SmartDocument = {
      id: docId,
      name,
      category,
      clientId,
      caseId: links?.caseId,
      workflowId: links?.workflowId,
      invoiceId: links?.invoiceId,
      paymentId: links?.paymentId,
      currentVersion: 1,
      versions: [initialVersion],
      verification: initialVerification,
      expiryDate: expiryDate || undefined,
      tags: [category],
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };

    this.docsCache.unshift(newDoc);
    this.persistCache();

    // Async push to Supabase RDBMS if configured
    if (isSupabaseConfigured()) {
      supabase.from("jn_documents").insert({
        document_number: docId,
        client_id: clientId,
        case_id: links?.caseId || null,
        category,
        document_name: name,
        original_filename: file.fileName,
        file_size_bytes: file.fileSize,
        status: "UPLOADED",
        expiry_date: expiryDate || null,
        version_number: 1,
        created_at: now,
        updated_at: now
      }).then(() => {}).catch(err => console.warn("[DocumentRepository] Supabase insert error:", err));
    }

    return newDoc;
  }

  static deleteDocument(id: string, user: User): void {
    this.initCache();
    const idx = this.docsCache.findIndex(d => d.id === id);
    if (idx !== -1) {
      const doc = { ...this.docsCache[idx], isDeleted: true, updatedAt: new Date().toISOString() };
      this.docsCache.splice(idx, 1);
      this.deletedCache.unshift(doc);
      this.persistCache();

      if (isSupabaseConfigured()) {
        supabase.from("jn_documents").update({ deleted_at: new Date().toISOString() }).eq("document_number", id)
          .then(() => {}).catch(err => console.warn("[DocumentRepository] Supabase delete error:", err));
      }
    }
  }

  static restoreDocument(id: string, user: User): void {
    this.initCache();
    const idx = this.deletedCache.findIndex(d => d.id === id);
    if (idx !== -1) {
      const doc = { ...this.deletedCache[idx], isDeleted: false, updatedAt: new Date().toISOString() };
      this.deletedCache.splice(idx, 1);
      this.docsCache.unshift(doc);
      this.persistCache();

      if (isSupabaseConfigured()) {
        supabase.from("jn_documents").update({ deleted_at: null }).eq("document_number", id)
          .then(() => {}).catch(err => console.warn("[DocumentRepository] Supabase restore error:", err));
      }
    }
  }

  static forceDeleteDocument(id: string, user: User): void {
    this.initCache();
    this.deletedCache = this.deletedCache.filter(d => d.id !== id);
    this.docsCache = this.docsCache.filter(d => d.id !== id);
    this.persistCache();

    if (isSupabaseConfigured()) {
      supabase.from("jn_documents").delete().eq("document_number", id)
        .then(() => {}).catch(err => console.warn("[DocumentRepository] Supabase force delete error:", err));
    }
  }

  static getCompletionMeter(serviceId: string, clientId: string): { percentage: number; uploadedCount: number; totalCount: number } | null {
    const checklists = this.getChecklists();
    const checklist = checklists.find(c => c.serviceId === serviceId || c.serviceName === serviceId);
    if (!checklist) return null;

    const docs = this.getDocuments().filter(d => d.clientId === clientId && !d.isDeleted);
    const uploadedCategories = new Set(docs.map(d => d.category));

    let uploadedCount = 0;
    for (const reqCat of checklist.mandatoryDocuments) {
      if (uploadedCategories.has(reqCat as any)) {
        uploadedCount++;
      }
    }

    const totalCount = checklist.mandatoryDocuments.length;
    const percentage = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

    return { percentage, uploadedCount, totalCount };
  }

  private static async syncFromSupabase() {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("jn_documents")
        .select(`*, client:jn_clients(client_name)`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error || !data) return;

      const mapped: SmartDocument[] = data.map((row: any) => ({
        id: row.document_number || row.id,
        name: row.document_name || "Document",
        category: row.category || "Other",
        clientId: row.client_id || "",
        caseId: row.case_id || undefined,
        currentVersion: row.version_number || 1,
        versions: [
          {
            versionNumber: row.version_number || 1,
            uploadedAt: row.created_at,
            uploadedBy: "System User",
            fileName: row.original_filename || `${row.document_name}.pdf`,
            fileSize: row.file_size_bytes || 1024
          }
        ],
        verification: { status: (row.status === "VERIFIED" ? "Verified" : row.status === "REJECTED" ? "Rejected" : "Pending") },
        expiryDate: row.expiry_date || undefined,
        tags: [row.category || "General"],
        isDeleted: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      this.docsCache = mapped;
      this.persistCache();
    } catch (e) {
      console.warn("[DocumentRepository] Supabase background sync failed:", e);
    }
  }

  // --- Instance Methods (For backwards compatibility with new DocumentRepository().fetchAllDocuments()) ---

  async fetchAllDocuments(options?: { clientId?: string; category?: string }): Promise<EnterpriseDocument[]> {
    if (!isSupabaseConfigured()) {
      return DocumentRepository.getDocuments().map(d => ({
        id: d.id,
        documentNumber: d.id,
        clientId: d.clientId,
        category: d.category,
        documentName: d.name,
        originalFilename: d.versions[0]?.fileName || `${d.name}.pdf`,
        fileSizeBytes: d.versions[0]?.fileSize || 0,
        mimeType: "application/pdf",
        status: d.verification.status === "Verified" ? "VERIFIED" : "UPLOADED",
        versionNumber: d.currentVersion,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
    }

    try {
      let query = supabase
        .from("jn_documents")
        .select(`*, client:jn_clients(client_name)`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (options?.clientId) query = query.eq("client_id", options.clientId);
      if (options?.category && options.category !== "ALL") query = query.eq("category", options.category);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        documentNumber: row.document_number,
        clientId: row.client_id,
        clientName: row.client?.client_name || "",
        caseId: row.case_id,
        category: row.category,
        documentName: row.document_name,
        originalFilename: row.original_filename,
        bucketId: row.bucket_id,
        filePath: row.file_path,
        fileSizeBytes: row.file_size_bytes,
        mimeType: row.mime_type,
        checksumSha256: row.checksum_sha256 || "",
        status: row.status,
        issueDate: row.issue_date || "",
        expiryDate: row.expiry_date || "",
        versionNumber: row.version_number,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (err) {
      console.error("[DocumentRepository] fetchAllDocuments error:", err);
      return [];
    }
  }

  async saveDocument(doc: EnterpriseDocument): Promise<{ success: boolean; data?: EnterpriseDocument; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        document_number: doc.documentNumber,
        client_id: doc.clientId || null,
        case_id: doc.caseId || null,
        category: doc.category,
        document_name: doc.documentName,
        original_filename: doc.originalFilename,
        bucket_id: doc.bucketId || "jn-documents",
        file_path: doc.filePath,
        file_size_bytes: doc.fileSizeBytes || 0,
        mime_type: doc.mimeType || "application/pdf",
        checksum_sha256: doc.checksumSha256 || null,
        status: doc.status || "UPLOADED",
        issue_date: doc.issueDate || null,
        expiry_date: doc.expiryDate || null,
        version_number: doc.versionNumber || 1,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_documents")
        .upsert(payload, { onConflict: "document_number" })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          documentNumber: data.document_number,
          clientId: data.client_id,
          caseId: data.case_id,
          category: data.category,
          documentName: data.document_name,
          originalFilename: data.original_filename,
          bucketId: data.bucket_id,
          filePath: data.file_path,
          fileSizeBytes: data.file_size_bytes,
          mimeType: data.mime_type,
          status: data.status,
          versionNumber: data.version_number,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[DocumentRepository] saveDocument error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const documentRepository = new DocumentRepository();

// Backwards compatibility repository classes and singletons
export class DocumentVersionRepositoryClass {
  static addVersion(docId: string, file: { fileName: string; fileSize: number }, user: User): SmartDocument | null {
    const docs = DocumentRepository.getDocuments();
    const doc = docs.find(d => d.id === docId);
    if (!doc) return null;

    const nextVer = doc.currentVersion + 1;
    const now = new Date().toISOString();
    const versionObj: DocumentVersion = {
      versionNumber: nextVer,
      uploadedAt: now,
      uploadedBy: user?.fullName || user?.username || "Staff User",
      fileName: file.fileName,
      fileSize: file.fileSize,
      notes: `Uploaded version V${nextVer}`
    };

    doc.versions.unshift(versionObj);
    doc.currentVersion = nextVer;
    doc.updatedAt = now;

    return doc;
  }

  addVersion(docId: string, file: { fileName: string; fileSize: number }, user: User): SmartDocument | null {
    return DocumentVersionRepositoryClass.addVersion(docId, file, user);
  }
}
export const DocumentVersionRepository = new DocumentVersionRepositoryClass();

export class DocumentVerificationRepositoryClass {
  static updateVerificationStatus(docId: string, status: "Verified" | "Rejected" | "Pending", user: User, notes?: string): SmartDocument | null {
    const docs = DocumentRepository.getDocuments();
    const doc = docs.find(d => d.id === docId);
    if (!doc) return null;

    doc.verification = {
      status,
      verifiedBy: user?.fullName || user?.username || "Staff User",
      verifiedAt: new Date().toISOString(),
      notes: notes || `Verification status updated to ${status}`
    };
    doc.updatedAt = new Date().toISOString();

    return doc;
  }

  updateVerificationStatus(docId: string, status: "Verified" | "Rejected" | "Pending", user: User, notes?: string): SmartDocument | null {
    return DocumentVerificationRepositoryClass.updateVerificationStatus(docId, status, user, notes);
  }
}
export const DocumentVerificationRepository = new DocumentVerificationRepositoryClass();

export class DocumentReminderRepositoryClass {
  static getReminders(): DocumentReminder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return [];
  }

  getReminders(): DocumentReminder[] {
    return DocumentReminderRepositoryClass.getReminders();
  }
}
export const DocumentReminderRepository = new DocumentReminderRepositoryClass();
