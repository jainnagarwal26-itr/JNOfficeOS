/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: High-Level Document Management Service Engine
 */

import { EnterpriseDocument } from "../types/document";
import { storageService } from "./storageService";
import { documentRepository } from "./documentRepository";
import { databaseFoundationService } from "./databaseFoundationService";

export class DocumentService {

  /**
   * Upload File to Storage Vault and Persist Metadata Record with Sequence Number (DOC000001)
   */
  async uploadAndRegisterDocument(
    file: File | Blob,
    docData: Partial<EnterpriseDocument>
  ): Promise<{ success: boolean; data?: EnterpriseDocument; error?: string }> {
    if (!docData.category || !docData.documentName) {
      return { success: false, error: "Category and Document Name are required." };
    }

    const documentNumber = docData.documentNumber || await databaseFoundationService.getNextBusinessNumber("DOCUMENT");
    const bucketId = docData.bucketId || "jn-documents";
    const filename = (file as File).name || docData.originalFilename || "uploaded_document.pdf";
    const folderPath = docData.clientId ? `clients/${docData.clientId}/${docData.category}/${filename}` : `general/${docData.category}/${filename}`;

    // 1. Upload to Storage
    const storageRes = await storageService.uploadFile(bucketId, folderPath, file);
    if (!storageRes.success) {
      return { success: false, error: storageRes.error || "Storage upload failed" };
    }

    // 2. Register Metadata in PostgreSQL
    const newDoc: EnterpriseDocument = {
      documentNumber,
      clientId: docData.clientId || undefined,
      caseId: docData.caseId || undefined,
      category: docData.category,
      documentName: docData.documentName,
      originalFilename: filename,
      bucketId,
      filePath: storageRes.filePath || folderPath,
      fileSizeBytes: (file as File).size || 0,
      mimeType: (file as File).type || "application/pdf",
      status: docData.status || "UPLOADED",
      issueDate: docData.issueDate || undefined,
      expiryDate: docData.expiryDate || undefined,
      versionNumber: 1
    };

    return await documentRepository.saveDocument(newDoc);
  }
}

export const documentService = new DocumentService();
