// MR_Storyboards (blueprint §13): versioning per job.

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logHistory } from "./history";

// Buat versi storyboard baru; version = versi terakhir + 1.
export const createStoryboard = mutation({
  args: {
    jobId: v.id("contentJobs"),
    content: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, { jobId, content, provider }) => {
    if (!(await ctx.db.get(jobId))) throw new ConvexError("Job tidak ditemukan");
    const latest = await ctx.db
      .query("storyboards")
      .withIndex("by_job_version", (s) => s.eq("jobId", jobId))
      .order("desc")
      .first();
    const version = (latest?.version ?? 0) + 1;
    const sbId = await ctx.db.insert("storyboards", {
      jobId,
      version,
      content,
      provider,
      status: "ACTIVE",
    });
    await logHistory(ctx, jobId, "STORYBOARD_CREATED", {
      message: `Storyboard v${version} oleh ${provider}`,
    });
    return { storyboardId: sbId, version };
  },
});

export const listStoryboards = query({
  args: { jobId: v.id("contentJobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db
      .query("storyboards")
      .withIndex("by_job", (s) => s.eq("jobId", jobId))
      .order("desc")
      .collect();
  },
});
