import { prisma } from "../prisma";
import { updateLeadScoreAndHistory } from "./scoring-engine";

export interface DuplicateMatch {
  leadId: string;
  leadCode: string;
  name: string;
  phone: string;
  email: string | null;
  assignedToName: string | null;
  stage: string;
  status: string;
  leadScore: number;
  lastContactedAt: Date | null;
  confidence: "HIGH" | "MEDIUM" | "POSSIBLE";
  matchedOn: string;
}

/**
 * Normalizes phone number by removing country code (+91), spaces, dashes, leading zeroes.
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, ""); // Keep digits and +
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned.replace(/\D/g, ""); // return 10-digit clean string
}

/**
 * Normalizes email address by trimming and lowercasing.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Scans the database for potential duplicate leads before or after creation.
 */
export async function detectDuplicateLeads(params: {
  phone?: string;
  whatsapp?: string;
  email?: string;
  name?: string;
  preferredLocation?: string;
  excludeLeadId?: string;
}): Promise<DuplicateMatch[]> {
  const normPhone = normalizePhoneNumber(params.phone);
  const normWhatsapp = normalizePhoneNumber(params.whatsapp);
  const normEmail = normalizeEmail(params.email);

  const matches: DuplicateMatch[] = [];
  const visitedIds = new Set<string>();

  // 1. High Confidence: Phone or WhatsApp Match
  if (normPhone || normWhatsapp) {
    const searchPhones = [normPhone, normWhatsapp].filter(Boolean);
    const leadsByPhone = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        id: params.excludeLeadId ? { not: params.excludeLeadId } : undefined,
      },
      include: { assignedTo: true },
    });

    for (const lead of leadsByPhone) {
      const leadNormPhone = normalizePhoneNumber(lead.phone);
      const leadNormWhatsapp = normalizePhoneNumber(lead.whatsapp);

      if (
        (normPhone && (leadNormPhone === normPhone || leadNormWhatsapp === normPhone)) ||
        (normWhatsapp && (leadNormPhone === normWhatsapp || leadNormWhatsapp === normWhatsapp))
      ) {
        if (!visitedIds.has(lead.id)) {
          visitedIds.add(lead.id);
          matches.push({
            leadId: lead.id,
            leadCode: lead.leadCode,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            assignedToName: lead.assignedTo?.name || "Unassigned",
            stage: lead.stage,
            status: lead.status,
            leadScore: lead.leadScore,
            lastContactedAt: lead.lastContactedAt,
            confidence: "HIGH",
            matchedOn: "Exact Phone / WhatsApp Number",
          });
        }
      }
    }
  }

  // 2. Medium Confidence: Email Match
  if (normEmail) {
    const leadsByEmail = await prisma.lead.findMany({
      where: {
        email: { not: null },
        isDeleted: false,
        id: params.excludeLeadId ? { not: params.excludeLeadId } : undefined,
      },
      include: { assignedTo: true },
    });

    for (const lead of leadsByEmail) {
      if (normalizeEmail(lead.email) === normEmail && !visitedIds.has(lead.id)) {
        visitedIds.add(lead.id);
        matches.push({
          leadId: lead.id,
          leadCode: lead.leadCode,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          assignedToName: lead.assignedTo?.name || "Unassigned",
          stage: lead.stage,
          status: lead.status,
          leadScore: lead.leadScore,
          lastContactedAt: lead.lastContactedAt,
          confidence: "MEDIUM",
          matchedOn: "Exact Email Address",
        });
      }
    }
  }

  // 3. Possible Match: Name + Location
  if (params.name && params.name.length >= 4) {
    const leadsByName = await prisma.lead.findMany({
      where: {
        name: { contains: params.name },
        isDeleted: false,
        id: params.excludeLeadId ? { not: params.excludeLeadId } : undefined,
      },
      include: { assignedTo: true },
    });

    for (const lead of leadsByName) {
      if (!visitedIds.has(lead.id)) {
        const locationMatches =
          params.preferredLocation &&
          lead.preferredLocation &&
          lead.preferredLocation.toLowerCase().includes(params.preferredLocation.toLowerCase());

        if (locationMatches) {
          visitedIds.add(lead.id);
          matches.push({
            leadId: lead.id,
            leadCode: lead.leadCode,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            assignedToName: lead.assignedTo?.name || "Unassigned",
            stage: lead.stage,
            status: lead.status,
            leadScore: lead.leadScore,
            lastContactedAt: lead.lastContactedAt,
            confidence: "POSSIBLE",
            matchedOn: "Matching Name & Location",
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Safely merges a duplicate lead into a primary lead, preserving all calls, notes, follow-ups, visits, and bookings.
 */
export async function mergeLeads(
  param1: string | { primaryLeadId: string; secondaryLeadId?: string; duplicateLeadId?: string; mergedByUserId?: string; adminUser?: any },
  param2?: string,
  param3?: { id: string; name: string; roleSlug: string }
) {
  let primaryLeadId: string;
  let duplicateLeadId: string;
  let adminUser: { id: string; name: string; roleSlug: string };

  if (typeof param1 === "object") {
    primaryLeadId = param1.primaryLeadId;
    duplicateLeadId = (param1.duplicateLeadId || param1.secondaryLeadId)!;
    adminUser = param1.adminUser || {
      id: param1.mergedByUserId || "SYSTEM",
      name: "System Admin",
      roleSlug: "ADMIN",
    };
  } else {
    primaryLeadId = param1;
    duplicateLeadId = param2!;
    adminUser = param3 || { id: "SYSTEM", name: "System Admin", roleSlug: "ADMIN" };
  }

  if (primaryLeadId === duplicateLeadId) {
    throw new Error("Cannot merge a lead into itself");
  }

  const [primaryLead, duplicateLead] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: primaryLeadId },
      include: { assignedTo: true },
    }),
    prisma.lead.findUnique({
      where: { id: duplicateLeadId },
      include: { assignedTo: true },
    }),
  ]);

  if (!primaryLead || !duplicateLead) {
    throw new Error("One or both leads not found");
  }

  // Execute atomic merge transaction
  await prisma.$transaction(async (tx) => {
    // 1. Move all CallLogs to primary lead
    await tx.callLog.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // 2. Move all FollowUps to primary lead
    await tx.followUp.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // 3. Move all SiteVisits to primary lead
    await tx.siteVisit.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // 4. Move all Bookings to primary lead
    await tx.booking.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // 5. Move all LeadActivities to primary lead
    await tx.leadActivity.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // 6. Merge missing fields into primary lead
    const updatedData: Record<string, any> = {};
    if (!primaryLead.email && duplicateLead.email) updatedData.email = duplicateLead.email;
    if (!primaryLead.whatsapp && duplicateLead.whatsapp) updatedData.whatsapp = duplicateLead.whatsapp;
    if (!primaryLead.budget && duplicateLead.budget) updatedData.budget = duplicateLead.budget;
    if (!primaryLead.preferredLocation && duplicateLead.preferredLocation)
      updatedData.preferredLocation = duplicateLead.preferredLocation;
    if (!primaryLead.requirementNotes && duplicateLead.requirementNotes)
      updatedData.requirementNotes = duplicateLead.requirementNotes;
    if (!primaryLead.projectInterestId && duplicateLead.projectInterestId)
      updatedData.projectInterestId = duplicateLead.projectInterestId;

    // Merge tags
    if (duplicateLead.tags) {
      const existingTags = primaryLead.tags ? primaryLead.tags.split(",") : [];
      const dupTags = duplicateLead.tags.split(",");
      const mergedTags = Array.from(new Set([...existingTags, ...dupTags])).join(",");
      updatedData.tags = mergedTags;
    }

    if (Object.keys(updatedData).length > 0) {
      await tx.lead.update({
        where: { id: primaryLeadId },
        data: updatedData,
      });
    }

    // 7. Soft-delete duplicate lead and link to primary
    await tx.lead.update({
      where: { id: duplicateLeadId },
      data: {
        isDeleted: true,
        isDuplicate: true,
        deletedAt: new Date(),
        deletedBy: adminUser.name,
        deletedReason: `Merged into ${primaryLead.leadCode} (${primaryLead.name}) by ${adminUser.name}`,
        mergedIntoId: primaryLeadId,
      },
    });

    // 8. Log activity on primary lead
    await tx.leadActivity.create({
      data: {
        leadId: primaryLeadId,
        userId: adminUser.id,
        type: "LEAD_MERGED",
        title: `🤖 Duplicate Lead Merged: ${duplicateLead.name} (${duplicateLead.leadCode})`,
        description: `All calls, visits, activities, and follow-ups from ${duplicateLead.leadCode} were consolidated into this lead by ${adminUser.name}.`,
        isAutomated: false,
      },
    });

    // 9. Create Immutable Audit Log
    await tx.auditLog.create({
      data: {
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.roleSlug,
        action: "LEAD_MERGE",
        entity: "LEAD",
        entityId: primaryLeadId,
        entityCode: primaryLead.leadCode,
        fieldChanged: "MERGED_LEAD",
        oldValue: duplicateLead.leadCode,
        newValue: primaryLead.leadCode,
        metadata: JSON.stringify({
          sourceLeadId: duplicateLead.id,
          sourceLeadCode: duplicateLead.leadCode,
          targetLeadId: primaryLead.id,
          targetLeadCode: primaryLead.leadCode,
        }),
      },
    });
  }, { maxWait: 20000, timeout: 45000 });

  // 10. Recalculate score on primary lead
  await updateLeadScoreAndHistory(primaryLeadId, "Recalculated after duplicate lead merge");

  return {
    success: true,
    primaryLeadId,
    mergedLeadId: duplicateLeadId,
  };
}

export async function findDuplicateLeads(params: {
  phone?: string;
  whatsapp?: string;
  email?: string;
  name?: string;
  preferredLocation?: string;
  excludeLeadId?: string;
}) {
  const duplicates = await detectDuplicateLeads(params);
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}
