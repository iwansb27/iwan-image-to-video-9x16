import { createMCPServer } from "mcp-use/server";
import { z } from "zod";

const port = Number(process.env.PORT || 3000);

type JobState =
  | "DRAFT"
  | "RESEARCHING"
  | "READY"
  | "PRODUCING"
  | "REVIEW"
  | "APPROVED"
  | "QUEUED"
  | "PUBLISHED"
  | "MONITORED"
  | "ARCHIVED";

const states: JobState[] = [
  "DRAFT",
  "RESEARCHING",
  "READY",
  "PRODUCING",
  "REVIEW",
  "APPROVED",
  "QUEUED",
  "PUBLISHED",
  "MONITORED",
  "ARCHIVED",
];

const nextState: Record<JobState, JobState | null> = {
  DRAFT: "RESEARCHING",
  RESEARCHING: "READY",
  READY: "PRODUCING",
  PRODUCING: "REVIEW",
  REVIEW: "APPROVED",
  APPROVED: "QUEUED",
  QUEUED: "PUBLISHED",
  PUBLISHED: "MONITORED",
  MONITORED: "ARCHIVED",
  ARCHIVED: null,
};

const server = createMCPServer("mr-one-production", {
  version: "0.2.0",
  description:
    "MR.ONE Production orchestration layer for Manufact: jobs, workflow state, approval boundary, registry metadata, and audit events.",
  baseUrl: process.env.MCP_URL,
});

server.tool("mrone_health", {
  description:
    "Return the MR.ONE MCP runtime contract and the active integration boundaries.",
  parameters: z.object({}),
  execute: async () => ({
    status: "ok",
    service: "MR.ONE Production",
    runtime: "mcp-use",
    transportEndpoint: "/mcp",
    boundaries: {
      github: "source",
      manufact: "mcp-runtime",
      cloudinary: "media-storage",
      buffer: "publishing-adapter",
    },
    consequentialActions: "approval-gated",
  }),
});

server.tool("mrone_create_job", {
  description:
    "Create a production job record in the MR.ONE orchestration boundary. This does not publish or call external providers.",
  parameters: z.object({
    title: z.string().min(1).describe("Human-readable production job title"),
    candidateId: z.string().optional().describe("Optional Discovery Candidate ID"),
    priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  }),
  execute: async ({ title, candidateId, priority }) => ({
    jobId: `JOB-${Date.now()}`,
    title,
    candidateId: candidateId || null,
    priority,
    state: "DRAFT" as const,
    approvalRequired: true,
    externalActionExecuted: false,
  }),
});

server.tool("mrone_next_state", {
  description:
    "Validate the next controlled workflow state for a job without executing any external action.",
  parameters: z.object({
    state: z.enum(states as [JobState, ...JobState[]]),
  }),
  execute: async ({ state }) => ({
    state,
    nextState: nextState[state],
    terminal: nextState[state] === null,
    approvalRequired: state === "APPROVED" || state === "QUEUED",
  }),
});

server.tool("mrone_approval_check", {
  description:
    "Evaluate whether a consequential production or publishing action is allowed by the MR.ONE Approval Gateway.",
  parameters: z.object({
    state: z.enum(states as [JobState, ...JobState[]]),
    action: z.enum(["PRODUCE", "UPLOAD", "QUEUE", "PUBLISH"]),
    approved: z.boolean(),
  }),
  execute: async ({ state, action, approved }) => ({
    allowed: approved && state === "APPROVED",
    action,
    state,
    reason:
      approved && state === "APPROVED"
        ? "Approval Gateway permits the requested consequential action."
        : "Blocked: explicit approval and APPROVED workflow state are required.",
  }),
});

server.tool("mrone_registry", {
  description:
    "Return the current provider adapter boundaries. This tool does not invoke those providers.",
  parameters: z.object({}),
  execute: async () => ({
    adapters: {
      storage: { provider: "Cloudinary", role: "media-storage-only", connected: false },
      publishing: { provider: "Buffer", role: "publishing-adapter", connected: false },
    },
    source: { provider: "GitHub", role: "source-code", connected: true },
    runtime: { provider: "Manufact", role: "MCP-orchestration", connected: true },
  }),
});

server.tool("mrone_audit_event", {
  description:
    "Create a structured audit event payload for MR.ONE history. Persistence is intentionally not wired to an external database in this stage.",
  parameters: z.object({
    jobId: z.string().min(1),
    event: z.string().min(1),
    actor: z.string().default("MR.ONE"),
    metadata: z.record(z.string(), z.string()).default({}),
  }),
  execute: async ({ jobId, event, actor, metadata }) => ({
    auditId: `AUD-${Date.now()}`,
    jobId,
    event,
    actor,
    metadata,
    timestamp: new Date().toISOString(),
    persisted: false,
  }),
});

server.listen(port);
