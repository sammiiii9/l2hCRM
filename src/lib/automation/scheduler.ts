import { scanAndEscalateOverdueFollowUps } from "./overdue-escalator";
import { scanForAdminAlerts } from "./admin-alerts";

export interface SchedulerRunResult {
  timestamp: string;
  overdueFollowUps: any;
  adminAlertsScanned: boolean;
  success: boolean;
  status: "SUCCESS" | "FAILED";
  tasks?: any;
  error?: string;
}

/**
 * Runs the periodic automation checks idempotently.
 */
export async function runPeriodicAutomations(): Promise<SchedulerRunResult> {
  try {
    const overdueResult = await scanAndEscalateOverdueFollowUps();
    await scanForAdminAlerts();

    return {
      timestamp: new Date().toISOString(),
      overdueFollowUps: overdueResult,
      adminAlertsScanned: true,
      success: true,
      status: "SUCCESS",
      tasks: {
        overdueEscalations: overdueResult.level1Count + overdueResult.level2Count + overdueResult.level3CriticalCount,
        staleLeadsProcessed: 0,
      },
    };
  } catch (error: any) {
    console.error("Scheduler Error:", error);
    return {
      timestamp: new Date().toISOString(),
      overdueFollowUps: null,
      adminAlertsScanned: false,
      success: false,
      status: "FAILED",
      error: error?.message || String(error),
    };
  }
}

export const runPeriodicAutomationJobs = runPeriodicAutomations;
