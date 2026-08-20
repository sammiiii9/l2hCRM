export type CrmEventType =
  | "lead.created"
  | "lead.updated"
  | "lead.assigned"
  | "lead.stage_changed"
  | "lead.status_changed"
  | "call.completed"
  | "followup.created"
  | "followup.completed"
  | "followup.overdue"
  | "site_visit.scheduled"
  | "site_visit.completed"
  | "site_visit.cancelled"
  | "site_visit.no_show"
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "inventory.available"
  | "inventory.price_changed"
  | "lead.inactivity_check"
  | "lead.merged";

export interface CrmEventPayload {
  eventType: CrmEventType;
  entityId: string;
  entityType: "LEAD" | "FOLLOWUP" | "SITE_VISIT" | "BOOKING" | "INVENTORY" | "CALL";
  actorId?: string; // userId or 'SYSTEM'
  actorName?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
  idempotencyKey?: string;
}

export interface AutomationResult {
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  executedActions: string[];
  error?: string;
}
