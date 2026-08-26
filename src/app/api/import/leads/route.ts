export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import Papa from "papaparse";

/**
 * Normalizes Indian phone numbers:
 * +91 98119 92233 -> 9811992233
 * 09811992233 -> 9811992233
 */
function normalizeIndianPhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.create") && !hasPermission(user, "leads.assign")) {
      return forbiddenResponse("You do not have permission to import leads.");
    }

    const body = await req.json();
    const {
      csvContent,
      assignedToId = null,
      strategy = "SINGLE_USER", // "SINGLE_USER" | "ROUND_ROBIN" | "UNASSIGNED"
      targetUserIds = [],
    } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return errorResponse("CSV / Tabular content is required.", 400);
    }

    // Auto-detect delimiter (comma or tab for Google Sheets / Excel copy-paste)
    const firstLine = csvContent.split("\n")[0] || "";
    const isTabDelimited = firstLine.includes("\t") && !firstLine.includes(",");

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      delimiter: isTabDelimited ? "\t" : undefined,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return errorResponse("Failed to parse tabular data.", 400, { csv: parsed.errors.map((e) => e.message) });
    }

    const rows = parsed.data as Array<Record<string, any>>;
    if (rows.length === 0) {
      return errorResponse("No data rows found in the submitted file or text.", 400);
    }

    // Prepare active assignees
    let activeAssignees: Array<{ id: string; name: string }> = [];
    if (strategy === "ROUND_ROBIN") {
      const idsToFetch = targetUserIds.length > 0 ? targetUserIds : undefined;
      activeAssignees = await prisma.user.findMany({
        where: {
          ...(idsToFetch ? { id: { in: idsToFetch } } : {}),
          status: "ACTIVE",
          isDeleted: false,
        },
        select: { id: true, name: true },
      });
      if (activeAssignees.length === 0) {
        activeAssignees = [{ id: user.id, name: user.name }];
      }
    } else if (strategy === "SINGLE_USER" && assignedToId) {
      const singleAssignee = await prisma.user.findUnique({
        where: { id: assignedToId, status: "ACTIVE", isDeleted: false },
        select: { id: true, name: true },
      });
      if (singleAssignee) {
        activeAssignees = [singleAssignee];
      }
    }

    // 1. First-pass: In-memory normalization & phone extraction
    const rawParsedRows: Array<{
      index: number;
      name: string;
      rawPhone: string;
      phone: string;
      email: string | null;
      budget: string | null;
      location: string | null;
      propertyType: string;
      source: string;
      campaign: string;
      remarks: string;
    }> = [];

    const errors: string[] = [];
    const allPhones: string[] = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (
        row.name ||
        row.Name ||
        row["Full Name"] ||
        row["Customer Name"] ||
        row["Lead Name"] ||
        row["Client Name"] ||
        ""
      ).trim();

      const rawPhone = (
        row.phone ||
        row.Phone ||
        row.Mobile ||
        row.mobile ||
        row["Phone Number"] ||
        row["Mobile Number"] ||
        row.Contact ||
        row["Contact Number"] ||
        ""
      ).toString();

      const phone = normalizeIndianPhone(rawPhone);

      const email = (row.email || row.Email || row["Email Address"] || row.mail || "").trim() || null;
      const budget = (row.budget || row.Budget || row.Price || row["Budget Range"] || "").trim() || null;
      const location = (
        row.location ||
        row.Location ||
        row.preferredLocation ||
        row["Preferred Location"] ||
        row.City ||
        row.Area ||
        row.Sector ||
        ""
      ).trim() || null;

      const propertyType = (
        row.propertyType ||
        row["Property Type"] ||
        row.Type ||
        row.Configuration ||
        "RESIDENTIAL_APARTMENT"
      ).trim();

      const source = (
        row.source ||
        row.Source ||
        row["Lead Source"] ||
        row.Channel ||
        row["Campaign Source"] ||
        "BULK_IMPORT"
      ).trim();

      const campaign = (
        row.campaign ||
        row.Campaign ||
        row["Campaign Name"] ||
        "Bulk Ingestion"
      ).trim();

      const remarks = (
        row.remarks ||
        row.Remarks ||
        row.notes ||
        row.Notes ||
        row.Requirement ||
        row.Comments ||
        "Imported via Bulk Ingestion"
      ).trim();

      if (!name || !phone || phone.length < 10) {
        errors.push(`Row ${i + 1}: Skipped (Invalid name "${name || "Empty"}" or phone "${rawPhone || "Empty"}").`);
        continue;
      }

      if (seenPhonesInBatch.has(phone)) {
        errors.push(`Row ${i + 1}: Duplicate phone ${phone} appears multiple times in uploaded file.`);
        continue;
      }

      seenPhonesInBatch.add(phone);
      allPhones.push(phone);

      rawParsedRows.push({
        index: i + 1,
        name,
        rawPhone,
        phone,
        email,
        budget,
        location,
        propertyType,
        source,
        campaign,
        remarks,
      });
    }

    if (rawParsedRows.length === 0) {
      return errorResponse("No valid rows could be parsed from the file.", 400, { errors });
    }

    // 2. High-speed single query for existing duplicates in DB
    const existingLeadsInDb = await prisma.lead.findMany({
      where: {
        phone: { in: allPhones },
        isDeleted: false,
      },
      select: { phone: true, name: true, leadCode: true },
    });

    const existingPhoneMap = new Map<string, { name: string; leadCode: string }>();
    for (const lead of existingLeadsInDb) {
      existingPhoneMap.set(lead.phone, { name: lead.name, leadCode: lead.leadCode });
    }

    // 3. Filter valid leads ready for batch insert
    const validRowsToInsert: typeof rawParsedRows = [];
    let duplicatesCount = 0;

    for (const r of rawParsedRows) {
      const existing = existingPhoneMap.get(r.phone);
      if (existing) {
        duplicatesCount++;
        errors.push(`Row ${r.index}: Duplicate phone ${r.phone} already exists (${existing.name} - ${existing.leadCode}).`);
      } else {
        validRowsToInsert.push(r);
      }
    }

    if (validRowsToInsert.length === 0) {
      return successResponse(
        {
          importedCount: 0,
          totalRows: rows.length,
          duplicatesCount,
          errorsCount: errors.length,
          errors,
        },
        "No new leads to import (all duplicates or invalid)."
      );
    }

    // 4. Determine base lead counter
    const baseCount = await prisma.lead.count();
    let currentCount = baseCount;

    // Prepare batch create items
    const leadsToCreateData: any[] = [];
    const activitiesToCreateData: any[] = [];
    const assigneeNotificationMap = new Map<string, { count: number; name: string }>();

    for (let i = 0; i < validRowsToInsert.length; i++) {
      const r = validRowsToInsert[i];
      currentCount++;
      const leadCode = `LD-${1000 + currentCount}`;

      let targetAssigneeId: string | null = null;
      let targetAssigneeName = "Unassigned";

      if (strategy === "UNASSIGNED") {
        targetAssigneeId = null;
      } else if (strategy === "ROUND_ROBIN" && activeAssignees.length > 0) {
        const selected = activeAssignees[i % activeAssignees.length];
        targetAssigneeId = selected.id;
        targetAssigneeName = selected.name;
      } else if (strategy === "SINGLE_USER" && activeAssignees.length > 0) {
        targetAssigneeId = activeAssignees[0].id;
        targetAssigneeName = activeAssignees[0].name;
      } else {
        targetAssigneeId = user.id;
        targetAssigneeName = user.name;
      }

      if (targetAssigneeId && targetAssigneeId !== user.id) {
        const prev = assigneeNotificationMap.get(targetAssigneeId) || { count: 0, name: targetAssigneeName };
        prev.count += 1;
        assigneeNotificationMap.set(targetAssigneeId, prev);
      }

      leadsToCreateData.push({
        leadCode,
        name: r.name,
        phone: r.phone,
        whatsapp: r.phone,
        email: r.email,
        budget: r.budget,
        preferredLocation: r.location,
        propertyType: r.propertyType,
        source: r.source,
        campaign: r.campaign,
        assignedToId: targetAssigneeId,
        createdById: user.id,
        stage: "TO_WORK",
        status: "NEW",
        priority: "WARM",
        latestRemarks: r.remarks,
        targetAssigneeName,
      });
    }

    // 5. Chunked parallel creation for high throughput (< 500ms for 500 leads)
    const CHUNK_SIZE = 50;
    const createdLeadsList: any[] = [];

    for (let i = 0; i < leadsToCreateData.length; i += CHUNK_SIZE) {
      const chunk = leadsToCreateData.slice(i, i + CHUNK_SIZE);
      const createdChunk = await prisma.$transaction(
        chunk.map((item) => {
          const { targetAssigneeName, ...leadData } = item;
          return prisma.lead.create({
            data: leadData,
          });
        })
      );

      for (let j = 0; j < createdChunk.length; j++) {
        const created = createdChunk[j];
        const originalItem = chunk[j];
        createdLeadsList.push(created);

        activitiesToCreateData.push({
          leadId: created.id,
          userId: user.id,
          type: "STAGE_CHANGED",
          title: "Lead Imported via Bulk Ingestion",
          description: `${originalItem.latestRemarks} • Assigned to: ${originalItem.targetAssigneeName}`,
        });
      }
    }

    // 6. Batch create activities
    if (activitiesToCreateData.length > 0) {
      await prisma.leadActivity.createMany({
        data: activitiesToCreateData,
      });
    }

    // 7. Batch create consolidated notifications
    const notificationsToCreate: any[] = [];
    for (const [assigneeId, data] of assigneeNotificationMap.entries()) {
      notificationsToCreate.push({
        userId: assigneeId,
        title: "New Bulk Leads Assigned",
        message: `${data.count} new leads were assigned to you by ${user.name}.`,
        type: "LEAD_ASSIGNED",
        linkUrl: "/leads?stage=TO_WORK",
      });
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate,
      });
    }

    // 8. Audit Log
    await createAuditLog({
      user,
      action: "CREATE",
      entity: "LEAD",
      newValue: `Bulk imported ${createdLeadsList.length} leads (Strategy: ${strategy})`,
    });

    return successResponse(
      {
        importedCount: createdLeadsList.length,
        totalRows: rows.length,
        duplicatesCount,
        errorsCount: errors.length,
        errors: errors.slice(0, 10), // return first 10 errors to keep payload light
        importedSample: createdLeadsList.slice(0, 5),
      },
      `Successfully imported ${createdLeadsList.length} leads in real-time.`
    );
  } catch (error: any) {
    console.error("POST /api/import/leads error:", error);
    return errorResponse("Failed to import leads. Please check format.", 500, { error: error.message });
  }
}
