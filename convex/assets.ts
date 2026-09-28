// MR_Assets (blueprint §13–§14): registrasi asset + lifecycle cleanup 24 jam.

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logHistory } from "./history";

// Registrasi asset (storage key di Stratus/Convex storage, metadata di sini).
// §14 — TTL default 24 jam: upload -> process -> preview -> publish -> cleanup.
export const registerAsset = mutation({
  args: {
    jobId: v.id("contentJobs"),
    assetType: v.string(),
    storageKey: v.string(),
    mimeType: v.string(),
    ttlHours: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, assetType, storageKey, mimeType, ttlHours }) => {
    if (!(await ctx.db.get(jobId))) throw new ConvexError("Job tidak ditemukan");
    const ttl = ttlHours ?? 24;
    const assetId = await ctx.db.insert("assets", {
      jobId,
      assetType,
      storageKey,
      mimeType,
      status: "ACTIVE",
      expiresAt: Date.now() + ttl * 3600_000,
    });
    return assetId;
  },
});

// Tandai expired (scheduler memanggil ini saat cleanup §17).
export const expireAsset = mutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) throw new ConvexError("Asset tidak ditemukan");
    if (asset.status === "EXPIRED") return;
    await ctx.db.patch(assetId, { status: "EXPIRED" });
    await logHistory(ctx, asset.jobId, "FAILED", {
      message: `Asset ${assetId} expired (cleanup eligibility)`,
    });
  },
});

// §17B — scheduler cleanup: cari asset yang sudah lewat expires_at.
export const listExpiredAssets = query({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, { now }) => {
    const t = now ?? Date.now();
    return await ctx.db
      .query("assets")
      .withIndex("by_expires_at", (a) => a.lt("expiresAt", t))
      .filter((a) => a.eq(a.field("status"), "ACTIVE"))
      .take(100);
  },
});
