// Audit trail MR_History (blueprint §19). Semua event lewat logHistory.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { historyEventTypeValidator, platformValidator, stageResultValidator } from "./model";
import type { Id } from "./_generated/dataModel";

export const logHistoryArgs = {
  jobId: v.id("contentJobs"),
  eventType: historyEventTypeValidator,
  platform: v.optional(platformValidator),
  status: v.optional(stageResultValidator),
  message: v.optional(v.string()),
};

export async function logHistory(
  ctx: { db: any },
  jobId: Id<"contentJobs">,
  eventType: any,
  opts: { platform?: any; status?: any; message?: string } = {},
) {
  await ctx.db.insert("history", {
    jobId,
    eventType,
    platform: opts.platform,
    status: opts.status,
    message: opts.message,
    eventAt: Date.now(),
  });
}

// Untuk dijalankan lewat dashboard (internal).
export const listJobHistory = internalQuery({
  args: { jobId: v.id("contentJobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db
      .query("history")
      .withIndex("by_job", (h) => h.eq("jobId", jobId))
      .order("desc")
      .collect();
  },
});
