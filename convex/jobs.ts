// Prototype fungsi MR_Content_Jobs (blueprint §3–§5, §11)
// Job type == console type: PRODUCT | FILM_ANIMATION | NEWS.

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertTransition,
  consoleValidator,
  jobStatusValidator,
  type JobStatus,
} from "./model";
import { logHistory } from "./history";

// §3/§4/§5 — create job. sourceLink & sumber non-link disimpan via assets.
export const createJob = mutation({
  args: {
    console: consoleValidator,
    sourceLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("contentJobs", {
      console: args.console,
      jobType: args.console,
      status: "DRAFT",
      sourceLink: args.sourceLink,
      retryCount: 0,
    });
    await logHistory(ctx, jobId, "JOB_CREATED", {
      message: `Job dibuat dari console ${args.console}`,
    });
    return jobId;
  },
});

// §11 — guarded transition. Semua perpindahan status lewat sini.
export const transitionJob = mutation({
  args: {
    jobId: v.id("contentJobs"),
    to: jobStatusValidator,
    message: v.optional(v.string()),
    historyEvent: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, to, message, historyEvent }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new ConvexError("Job tidak ditemukan");
    const from = job.status as JobStatus;
    assertTransition(from, to);
    await ctx.db.patch(jobId, { status: to, updatedAt: Date.now() });
    await logHistory(ctx, jobId, historyEvent ?? "FAILED", {
      platform: undefined,
      status: to === "FAILED" ? "FAILED" : "SUCCESS",
      message:
        message ??
        `Status ${from} -> ${to}`,
    });
    return { from, to };
  },
});

// Daftar job untuk front door (filter console + status, terbaru dulu).
export const listJobs = query({
  args: {
    console: v.optional(consoleValidator),
    status: v.optional(jobStatusValidator),
  },
  handler: async (ctx, args) => {
    let q;
    if (args.console) {
      q = ctx.db
        .query("contentJobs")
        .withIndex("by_console", (c) => c.eq("console", args.console!));
    } else {
      q = ctx.db.query("contentJobs");
    }
    let rows = await q.order("desc").take(100);
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    return rows;
  },
});

// Detail satu job + asset + storyboard + queue + history terkait.
export const getJobDetail = query({
  args: { jobId: v.id("contentJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new ConvexError("Job tidak ditemukan");
    const [assets, storyboards, queue, history] = await Promise.all([
      ctx.db.query("assets").withIndex("by_job", (a) => a.eq("jobId", jobId)).collect(),
      ctx.db
        .query("storyboards")
        .withIndex("by_job", (s) => s.eq("jobId", jobId))
        .order("desc")
        .collect(),
      ctx.db.query("scheduleQueue").withIndex("by_job", (s) => s.eq("jobId", jobId)).collect(),
      ctx.db
        .query("history")
        .withIndex("by_job", (h) => h.eq("jobId", jobId))
        .order("desc")
        .collect(),
    ]);
    return { job, assets, storyboards, queue, history };
  },
});
