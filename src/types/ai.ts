/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - V2.1 Phase 1: Enterprise AI Foundation Types
 */

export interface AIConversation {
  id?: string;
  userId: string;
  title: string;
  contextType?: "CLIENT" | "CASE" | "INVOICE" | "DOCUMENT" | "GENERAL";
  contextId?: string;
  isPinned?: boolean;
  messages?: AIMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AIMessage {
  id?: string;
  conversationId: string;
  senderRole: "user" | "assistant" | "system";
  messageContent: string;
  tokenCount?: number;
  modelUsed?: string;
  createdAt?: string;
}

export interface KnowledgeArticle {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  content: string;
  tags?: string[];
  isPublished: boolean;
  createdAt?: string;
}

export interface AIAuditLog {
  id?: string;
  userId: string;
  modelCode: string;
  promptText: string;
  responseText?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  createdAt?: string;
}
