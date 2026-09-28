// MR_Schedule_Queue (blueprint §13, §17A, §18).

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertTransition, platformValidator } from "./model";
import { logHistory } from "./history";

// APPROVED -> SCHEDULED (enqueue). Satu job bisa multi platform.
export const enqueue = mutation({
  args: {
    jobId: v.id("contentJobs"),
    platform: platformValidator,
    scheduledAt: v.number(),
  },
  handler: async (ctx, { jobId, platform, scheduledAt }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new ConvexError("Job tidak ditemukan");
    if (job.status !== "APPROVED") {
      throw new ConvexError(
        `Job harus APPROVED sebelum masuk queue (status: ${job.status})`,
      );
    }
    await ctx.db.insert("scheduleQueue", {
      jobId,
      platform,
      scheduledAt,
      status: "SCHEDULED",
    });
    await ctx.db.patch(jobId, { status: "SCHEDULED", updatedAt: Date.now() });
    await logHistory(ctx, jobId, "SCHEDULED", {
      platform,
      message: `Dijadwalkan ke ${platform} pada ${new Date(scheduledAt).toISOString()}`,
    });
  },
});

// Scheduler Buffer: SCHEDULED -> SENT (via SENDING) (§18).
export const markSent = mutation({
  args: {
    queueId: v.id("scheduleQueue"),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, { queueId, externalId }) => {
    const item = await ctx.db.get(queueId);
    if (!item) throw new ConvexError("Queue item tidak ditemukan");
    if (item.status !== "SCHEDULED" && item.status !== "SENDING") {
      throw new ConvexError(`Item queue status ${item.status}, tidak bisa -> SENT`);
    }
    await ctx.db.patch(queueId, { status: "SENT", externalId });
    await ctx.db.patch(item.jobId, { status: "SENT", updatedAt: Date.now() });
    await logHistory(ctx, item.jobId, "SENT", {
      platform: item.platform,
      message: externalId
        ? `Terkirim ke ${item.platform}, external_id=${externalId}`
        : `Terkirim ke ${item.platform}`,
    });
  },
});

// SENT -> PUBLISHED.
export const markPublished = mutation({
  args: { queueId: v.id("scheduleQueue") },
  handler: async (ctx, { queueId }) => {
    const item = await ctx.db.get(queueId);
    if (!item) throw new ConvexError("Queue item tidak ditemukan");
    if (item.status !== "SENT") {
      throw new ConvexError(`Item queue status ${item.status}, tidak bisa -> PUBLISHED`);
    }
    await ctx.db.patch(queueId, { status: "PUBLISHED" });
    await ctx.db.patch(item.jobId, { status: "PUBLISHED", updatedAt: Date.now() });
    await logHistory(ctx, item.jobId, "PUBLISHED", {
      platform: item.platform,
      message: `Publish terkonfirmasi di ${item.platform}`,
    });
  },
});

// Gagal kirim: catat error_message + history.
export const markFailed = mutation({
  args: {
    queueId: v.id("scheduleQueue"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { queueId, errorMessage }) => {
    const item = await ctx.db.get(queueId);
    if (!item) throw new ConvexError("Queue item tidak ditemukan");
    await ctx.db.patch(queueId, { status: "FAILED", errorMessage });
    await ctx.db.patch(item.jobId, { status: "FAILED", updatedAt: Date.now() });
    await logHistory(ctx, item.jobId, "FAILED", {
      platform: item.platform,
      status: "FAILED",
      message: `Publish gagal: ${errorMessage}`,
    });
  },
});

// §17A — scheduler: item SCHEDULED yang scheduledAt-nya sudah lewat.
export const listDue = query({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, { now }) => {
    const t = now ?? Date.now();
    return await ctx.db
      .query("scheduleQueue")
      .withIndex("by_status", (q) => q.eq("status", "SCHEDULED"))
      .filter((q) => q.lte(q.field("scheduledAt"), t))
      .take(100);
  },
});
