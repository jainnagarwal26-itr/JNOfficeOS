/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./supabase";
import { 
  ClientPortalUser, 
  ClientSession, 
  ClientRequest, 
  ClientAppointment, 
  ClientPortalMessage, 
  ClientActivityLog 
} from "../types/clientPortal";

const STORAGE_KEYS = {
  PORTAL_USERS: "jn_officeos_portal_users",
  PORTAL_SESSIONS: "jn_officeos_portal_sessions",
  PORTAL_REQUESTS: "jn_officeos_portal_requests",
  PORTAL_APPOINTMENTS: "jn_officeos_portal_appointments",
  PORTAL_MESSAGES: "jn_officeos_portal_messages"
};

export class ClientPortalRepository {
  private static usersCache: ClientPortalUser[] = [];
  private static requestsCache: ClientRequest[] = [];
  private static appointmentsCache: ClientAppointment[] = [];
  private static messagesCache: ClientPortalMessage[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      this.usersCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTAL_USERS) || "[]");
      this.requestsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTAL_REQUESTS) || "[]");
      this.appointmentsCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTAL_APPOINTMENTS) || "[]");
      this.messagesCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTAL_MESSAGES) || "[]");
    } catch (e) {
      console.error("Failed to initialize local portal repository cache", e);
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEYS.PORTAL_USERS, JSON.stringify(this.usersCache));
    localStorage.setItem(STORAGE_KEYS.PORTAL_REQUESTS, JSON.stringify(this.requestsCache));
    localStorage.setItem(STORAGE_KEYS.PORTAL_APPOINTMENTS, JSON.stringify(this.appointmentsCache));
    localStorage.setItem(STORAGE_KEYS.PORTAL_MESSAGES, JSON.stringify(this.messagesCache));
  }

  public static async getRequestsByClientId(clientId: string): Promise<ClientRequest[]> {
    this.init();
    return this.requestsCache.filter(r => r.clientId === clientId);
  }

  public static async createRequest(request: ClientRequest): Promise<ClientRequest> {
    this.init();
    this.requestsCache.unshift(request);
    this.persist();

    if (supabase) {
      try {
        await supabase.from("jn_client_requests").insert([{
          request_id: request.requestId,
          client_id: request.clientId,
          request_type: request.requestType,
          subject: request.subject,
          description: request.description,
          priority: request.priority,
          status: request.status,
          created_at: request.createdAt,
          updated_at: request.updatedAt
        }]);
      } catch (e) {
        console.error("Supabase insert client request failed", e);
      }
    }
    return request;
  }

  public static async getAppointmentsByClientId(clientId: string): Promise<ClientAppointment[]> {
    this.init();
    return this.appointmentsCache.filter(a => a.clientId === clientId);
  }

  public static async createAppointment(appointment: ClientAppointment): Promise<ClientAppointment> {
    this.init();
    this.appointmentsCache.unshift(appointment);
    this.persist();

    if (supabase) {
      try {
        await supabase.from("jn_client_appointments").insert([{
          appointment_id: appointment.appointmentId,
          client_id: appointment.clientId,
          subject: appointment.subject,
          scheduled_at: appointment.scheduledAt,
          duration_mins: appointment.durationMins,
          status: appointment.status,
          meeting_link: appointment.meetingLink,
          notes: appointment.notes,
          created_at: appointment.createdAt
        }]);
      } catch (e) {
        console.error("Supabase insert client appointment failed", e);
      }
    }
    return appointment;
  }

  public static async getMessagesByClientId(clientId: string): Promise<ClientPortalMessage[]> {
    this.init();
    return this.messagesCache.filter(m => m.clientId === clientId);
  }

  public static async sendMessage(message: ClientPortalMessage): Promise<ClientPortalMessage> {
    this.init();
    this.messagesCache.push(message);
    this.persist();

    if (supabase) {
      try {
        await supabase.from("jn_client_messages").insert([{
          message_id: message.messageId,
          client_id: message.clientId,
          sender_type: message.senderType,
          sender_name: message.senderName,
          message_text: message.messageText,
          is_read: message.isRead,
          created_at: message.createdAt
        }]);
      } catch (e) {
        console.error("Supabase insert client message failed", e);
      }
    }
    return message;
  }
}
