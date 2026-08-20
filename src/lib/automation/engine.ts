import { prisma } from "../prisma";
import { CrmEventPayload, AutomationResult } from "./events";
import { updateLeadScoreAndHistory } from "./scoring-engine";
import { createAutoFollowUp } from "./followup-automator";
import { createAdminAlert } from "./admin-alerts";

/**
 * Central CRM Event Dispatcher with idempotency guard.
 */
export async function dispatchCrmEvent(payload: CrmEventPayload): Promise<AutomationResult> {
  const { eventType, entityId, entityType, actorId, metadata } = payload;
  const idempotencyKey =
    payload.idempotencyKey ||
    `${eventType}_${entityId}_${metadata?.subId || ""}_${metadata?.timestamp || Date.now()}`;

  // 1. Idempotency Check
  const existingExecution = await prisma.automationExecution.findUnique({
    where: { idempotencyKey },
  });

  if (existingExecution && existingExecution.status === "SUCCESS") {
    return {
      success: true,
      skipped: true,
      skipReason: `Event with idempotency key ${idempotencyKey} has already executed.`,
      executedActions: JSON.parse(existingExecution.executedActions || "[]"),
    };
  }

  const executedActions: string[] = [];

  try {
    // 2. Dispatch to specific automation handlers based on eventType
    switch (eventType) {
      case "site_visit.completed": {
        // Auto-create next day follow-up
        const followUpRes = await createAutoFollowUp({
          leadId: entityId,
          triggerEvent: "site_visit.completed",
          priority: "HIGH",
          outcomeRemarks: "🤖 Follow-up scheduled automatically after Site Visit completion.",
        });
        if (followUpRes.success && !followUpRes.skipped) {
          executedActions.push(`Auto follow-up created (${followUpRes.followUpId})`);
        } else if (followUpRes.skipped) {
          executedActions.push(`Follow-up skipped: ${followUpRes.reason}`);
        }

        // Recalculate lead score
        const score = await updateLeadScoreAndHistory(entityId, "Site visit completed");
        executedActions.push(`Lead score updated to ${score.total} (${score.category})`);
        break;
      }

      case "lead.stage_changed": {
        const newStage = metadata?.newStage;
        if (newStage === "QUALIFIED") {
          const followUpRes = await createAutoFollowUp({
            leadId: entityId,
            triggerEvent: "lead.qualified",
            delayHours: 24,
            priority: "HIGH",
          });
          if (followUpRes.success && !followUpRes.skipped) {
            executedActions.push(`Auto follow-up scheduled for qualified lead (${followUpRes.followUpId})`);
          }
        }

        const score = await updateLeadScoreAndHistory(entityId, `Stage changed to ${newStage}`);
        executedActions.push(`Lead score recalculated: ${score.total} (${score.category})`);
        break;
      }

      case "lead.status_changed": {
        const newStatus = metadata?.newStatus;
        if (newStatus === "NEGOTIATION") {
          const followUpRes = await createAutoFollowUp({
            leadId: entityId,
            triggerEvent: "lead.negotiation",
            delayHours: 12,
            priority: "HIGH",
          });
          if (followUpRes.success && !followUpRes.skipped) {
            executedActions.push(`Urgent negotiation follow-up scheduled (${followUpRes.followUpId})`);
          }
        }

        const score = await updateLeadScoreAndHistory(entityId, `Status changed to ${newStatus}`);
        executedActions.push(`Lead score recalculated: ${score.total}`);
        break;
      }

      case "call.completed": {
        const score = await updateLeadScoreAndHistory(entityId, "Call logged on floor");
        executedActions.push(`Lead score updated after call to ${score.total}`);
        break;
      }

      case "lead.created":
      case "lead.updated": {
        const score = await updateLeadScoreAndHistory(entityId, "Lead details updated");
        executedActions.push(`Lead score calculated: ${score.total}`);

        // Check if high-value lead
        const lead = await prisma.lead.findUnique({ where: { id: entityId } });
        if (lead && lead.budgetMax && lead.budgetMax >= 15000000) {
          await createAdminAlert({
            severity: "INFO",
            category: "HIGH_VALUE_LEAD",
            title: `💎 High-Value Lead: ${lead.name} (${lead.budget})`,
            description: `High budget lead created in ${lead.preferredLocation || "Noida"}.`,
            entity: "LEAD",
            entityId: lead.id,
            entityCode: lead.leadCode,
            recommendedAction: "Review requirement & assign closing specialist",
            linkUrl: `/leads/${lead.id}`,
          });
          executedActions.push("High-value management alert generated");
        }
        break;
      }

      case "booking.created": {
        const leadId = metadata?.leadId || entityId;
        if (leadId) {
          const score = await updateLeadScoreAndHistory(leadId, "Booking closed");
          executedActions.push(`Lead score set to ${score.total} upon booking`);
        }
        break;
      }

      case "booking.cancelled": {
        await createAdminAlert({
          severity: "CRITICAL",
          category: "BOOKING_CANCELLED",
          title: `🔴 Booking Cancelled: ${metadata?.bookingCode || entityId}`,
          description: `Booking was cancelled. Reason: ${metadata?.reason || "No reason specified"}. Inventory unit released.`,
          entity: "BOOKING",
          entityId,
          recommendedAction: "Review cancellation reason and release refund/inventory",
          linkUrl: "/bookings",
        });
        executedActions.push("Critical booking cancellation alert generated");
        break;
      }

      case "inventory.available": {
        await createAdminAlert({
          severity: "INFO",
          category: "INVENTORY_CHANGE",
          title: `🔵 Unit Available: ${metadata?.unitNumber || entityId}`,
          description: `Inventory unit in ${metadata?.projectName || "Project"} is now AVAILABLE.`,
          entity: "INVENTORY",
          entityId,
          recommendedAction: "Pitch to interested buyers",
          linkUrl: "/projects",
        });
        executedActions.push("Inventory release alert generated");
        break;
      }

      default: {
        executedActions.push(`Event ${eventType} recorded`);
      }
    }

    // 3. Store Execution Record for Idempotency
    await prisma.automationExecution.upsert({
      where: { idempotencyKey },
      create: {
        eventType,
        entity: entityType,
        entityId,
        status: "SUCCESS",
        idempotencyKey,
        executedActions: JSON.stringify(executedActions),
      },
      update: {
        status: "SUCCESS",
        executedActions: JSON.stringify(executedActions),
      },
    });

    return {
      success: true,
      executedActions,
    };
  } catch (error: any) {
    console.error(`Automation Engine Error on ${eventType}:`, error);

    // Record failure in execution table
    await prisma.automationExecution.upsert({
      where: { idempotencyKey },
      create: {
        eventType,
        entity: entityType,
        entityId,
        status: "FAILED",
        idempotencyKey,
        error: error?.message || String(error),
      },
      update: {
        status: "FAILED",
        error: error?.message || String(error),
      },
    });

    return {
      success: false,
      executedActions,
      error: error?.message || String(error),
    };
  }
}
