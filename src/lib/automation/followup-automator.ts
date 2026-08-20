import { prisma } from "../prisma";

export interface AutoFollowUpOptions {
  leadId: string;
  assignedToId?: string;
  triggerEvent?: string;
  scheduledAt?: Date;
  delayHours?: number;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  outcomeRemarks?: string;
}

/**
 * Creates an automatic follow-up while strictly preventing duplicates.
 */
export async function createAutoFollowUp(options: AutoFollowUpOptions) {
  const {
    leadId,
    triggerEvent = "lead.qualified",
    priority = "HIGH",
    outcomeRemarks,
  } = options;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignedTo: true,
      followUps: {
        where: { status: "PENDING" },
      },
    },
  });

  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const assignedToId = options.assignedToId || lead.assignedToId;
  if (!assignedToId) {
    return {
      success: false,
      skipped: true,
      reason: "No assigned agent for lead; follow-up postponed until assignment",
    };
  }

  // Calculate Scheduled Date/Time
  let scheduledAt = options.scheduledAt;
  if (!scheduledAt) {
    if (triggerEvent === "site_visit.completed") {
      // Next day at 11:00 AM
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(11, 0, 0, 0);
      scheduledAt = nextDay;
    } else if (options.delayHours) {
      scheduledAt = new Date(Date.now() + options.delayHours * 3600000);
    } else {
      // Default 24 hours from now
      scheduledAt = new Date(Date.now() + 24 * 3600000);
    }
  }

  // DUPLICATE PREVENTION:
  // Check if an active PENDING follow-up already exists within 12 hours of the target scheduled time
  const existingPending = lead.followUps.find((f) => {
    const timeDiffMs = Math.abs(f.scheduledAt.getTime() - scheduledAt!.getTime());
    return timeDiffMs < 12 * 3600000; // within 12h
  });

  if (existingPending) {
    return {
      success: true,
      skipped: true,
      reason: `Active pending follow-up (${existingPending.id}) already scheduled for ${existingPending.scheduledAt.toISOString()}`,
      followUpId: existingPending.id,
    };
  }

  // Create FollowUp in Database
  const followUp = await prisma.followUp.create({
    data: {
      leadId: lead.id,
      assignedToId,
      scheduledAt,
      priority,
      status: "PENDING",
      isAutomated: true,
      outcomeRemarks:
        outcomeRemarks ||
        `🤖 Automated follow-up scheduled after ${triggerEvent.replace("_", " ")}`,
    },
  });

  // Update lead nextFollowUpDate
  await prisma.lead.update({
    where: { id: lead.id },
    data: { nextFollowUpDate: scheduledAt },
  });

  // Log automated lead activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: assignedToId,
      type: "FOLLOWUP_SCHEDULED",
      title: `🤖 Automatic follow-up scheduled`,
      description: `Follow-up set for ${scheduledAt.toLocaleString("en-IN")} (${priority} priority) triggered by ${triggerEvent}.`,
      isAutomated: true,
    },
  });

  // Dispatch In-App Notification to assigned agent
  await prisma.notification.create({
    data: {
      userId: assignedToId,
      title: `⏰ Auto Follow-up: ${lead.name}`,
      message: `Follow-up scheduled for ${scheduledAt.toLocaleDateString("en-IN")} at ${scheduledAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (${priority} Priority).`,
      type: "FOLLOWUP_REMINDER",
      linkUrl: `/leads/${lead.id}`,
    },
  });

  return {
    success: true,
    skipped: false,
    followUpId: followUp.id,
    scheduledAt,
  };
}

export const autoCreateFollowUp = createAutoFollowUp;
