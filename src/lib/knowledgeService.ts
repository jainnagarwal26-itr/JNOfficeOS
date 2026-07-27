/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - V2.1 Phase 1: Firm Knowledge Base Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { KnowledgeArticle } from "../types/ai";

export class KnowledgeService {

  async fetchPublishedArticles(searchQuery?: string): Promise<KnowledgeArticle[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_knowledge_articles")
        .select(`
          *,
          category:jn_knowledge_categories(category_name)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (searchQuery && searchQuery.trim() !== "") {
        query = query.or(`title.ilike.%${searchQuery.trim()}%,content.ilike.%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        categoryId: row.category_id,
        categoryName: row.category?.category_name || "General",
        title: row.title,
        content: row.content,
        tags: row.tags || [],
        isPublished: row.is_published,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error("[KnowledgeService] fetchPublishedArticles error:", err);
      return [];
    }
  }
}

export const knowledgeService = new KnowledgeService();
