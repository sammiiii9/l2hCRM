export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, getOwnershipFilter } from "@/lib/rbac";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasPermission(user, "leads.view")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const ownershipWhere = getOwnershipFilter(user, "assignedToId");
    const leads = await prisma.lead.findMany({
      where: { ...ownershipWhere, isDeleted: false },
      include: {
        assignedTo: { select: { name: true } },
        projectInterest: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData = leads.map((l) => ({
      "Lead Code": l.leadCode,
      "Name": l.name,
      "Phone": l.phone,
      "Email": l.email || "",
      "Stage": l.stage,
      "Status": l.status,
      "Priority": l.priority,
      "Budget": l.budget || "",
      "Location": l.preferredLocation || "",
      "Property Type": l.propertyType,
      "Assigned To": l.assignedTo?.name || "Unassigned",
      "Project Interest": l.projectInterest?.name || "",
      "Latest Remarks": l.latestRemarks || "",
      "Created Date": l.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(exportData);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/leads error:", error);
    return new NextResponse("Export failed", { status: 500 });
  }
}
