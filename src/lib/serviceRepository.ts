/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Service Management Repository
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export interface ServiceCategory {
  id: string;
  categoryName: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceMasterItem {
  id: string;
  serviceNumber: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  standardFee: number;
  sacCode: string;
  gstRate: number;
  description: string;
  isActive: boolean;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientServiceAssignment {
  id: string;
  clientId: string;
  serviceId: string;
  serviceNumber?: string;
  serviceName?: string;
  categoryName?: string;
  status: "ACTIVE" | "INACTIVE";
  frequency: string;
  assignedFee: number;
  assignedTo?: string;
  assignedToName?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class ServiceRepository {
  /**
   * Fetch all service categories
   */
  async getCategories(): Promise<ServiceCategory[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_service_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        categoryName: row.category_name,
        description: row.description || "",
        displayOrder: row.display_order || 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error("[ServiceRepository] getCategories error:", err);
      return [];
    }
  }

  /**
   * Fetch all master services (both active and inactive)
   */
  async getServices(options?: { categoryId?: string; activeOnly?: boolean }): Promise<ServiceMasterItem[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_services")
        .select("*")
        .order("service_number", { ascending: true });

      if (options?.activeOnly) {
        query = query.eq("is_active", true);
      }

      if (options?.categoryId) {
        query = query.eq("category_id", options.categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        serviceNumber: row.service_number,
        serviceName: row.service_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        standardFee: Number(row.standard_fee || 0),
        sacCode: row.sac_code || "998311",
        gstRate: Number(row.gst_rate || 18),
        description: row.description || "",
        isActive: row.is_active,
        versionNumber: row.version_number || 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error("[ServiceRepository] getServices error:", err);
      return [];
    }
  }

  /**
   * Fetch a single service by ID
   */
  async getServiceById(serviceId: string): Promise<ServiceMasterItem | null> {
    if (!isSupabaseConfigured() || !serviceId) return null;

    try {
      const { data, error } = await supabase
        .from("jn_services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        serviceNumber: data.service_number,
        serviceName: data.service_name,
        categoryId: data.category_id,
        categoryName: data.category_name,
        standardFee: Number(data.standard_fee || 0),
        sacCode: data.sac_code || "998311",
        gstRate: Number(data.gst_rate || 18),
        description: data.description || "",
        isActive: data.is_active,
        versionNumber: data.version_number || 1,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error("[ServiceRepository] getServiceById error:", err);
      return null;
    }
  }

  /**
   * Create a new service in global Service Master
   * Uses PostgreSQL RPC generate_next_service_number() for service number generation
   */
  async createService(serviceData: {
    serviceName: string;
    categoryId: string;
    categoryName: string;
    standardFee: number;
    sacCode?: string;
    gstRate?: number;
    description?: string;
    actorEmail?: string;
    actorName?: string;
  }): Promise<{ success: boolean; data?: ServiceMasterItem; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      // Obtain atomic service number from PostgreSQL sequence
      const { data: srvNumber, error: numErr } = await supabase.rpc("generate_next_service_number");
      const serviceNumber = srvNumber || `SRV${Date.now().toString().slice(-5)}`;

      const payload = {
        service_number: serviceNumber,
        service_name: serviceData.serviceName,
        category_id: serviceData.categoryId,
        category_name: serviceData.categoryName,
        standard_fee: serviceData.standardFee,
        sac_code: serviceData.sacCode || "998311",
        gst_rate: serviceData.gstRate ?? 18,
        description: serviceData.description || "",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_services")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      // Audit Log
      await supabase.from("jn_audit_logs").insert([{
        user_email: serviceData.actorEmail || "system",
        user_name: serviceData.actorName || "Super Admin",
        role: "OWNER",
        action: "SERVICE_CREATED",
        category: "SERVICE_MASTER",
        details: `Created new service '${serviceData.serviceName}' (${data.service_number}) under '${serviceData.categoryName}'.`,
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString()
      }]);

      return {
        success: true,
        data: {
          id: data.id,
          serviceNumber: data.service_number,
          serviceName: data.service_name,
          categoryId: data.category_id,
          categoryName: data.category_name,
          standardFee: Number(data.standard_fee),
          sacCode: data.sac_code,
          gstRate: Number(data.gst_rate),
          description: data.description,
          isActive: data.is_active,
          versionNumber: data.version_number,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (err: any) {
      console.error("[ServiceRepository] createService error:", err);
      return { success: false, error: err.message || "Failed to create service" };
    }
  }

  /**
   * Update an existing master service
   */
  async updateService(serviceId: string, updates: Partial<{
    serviceName: string;
    standardFee: number;
    sacCode: string;
    gstRate: number;
    description: string;
    isActive: boolean;
    actorEmail: string;
    actorName: string;
  }>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !serviceId) return { success: false, error: "Invalid request" };

    try {
      const payload: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.serviceName !== undefined) payload.service_name = updates.serviceName;
      if (updates.standardFee !== undefined) payload.standard_fee = updates.standardFee;
      if (updates.sacCode !== undefined) payload.sac_code = updates.sacCode;
      if (updates.gstRate !== undefined) payload.gst_rate = updates.gstRate;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { error } = await supabase
        .from("jn_services")
        .update(payload)
        .eq("id", serviceId);

      if (error) throw error;

      // Audit Log
      await supabase.from("jn_audit_logs").insert([{
        user_email: updates.actorEmail || "system",
        user_name: updates.actorName || "Super Admin",
        role: "OWNER",
        action: "SERVICE_UPDATED",
        category: "SERVICE_MASTER",
        details: `Updated service ID ${serviceId}.`,
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString()
      }]);

      return { success: true };
    } catch (err: any) {
      console.error("[ServiceRepository] updateService error:", err);
      return { success: false, error: err.message || "Failed to update service" };
    }
  }

  /**
   * Deactivate a master service (Soft Delete)
   */
  async deactivateService(serviceId: string, actorEmail?: string, actorName?: string): Promise<{ success: boolean; error?: string }> {
    return this.updateService(serviceId, { isActive: false, actorEmail, actorName });
  }

  /**
   * Reactivate a master service
   */
  async reactivateService(serviceId: string, actorEmail?: string, actorName?: string): Promise<{ success: boolean; error?: string }> {
    return this.updateService(serviceId, { isActive: true, actorEmail, actorName });
  }

  // =========================================================================
  // CLIENT SERVICE ASSIGNMENT METHODS (jn_client_services)
  // =========================================================================

  /**
   * Fetch all active & assigned services for a specific client (by canonical client_id UUID)
   */
  async getClientServices(clientId: string): Promise<ClientServiceAssignment[]> {
    if (!isSupabaseConfigured() || !clientId) return [];

    try {
      const { data, error } = await supabase
        .from("jn_client_services")
        .select(`
          *,
          service:jn_services(service_number, service_name, category_name),
          assigned_user:jn_users(full_name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        serviceId: row.service_id,
        serviceNumber: row.service?.service_number || "",
        serviceName: row.service?.service_name || "",
        categoryName: row.service?.category_name || "",
        status: row.status as "ACTIVE" | "INACTIVE",
        frequency: row.frequency || "Monthly",
        assignedFee: Number(row.assigned_fee || 0),
        assignedTo: row.assigned_to || "",
        assignedToName: row.assigned_user?.full_name || "",
        startDate: row.start_date || "",
        endDate: row.end_date || "",
        notes: row.notes || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error("[ServiceRepository] getClientServices error:", err);
      return [];
    }
  }

  /**
   * Assign a service to a client
   * Uses canonical client_id UUID and service_id UUID
   */
  async assignServiceToClient(assignment: {
    clientId: string; // Canonical jn_clients.id UUID
    serviceId: string; // Canonical jn_services.id UUID
    frequency?: string;
    assignedFee?: number;
    assignedTo?: string;
    startDate?: string;
    notes?: string;
    actorEmail?: string;
    actorName?: string;
  }): Promise<{ success: boolean; data?: ClientServiceAssignment; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    if (!assignment.clientId || !assignment.serviceId) return { success: false, error: "Missing required client or service identifier" };

    try {
      const payload = {
        client_id: assignment.clientId,
        service_id: assignment.serviceId,
        status: "ACTIVE",
        frequency: assignment.frequency || "Monthly",
        assigned_fee: assignment.assignedFee || 0,
        assigned_to: assignment.assignedTo || null,
        start_date: assignment.startDate || new Date().toISOString().split("T")[0],
        notes: assignment.notes || "",
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_client_services")
        .upsert(payload, { onConflict: "client_id,service_id" })
        .select(`
          *,
          service:jn_services(service_number, service_name, category_name),
          assigned_user:jn_users(full_name)
        `)
        .single();

      if (error) throw error;

      // Audit Log
      await supabase.from("jn_audit_logs").insert([{
        user_email: assignment.actorEmail || "system",
        user_name: assignment.actorName || "Staff User",
        role: "STAFF",
        action: "CLIENT_SERVICE_ASSIGNED",
        category: "CLIENT_SERVICES",
        details: `Assigned service '${data.service?.service_name || data.service_id}' to client UUID ${assignment.clientId}.`,
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString()
      }]);

      return {
        success: true,
        data: {
          id: data.id,
          clientId: data.client_id,
          serviceId: data.service_id,
          serviceNumber: data.service?.service_number || "",
          serviceName: data.service?.service_name || "",
          categoryName: data.service?.category_name || "",
          status: data.status,
          frequency: data.frequency,
          assignedFee: Number(data.assigned_fee),
          assignedTo: data.assigned_to || "",
          assignedToName: data.assigned_user?.full_name || "",
          startDate: data.start_date,
          endDate: data.end_date || "",
          notes: data.notes || "",
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (err: any) {
      console.error("[ServiceRepository] assignServiceToClient error:", err);
      return { success: false, error: err.message || "Failed to assign service to client" };
    }
  }

  /**
   * Deactivate a client service assignment (Soft Status Change)
   * Does NOT delete historical cases, invoices, or compliance records
   */
  async deactivateClientService(assignmentId: string, actorEmail?: string, actorName?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !assignmentId) return { success: false, error: "Invalid request" };

    try {
      const { error } = await supabase
        .from("jn_client_services")
        .update({
          status: "INACTIVE",
          end_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString()
        })
        .eq("id", assignmentId);

      if (error) throw error;

      // Audit Log
      await supabase.from("jn_audit_logs").insert([{
        user_email: actorEmail || "system",
        user_name: actorName || "Staff User",
        role: "STAFF",
        action: "CLIENT_SERVICE_DEACTIVATED",
        category: "CLIENT_SERVICES",
        details: `Deactivated client service assignment ID ${assignmentId}.`,
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString()
      }]);

      return { success: true };
    } catch (err: any) {
      console.error("[ServiceRepository] deactivateClientService error:", err);
      return { success: false, error: err.message || "Failed to deactivate client service" };
    }
  }
}

export const serviceRepository = new ServiceRepository();
