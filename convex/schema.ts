// MR.ONE Content Production Hub — prototype skema Convex
// Pemetaan 1:1 dari blueprint §13 (Database). Convex bersifat schemaless-typed:
// tabel tanpa kolom wajib dideklarasikan eksplisit via defineTable({}).indexes([]).

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  consoleValidator,
  historyEventTypeValidator,
  jobStatusValidator,
  platformValidator,
  queueStatusValidator,
  stageResultValidator,
} from "./model";

export default defineSchema({
  // §13 — MR_Content_Jobs
  contentJobs: defineTable({
    jobType: consoleValidator, // PRODUCT | FILM_ANIMATION | NEWS
    status: jobStatusValidator,
    sourceLink: v.optional(v.string()),
    console: consoleValidator,
    // §7 — jejak router AI
    providerTrace: v.optional(v.array(v.string())),
    retryCount: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_console", ["console"]),

  // §13 — MR_Assets
  assets: defineTable({
    jobId: v.id("contentJobs"),
    assetType: v.string(), // screenshot | video | logo | storyboard_asset
    storageKey: v.string(),
    mimeType: v.string(),
    status: v.string(),
    // §14 — cleanup eligibility (epoch ms), default 24 jam saat registrasi
    expiresAt: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_expires_at", ["expiresAt"]),

  // §13 — MR_Storyboards
  storyboards: defineTable({
    jobId: v.id("contentJobs"),
    version: v.number(),
    content: v.string(),
    provider: v.string(),
    status: v.string(),
  })
    .index("by_job", ["jobId"])
    .index("by_job_version", ["jobId", "version"]),

  // §13 — MR_Schedule_Queue
  scheduleQueue: defineTable({
    jobId: v.id("contentJobs"),
    platform: platformValidator,
    scheduledAt: v.number(),
    status: queueStatusValidator,
    externalId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
  .index("by_job", ["jobId"])
  .index("by_status", ["status"])
  .index("by_scheduled_at", ["scheduledAt"]),

  // §13 — MR_History (audit trail §19)
  history: defineTable({
    jobId: v.id("contentJobs"),
    eventType: historyEventTypeValidator,
    platform: v.optional(platformValidator),
    status: v.optional(stageResultValidator),
    message: v.optional(v.string()),
    eventAt: v.number(),
  }).index("by_job", ["jobId"]),
});
