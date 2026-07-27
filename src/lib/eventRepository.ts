/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppEvent } from "../types";

const STORAGE_KEY = "jn_officeos_events";

export class EventRepository {
  private static eventsCache: AppEvent[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.eventsCache = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored events", e);
        this.eventsCache = [];
      }
    } else {
      this.eventsCache = [];
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.eventsCache));
    import("./googleSheetsService").then(({ googleSheetsService }) => {
      if (googleSheetsService.isActiveSyncEnabled()) {
        const mapped = this.eventsCache.map((e) => ({
          "Event_ID": e.id,
          "Event_Type": e.type,
          "Module": e.source || "System",
          "Reference_ID": (e.payload && (e.payload.id || e.payload.caseId || e.payload.invoiceId)) ? (e.payload.id || e.payload.caseId || e.payload.invoiceId) : "",
          "Description": JSON.stringify(e.payload || {}),
          "Triggered_By": e.userEmail || "System",
          "Triggered_On": e.timestamp,
          "Is_Demo": false
        }));
        googleSheetsService.bulkSync("jn_events", "Event_ID", mapped);
      }
    });
  }

  public static setEventsFromSheets(pulled: AppEvent[]) {
    this.eventsCache = pulled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pulled));
    this.isInitialized = true;
  }

  public static getEvents(): AppEvent[] {
    this.init();
    return [...this.eventsCache].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  }

  public static saveEvent(
    type: string,
    source: string,
    payload: any,
    userEmail?: string,
    userName?: string
  ): AppEvent {
    this.init();
    const newEvent: AppEvent = {
      id: `EVT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      type,
      source,
      payload,
      userEmail,
      userName
    };

    this.eventsCache.unshift(newEvent);
    this.persist();

    // Push new event immediately to jn_events sheet
    import("./googleSheetsService").then(({ googleSheetsService }) => {
      if (googleSheetsService.isActiveSyncEnabled()) {
        googleSheetsService.pushRecord("jn_events", "Event_ID", newEvent.id, {
          "Event_ID": newEvent.id,
          "Event_Type": newEvent.type,
          "Module": newEvent.source || "System",
          "Reference_ID": (payload && (payload.id || payload.caseId || payload.invoiceId)) ? (payload.id || payload.caseId || payload.invoiceId) : "",
          "Description": JSON.stringify(payload || {}),
          "Triggered_By": userEmail || "System",
          "Triggered_On": newEvent.timestamp,
          "Is_Demo": false
        });
      }
    });

    return newEvent;
  }

  // Google Sheets integration meta-schema
  public static getSheetsSchema() {
    return {
      sheetName: "System_Events_Log",
      columns: [
        { name: "id", type: "string" },
        { name: "timestamp", type: "string" },
        { name: "type", type: "string" },
        { name: "source", type: "string" },
        { name: "userEmail", type: "string" },
        { name: "userName", type: "string" },
        { name: "payload", type: "json" }
      ]
    };
  }
}
