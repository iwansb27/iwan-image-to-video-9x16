// MR.ONE Content Production Hub — shared model (blueprint §11, §19, §22)
// State machine job + validator status. Dipakai lintas tabel.

import { v } from "convex/values";
import { ConvexError } from "convex/values";

// §11 Job State Machine
export const JOB_STATUSES = [
  // Production lifecycle
  "DRAFT",
  "VALIDATING",
  "ANALYZING",
  "STORYBOARDING",
  "PRODUCING",
  "READY_REVIEW",
  // Review outcomes
  "APPROVED",
  // Publishing lifecycle (mirror MR_Schedule_Queue)
  "SCHEDULED",
  "SENT",
  "PUBLISHED",
  // Terminal
  "DELETED",
  "FAILED",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export const jobStatusValidator = v.union(
  ...JOB_STATUSES.map((s) => v.literal(s)),
);

// §3/§4/§5 — consoles
export const CONSOLES = ["PRODUCT", "FILM_ANIMATION", "NEWS"] as const;
export type Console = (typeof CONSOLES)[number];
export const consoleValidator = v.union(
  ...CONSOLES.map((c) => v.literal(c)),
);

// §18 — publishing statuses & platforms
export const QUEUE_STATUSES = [
  "PENDING",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "PUBLISHED",
  "FAILED",
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];
export const queueStatusValidator = v.union(
  ...QUEUE_STATUSES.map((s) => v.literal(s)),
);

export const PLATFORMS = ["FACEBOOK", "YOUTUBE", "TIKTOK"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const platformValidator = v.union(
  ...PLATFORMS.map((p) => v.literal(p)),
);

// §19 — audit trail event types
export const HISTORY_EVENT_TYPES = [
  "JOB_CREATED",
  "SOURCE_VALIDATED",
  "STORYBOARD_CREATED",
  "VIDEO_GENERATED",
  "REVIEW_READY",
  "APPROVED",
  "SCHEDULED",
  "SENT",
  "PUBLISHED",
  "FAILED",
  "RESET",
  "DELETED",
] as const;
export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number];
export const historyEventTypeValidator = v.union(
  ...HISTORY_EVENT_TYPES.map((e) => v.literal(e)),
);

// §22 — every stage reports SUCCESS / FAILED / RETRYABLE / NON_RETRYABLE
export const STAGE_RESULTS = [
  "SUCCESS",
  "FAILED",
  "RETRYABLE",
  "NON_RETRYABLE",
] as const;
export type StageResult = (typeof STAGE_RESULTS)[number];
export const stageResultValidator = v.union(
  ...STAGE_RESULTS.map((r) => v.literal(r)),
);

// §11 — legal transitions. Any stage may enter FAILED.
export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ["VALIDATING", "DELETED", "FAILED"],
  VALIDATING: ["ANALYZING", "FAILED"],
  ANALYZING: ["STORYBOARDING", "FAILED"],
  STORYBOARDING: ["PRODUCING", "FAILED"],
  PRODUCING: ["READY_REVIEW", "FAILED"],
  READY_REVIEW: ["VALIDATING", "ANALYZING", "STORYBOARDING", "PRODUCING", "DELETED", "APPROVED", "FAILED"],
  APPROVED: ["SCHEDULED", "FAILED"],
  SCHEDULED: ["SENT", "FAILED"],
  SENT: ["PUBLISHED", "FAILED"],
  PUBLISHED: [],
  DELETED: [],
  FAILED: ["VALIDATING", "ANALYZING", "STORYBOARDING", "PRODUCING", "DELETED"],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  const allowed = JOB_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConvexError(
      `Transisi status ilegal: ${from} -> ${to}. Diizinkan: ${allowed.join(", ") || "(tidak ada)"}`,
    );
  }
}

// §22 — retry budget per error class.Prototype: class-based, bukan per-job.
export const CLASS_ERROR_RETRIES = {
  RETRYABLE: 2,
  NON_RETRYABLE: 0,
  FAILED: 0,
  SUCCESS: 0,
} as const satisfies Record<StageResult, number>;
