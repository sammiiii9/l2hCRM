import { prisma } from "../prisma";

export interface OverdueScanResult {
  scannedCount: number;
  level1Count: number;
  level2Count: number;
  level3CriticalCount: number;
  escalatedFollowUps: string[];
}

/**
 * Idempotent scanner that evaluates all pending follow-ups against multi-level escalation rules.
 */
export async function scanAndEscalateOverdueFollowUps(): Promise<OverdueScanResult> {
  const now = new Date();
  const overdueFollowUps = await prisma.followUp.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lt: now },
    },
    include: {
      lead: {
        include: {
          assignedTo: true,
          activities: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      assignedTo: {
        include: { role: true },
      },
    },
  });

  let level1Count = 0;
  let level2Count = 0;
  let level3CriticalCount = 0;
  const escalatedFollowUps: string[] = [];

  // Find system admins / team leads to receive escalations
  const managers = await prisma.user.findMany({
    where: {
      role: { slug: { in: ["ADMIN", "TEAM_LEAD"] } },
      status: "ACTIVE",
      isDeleted: false,
    },
    select: { id: true, name: true, email: true },
  });

  for (const f of overdueFollowUps) {
    const overdueHours = (now.getTime() - f.scheduledAt.getTime()) / 3600000;
    const lead = f.lead;
    if (!lead || lead.isDeleted) continue;

    // Check last activity time on lead
    const lastActivity = lead.activities[0]?.createdAt || lead.updatedAt;
    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 3600000;

    // 1. Check Level 3: Hot Lead Leakage Risk
    const isHotLead = lead.leadScore >= 70 || lead.priority === "HOT";
    if (isHotLead && overdueHours >= 24 && hoursSinceLastActivity >= 48) {
      if (f.escalationLevel < 3) {
        // Upgrade to Level 3
        await prisma.followUp.update({
          where: { id: f.id },
          data: {
            escalationLevel: 3,
            lastEscalatedAt: now,
          },
        });

        // Create Escalation Log
        await prisma.escalationLog.create({
          data: {
            leadId: lead.id,
            followUpId: f.id,
            level: "LEVEL_3",
            reason: `Hot Lead (Score ${lead.leadScore}) has no activity for ${Math.round(hoursSinceLastActivity)}h and follow-up is overdue by ${Math.round(overdueHours)}h`,
            previousAssigneeId: f.assignedToId,
            status: "ESCALATED",
          },
        });

        // Create Critical Admin Alert (Check if open alert already exists)
        const existingAlert = await prisma.adminAlert.findFirst({
          where: {
            entityId: lead.id,
            category: "HOT_INACTIVE",
            status: "OPEN",
          },
        });

        if (!existingAlert) {
          await prisma.adminAlert.create({
            data: {
              severity: "CRITICAL",
              category: "HOT_INACTIVE",
              title: `🔴 Lead Leakage Risk: ${lead.name} (${lead.budget || "₹1.5+ Cr"})`,
              description: `Hot Lead (Score ${lead.leadScore}) has had no activity for ${Math.round(hoursSinceLastActivity)} hours. Follow-up is ${Math.round(overdueHours / 24)} day(s) overdue. Assigned to ${f.assignedTo.name}.`,
              entity: "LEAD",
              entityId: lead.id,
              entityCode: lead.leadCode,
              recommendedAction: "Call lead immediately or reassign to available associate",
              linkUrl: `/leads/${lead.id}`,
              status: "OPEN",
            },
          });
        }

        // Notify managers
        for (const manager of managers) {
          await prisma.notification.create({
            data: {
              userId: manager.id,
              title: `🚨 Critical Lead Leakage: ${lead.name}`,
              message: `Hot Lead ${lead.name} (Score ${lead.leadScore}) is overdue with 0 activity for ${Math.round(hoursSinceLastActivity)}h.`,
              type: "ESCALATION_ALERT",
              linkUrl: `/leads/${lead.id}`,
            },
          });
        }

        level3CriticalCount++;
        escalatedFollowUps.push(f.id);
        continue;
      }
    }

    // 2. Check Level 2: Manager Escalation (>24h overdue)
    if (overdueHours >= 24 && f.escalationLevel < 2) {
      await prisma.followUp.update({
        where: { id: f.id },
        data: {
          escalationLevel: 2,
          lastEscalatedAt: now,
        },
      });

      await prisma.escalationLog.create({
        data: {
          leadId: lead.id,
          followUpId: f.id,
          level: "LEVEL_2",
          reason: `Follow-up overdue for ${Math.round(overdueHours)} hours`,
          previousAssigneeId: f.assignedToId,
          status: "ESCALATED",
        },
      });

      // Notify managers
      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            title: `⚠️ Overdue Follow-up Escalation: ${lead.name}`,
            message: `Follow-up assigned to ${f.assignedTo.name} is ${Math.round(overdueHours)}h overdue.`,
            type: "OVERDUE_ALERT",
            linkUrl: `/leads/${lead.id}`,
          },
        });
      }

      level2Count++;
      escalatedFollowUps.push(f.id);
      continue;
    }

    // 3. Level 1: Agent Alert
    if (f.escalationLevel < 1) {
      await prisma.followUp.update({
        where: { id: f.id },
        data: {
          escalationLevel: 1,
          lastEscalatedAt: now,
        },
      });

      await prisma.notification.create({
        data: {
          userId: f.assignedToId,
          title: `⚠️ Overdue Follow-up: ${lead.name}`,
          message: `Your follow-up scheduled for ${f.scheduledAt.toLocaleDateString("en-IN")} is past due. Please take action.`,
          type: "OVERDUE_ALERT",
          linkUrl: `/leads/${lead.id}`,
        },
      });

      level1Count++;
      escalatedFollowUps.push(f.id);
    }
  }

  return {
    scannedCount: overdueFollowUps.length,
    level1Count,
    level2Count,
    level3CriticalCount,
    escalatedFollowUps,
  };
}
