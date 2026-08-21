import { prisma } from "../prisma";

export interface ReassignmentOptions {
  leadId: string;
  reason: string;
  enforceExpertiseMatch?: boolean;
  actor?: { id: string; name: string; roleSlug: string };
}

/**
 * Finds the most suitable agent based on availability, lead load, and specialization.
 */
export async function findBestEligibleAgent(lead: {
  preferredLocation?: string | null;
  propertyType?: string | null;
  excludeUserId?: string | null;
}) {
  const eligibleAgents = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      isDeleted: false,
      isAvailable: true,
      role: { slug: { in: ["MEMBER", "TEAM_LEAD", "ADMIN"] } },
      id: lead.excludeUserId ? { not: lead.excludeUserId } : undefined,
    },
    include: {
      assignedLeads: {
        where: {
          isDeleted: false,
          status: { notIn: ["WON", "LOST", "NOT_INTERESTED"] },
        },
      },
    },
  });

  if (eligibleAgents.length === 0) return null;

  // Filter agents who haven't exceeded maximum lead load
  const availableCapacityAgents = eligibleAgents.filter(
    (a) => a.assignedLeads.length < (a.maxActiveLeadLoad || 50)
  );

  const candidates = availableCapacityAgents.length > 0 ? availableCapacityAgents : eligibleAgents;

  // Score candidate agents
  const scored = candidates.map((agent) => {
    let score = 100 - agent.assignedLeads.length; // Base: lower load is better

    // Specialization bonus
    if (
      lead.preferredLocation &&
      agent.specializationLocation &&
      lead.preferredLocation.toLowerCase().includes(agent.specializationLocation.toLowerCase())
    ) {
      score += 30;
    }

    if (
      lead.propertyType &&
      agent.specializationProperty &&
      lead.propertyType === agent.specializationProperty
    ) {
      score += 20;
    }

    return { agent, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agent || null;
}

/**
 * Safely reassigns a lead with audit trail, activity logs, and notifications.
 */
export async function executeSafeLeadReassignment(options: ReassignmentOptions) {
  const { leadId, reason, actor } = options;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignedTo: true,
      followUps: { where: { status: "PENDING" } },
    },
  });

  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const previousAgent = lead.assignedTo;
  const newAgent = await findBestEligibleAgent({
    preferredLocation: lead.preferredLocation,
    propertyType: lead.propertyType,
    excludeUserId: previousAgent?.id,
  });

  if (!newAgent) {
    return {
      success: false,
      reason: "No eligible agent available with open capacity",
    };
  }

  // Execute Reassignment
  await prisma.$transaction(async (tx) => {
    // 1. Update lead assignee
    await tx.lead.update({
      where: { id: lead.id },
      data: { assignedToId: newAgent.id },
    });

    // 2. Reassign all pending follow-ups
    await tx.followUp.updateMany({
      where: { leadId: lead.id, status: "PENDING" },
      data: { assignedToId: newAgent.id },
    });

    // 3. Log Lead Activity
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: actor?.id || null,
        type: "ASSIGNMENT_CHANGED",
        title: `🤖 Lead Reassigned: ${previousAgent?.name || "Unassigned"} → ${newAgent.name}`,
        description: reason,
        isAutomated: !actor,
      },
    });

    // 4. Log in AuditLog
    await tx.auditLog.create({
      data: {
        userId: actor?.id || null,
        userName: actor?.name || "SYSTEM / AUTOMATION",
        userRole: actor?.roleSlug || "SYSTEM",
        action: "REASSIGN",
        entity: "LEAD",
        entityId: lead.id,
        entityCode: lead.leadCode,
        fieldChanged: "ASSIGNED_USER",
        oldValue: previousAgent?.name || "None",
        newValue: newAgent.name,
        isAutomated: !actor,
        metadata: JSON.stringify({
          previousAgentId: previousAgent?.id,
          newAgentId: newAgent.id,
          reason,
        }),
      },
    });

    // 5. Notify Previous Agent (if existed)
    if (previousAgent) {
      await tx.notification.create({
        data: {
          userId: previousAgent.id,
          title: `ℹ️ Lead Reassigned: ${lead.name}`,
          message: `Lead ${lead.leadCode} was reassigned to ${newAgent.name}. Reason: ${reason}`,
          type: "LEAD_ASSIGNED",
          linkUrl: `/leads/${lead.id}`,
        },
      });
    }

    // 6. Notify New Agent
    await tx.notification.create({
      data: {
        userId: newAgent.id,
        title: `🎯 New Lead Assigned: ${lead.name}`,
        message: `You have been assigned ${lead.name} (${lead.budget || "₹50L+"}) in ${lead.preferredLocation || "Noida"}.`,
        type: "LEAD_ASSIGNED",
        linkUrl: `/leads/${lead.id}`,
      },
    });
  }, { maxWait: 20000, timeout: 45000 });

  return {
    success: true,
    previousAgentName: previousAgent?.name || "Unassigned",
    newAgentName: newAgent.name,
    newAgentId: newAgent.id,
  };
}

export const findBestAgentForLead = findBestEligibleAgent;

export async function reassignLead(params: {
  leadId: string;
  newAssigneeId?: string;
  reassignedByUserId?: string;
  reason?: string;
}) {
  const { leadId, newAssigneeId, reassignedByUserId, reason = "Lead reassignment" } = params;

  if (newAssigneeId) {
    const newAgent = await prisma.user.findUnique({ where: { id: newAssigneeId } });
    if (!newAgent) throw new Error("Target agent not found");

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: newAssigneeId },
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: reassignedByUserId,
        type: "ASSIGNMENT_CHANGED",
        title: `Lead reassigned to ${newAgent.name}`,
        description: reason,
        isAutomated: !reassignedByUserId,
      },
    });

    return updated;
  }

  const result = await executeSafeLeadReassignment({
    leadId,
    reason,
  });

  return await prisma.lead.findUnique({ where: { id: leadId } });
}
