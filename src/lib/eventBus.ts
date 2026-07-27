/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Internal Event Bus Publisher
 */

export type EventHandler = (eventName: string, payload: Record<string, any>) => Promise<void> | void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribe handler to event and return unsubscribe cleanup function
   */
  subscribe(eventName: string, handler: EventHandler): () => void {
    const existing = this.listeners.get(eventName) || [];
    this.listeners.set(eventName, [...existing, handler]);

    return () => {
      this.unsubscribe(eventName, handler);
    };
  }

  /**
   * Unsubscribe handler from event
   */
  unsubscribe(eventName: string, handler: EventHandler): void {
    const existing = this.listeners.get(eventName) || [];
    this.listeners.set(
      eventName,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Publish event across system modules
   */
  async publish(
    eventName: string,
    source: string,
    payload: Record<string, any>,
    userEmail?: string,
    userName?: string
  ): Promise<void> {
    await this.publishEvent(eventName, { source, payload, userEmail, userName });
  }

  /**
   * Publish event across system modules
   */
  async publishEvent(eventName: string, payload: Record<string, any>): Promise<void> {
    const wildcardHandlers = this.listeners.get("*") || [];
    const directHandlers = eventName !== "*" ? (this.listeners.get(eventName) || []) : [];
    const handlers = [...wildcardHandlers, ...directHandlers];

    for (const handler of handlers) {
      try {
        await handler(eventName, payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event '${eventName}':`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
