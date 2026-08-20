import { prisma } from "./prisma";
import { SessionUser } from "./auth";

export interface LogAuditParams {
  user?: SessionUser | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "LOGIN" | "LOGOUT" | "REASSIGN" | "BULK_ASSIGN" | "LEAD_MERGE" | "DAR_SUBMIT" | "DAR_UPDATE" | "STAGE_CHANGE" | "STATUS_LOCK";
  entity: "LEAD" | "USER" | "PROJECT" | "INVENTORY" | "BOOKING" | "CALL" | "FOLLOWUP" | "SETTING" | "DAR";
  entityId?: string;
  entityCode?: string;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function createAuditLog(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.user?.id || null,
        userName: params.user?.name || "System",
        userRole: params.user?.roleSlug || "SYSTEM",
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        entityCode: params.entityCode || null,
        fieldChanged: params.fieldChanged || null,
        oldValue: params.oldValue ? (typeof params.oldValue === "string" ? params.oldValue : JSON.stringify(params.oldValue)) : null,
        newValue: params.newValue ? (typeof params.newValue === "string" ? params.newValue : JSON.stringify(params.newValue)) : null,
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
