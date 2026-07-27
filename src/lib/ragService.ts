/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - V2.1 Phase 1: Retrieval-Augmented Generation (RAG) Service Engine
 */

import { knowledgeService } from "./knowledgeService";

export class RAGService {

  /**
   * Retrieve relevant context snippets from Firm Knowledge Base for prompt augmentation
   */
  async retrieveContext(query: string): Promise<string> {
    const articles = await knowledgeService.fetchPublishedArticles(query);
    if (!articles || articles.length === 0) return "";

    return articles.slice(0, 3).map(a => `[Knowledge Source: ${a.title}]\n${a.content}`).join("\n\n");
  }
}

export const ragService = new RAGService();
