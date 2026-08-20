import { prisma } from "../prisma";

export interface CreateAdminAlertInput {
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: "UNASSIGNED_LEAD" | "HOT_INACTIVE" | "OVERDUE_ESCALATION" | "HIGH_VALUE_LEAD" | "BOOKING_CANCELLED" | "INVENTORY_CHANGE";
  title: string;
  description: string;
  entity: "LEAD" | "BOOKING" | "INVENTORY" | "FOLLOWUP";
  entityId?: string;
  entityCode?: string;
  recommendedAction?: string;
  linkUrl?: string;
  assignedToId?: string;
}

/**
 * Creates an admin alert if a duplicate open alert doesn't already exist.
 */
export async function createAdminAlert(input: CreateAdminAlertInput) {
  // Deduplicate open alerts for the same entity and category
  if (input.entityId) {
    const existing = await prisma.adminAlert.findFirst({
      where: {
        entityId: input.entityId,
        category: input.category,
        status: "OPEN",
      },
    });
    if (existing) {
      return { created: false, alert: existing, reason: "Duplicate open alert exists" };
    }
  }

  const alert = await prisma.adminAlert.create({
    data: {
      severity: input.severity,
      category: input.category,
      title: input.title,
      description: input.description,
      entity: input.entity,
      entityId: input.entityId,
      entityCode: input.entityCode,
      recommendedAction: input.recommendedAction,
      linkUrl: input.linkUrl,
      assignedToId: input.assignedToId,
      status: "OPEN",
    },
  });

  return { created: true, alert };
}

/**
 * Resolves an open admin alert.
 */
export async function resolveAdminAlert(alertId: string, resolvedById: string, note?: string) {
  const alert = await prisma.adminAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedById,
      resolvedAt: new Date(),
    },
  });

  // Log in audit log
  await prisma.auditLog.create({
    data: {
      userId: resolvedById,
      action: "UPDATE",
      entity: "ALERT",
      entityId: alertId,
      fieldChanged: "STATUS",
      oldValue: "OPEN",
      newValue: "RESOLVED",
      metadata: JSON.stringify({ note, alertTitle: alert.title }),
    },
  });

  return alert;
}

/**
 * Dismisses an admin alert.
 */
export async function dismissAdminAlert(alertId: string, resolvedById: string) {
  const alert = await prisma.adminAlert.update({
    where: { id: alertId },
    data: {
      status: "DISMISSED",
      resolvedById,
      resolvedAt: new Date(),
    },
  });
  return alert;
}

/**
 * Scans for unassigned leads (> 30 mins) and high-value leads.
 */
export async function scanForAdminAlerts() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
  
  // 1. Unassigned leads
  const unassignedLeads = await prisma.lead.findMany({
    where: {
      assignedToId: null,
      isDeleted: false,
      createdAt: { lt: thirtyMinsAgo },
    },
  });

  for (const lead of unassignedLeads) {
    await createAdminAlert({
      severity: "WARNING",
      category: "UNASSIGNED_LEAD",
      title: `🟠 Lead In Queue: ${lead.name} (${lead.budget || "₹50L+"})`,
      description: `Lead ${lead.leadCode} from ${lead.source} has been unassigned for > 30 minutes.`,
      entity: "LEAD",
      entityId: lead.id,
      entityCode: lead.leadCode,
      recommendedAction: "Assign to available sales associate or team lead",
      linkUrl: `/leads/${lead.id}`,
    });
  }

  // 2. High Value Leads (> ₹1.5 Cr)
  const highValueLeads = await prisma.lead.findMany({
    where: {
      isDeleted: false,
      budgetMax: { gte: 15000000 },
    },
    include: { assignedTo: true },
  });

  for (const lead of highValueLeads) {
    await createAdminAlert({
      severity: "INFO",
      category: "HIGH_VALUE_LEAD",
      title: `💎 High-Value Lead: ${lead.name} (${lead.budget})`,
      description: `High-value prospective buyer in ${lead.preferredLocation || "Noida"}. Assigned to ${lead.assignedTo?.name || "Unassigned"}.`,
      entity: "LEAD",
      entityId: lead.id,
      entityCode: lead.leadCode,
      recommendedAction: "Review pitch strategy and ensure priority site visit availability",
      linkUrl: `/leads/${lead.id}`,
    });
  }
}
