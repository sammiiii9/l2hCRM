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
      delimiter: isTabDelimited ? "\t" : undefined, // auto-detect if undefined
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return errorResponse("Failed to parse tabular data.", 400, { csv: parsed.errors.map((e) => e.message) });
    }

    const rows = parsed.data as Array<Record<string, any>>;
    if (rows.length === 0) {
      return errorResponse("No data rows found in the submitted file or text.", 400);
    }

    // Prepare assignees if strategy is ROUND_ROBIN or SINGLE_USER
    let activeAssignees: any[] = [];
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
        // Fallback to current user if none found
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

    const importedLeads: any[] = [];
    const errors: string[] = [];
    let duplicatesCount = 0;

    let count = await prisma.lead.count();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Flexible column mappings
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
        "Bulk Import"
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

      // Duplicate check against existing active leads
      const existing = await prisma.lead.findFirst({
        where: { phone, isDeleted: false },
      });

      if (existing) {
        duplicatesCount++;
        errors.push(`Row ${i + 1}: Duplicate phone ${phone} already exists (${existing.name} - ${existing.leadCode}).`);
        continue;
      }

      count++;
      const leadCode = `LD-${1000 + count}`;

      // Determine assignee based on strategy
      let targetAssigneeId: string | null = null;
      let targetAssigneeName = "Unassigned";

      if (strategy === "UNASSIGNED") {
        targetAssigneeId = null;
      } else if (strategy === "ROUND_ROBIN" && activeAssignees.length > 0) {
        const selected = activeAssignees[importedLeads.length % activeAssignees.length];
        targetAssigneeId = selected.id;
        targetAssigneeName = selected.name;
      } else if (strategy === "SINGLE_USER" && activeAssignees.length > 0) {
        targetAssigneeId = activeAssignees[0].id;
        targetAssigneeName = activeAssignees[0].name;
      } else {
        targetAssigneeId = user.id;
        targetAssigneeName = user.name;
      }

      const newLead = await prisma.lead.create({
        data: {
          leadCode,
          name,
          phone,
          whatsapp: phone,
          email,
          budget,
          preferredLocation: location,
          propertyType,
          source,
          campaign,
          assignedToId: targetAssigneeId,
          createdById: user.id,
          stage: "TO_WORK",
          status: "NEW",
          priority: "WARM",
          latestRemarks: remarks,
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: newLead.id,
          userId: user.id,
          type: "STAGE_CHANGED",
          title: "Lead Imported via Bulk Ingestion",
          description: `${remarks} • Assigned to: ${targetAssigneeName}`,
        },
      });

      // Send notification if assigned to another advisor
      if (targetAssigneeId && targetAssigneeId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: targetAssigneeId,
            title: "New Bulk Lead Assigned",
            message: `${newLead.name} (${newLead.leadCode}, ${location || "General"}) assigned to you by ${user.name}.`,
            type: "LEAD_ASSIGNED",
            linkUrl: `/leads/${newLead.id}`,
          },
        });
      }

      importedLeads.push(newLead);
    }

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "LEAD",
      newValue: `Bulk imported ${importedLeads.length} leads. Duplicates skipped: ${duplicatesCount}. Strategy: ${strategy}`,
      metadata: {
        totalRows: rows.length,
        importedCount: importedLeads.length,
        duplicatesCount,
        strategy,
        assignedToId,
      },
    });

    return successResponse(
      {
        totalProcessed: rows.length,
        importedCount: importedLeads.length,
        duplicatesCount,
        errorCount: errors.length,
        errors: errors.slice(0, 20), // Return top 20 errors
      },
      `Import completed: ${importedLeads.length} imported successfully, ${duplicatesCount} duplicates skipped.`
    );
  } catch (error) {
    console.error("POST /api/import/leads error:", error);
    return errorResponse("Bulk lead import failed.", 500);
  }
}
