import { MCPServer } from "mcp-use";
import { z } from "zod";

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

const states = [
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
] as const;

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

const server = new MCPServer({
  name: "mr-one-production",
  title: "MR.ONE Production",
  version: "0.2.0",
  description:
    "MR.ONE production orchestration layer for Manufact: jobs, workflow state, approval boundary, registry metadata, and audit events.",
});

server.tool(
  {
    name: "mrone-health",
    title: "MR.ONE Health",
    description:
      "Return the MR.ONE MCP runtime contract and active integration boundaries.",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: "MR.ONE MCP runtime is ready.",
      },
    ],
    structuredContent: {
      status: "ok",
      service: "MR.ONE Production",
      runtime: "mcp-use-v2",
      boundaries: {
        github: "source",
        manufact: "mcp-runtime",
        cloudinary: "media-storage",
        buffer: "publishing-adapter",
      },
      consequentialActions: "approval-gated",
    },
  }),
);

server.tool(
  {
    name: "mrone-create-job",
    title: "Create MR.ONE Job",
    description:
      "Create a production job record. This does not publish or call external providers.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Human-readable production job title"),
      candidateId: z.string().optional().describe("Optional Discovery Candidate ID"),
      priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ title, candidateId, priority }) => {
    const jobId = `JOB-${Date.now()}`;
    return {
      content: [
        {
          type: "text" as const,
          text: `Created ${jobId} in DRAFT state.`,
        },
      ],
      structuredContent: {
        jobId,
        title,
        candidateId: candidateId ?? null,
        priority,
        state: "DRAFT" as const,
        approvalRequired: true,
        externalActionExecuted: false,
      },
    };
  },
);

server.tool(
  {
    name: "mrone-next-state",
    title: "Validate Next Workflow State",
    description:
      "Validate the next controlled workflow state without executing an external action.",
    inputSchema: z.object({
      state: z.enum(states),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ state }) => ({
    content: [
      {
        type: "text" as const,
        text: nextState[state] ? `${state} → ${nextState[state]}` : `${state} is terminal`,
      },
    ],
    structuredContent: {
      state,
      nextState: nextState[state],
      terminal: nextState[state] === null,
      approvalRequired: state === "APPROVED" || state === "QUEUED",
    },
  }),
);

server.tool(
  {
    name: "mrone-approval-check",
    title: "MR.ONE Approval Gateway",
    description:
      "Evaluate whether a consequential production or publishing action is allowed by the MR.ONE Approval Gateway.",
    inputSchema: z.object({
      state: z.enum(states),
      action: z.enum(["PRODUCE", "UPLOAD", "QUEUE", "PUBLISH"]),
      approved: z.boolean(),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ state, action, approved }) => {
    const allowed = approved && state === "APPROVED";
    return {
      content: [
        {
          type: "text" as const,
          text: allowed
            ? `Allowed: ${action}`
            : "Blocked: explicit approval and APPROVED workflow state are required.",
        },
      ],
      structuredContent: {
        allowed,
        action,
        state,
        reason: allowed
          ? "Approval Gateway permits the requested consequential action."
          : "Blocked until the job is APPROVED and explicitly approved.",
      },
    };
  },
);

server.tool(
  {
    name: "mrone-registry",
    title: "MR.ONE Provider Registry",
    description:
      "Return provider adapter boundaries. This tool does not invoke providers.",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: "MR.ONE provider boundaries are defined; external adapters are not invoked by this foundation.",
      },
    ],
    structuredContent: {
      adapters: {
        storage: { provider: "Cloudinary", role: "media-storage-only", connected: false },
        publishing: { provider: "Buffer", role: "publishing-adapter", connected: false },
      },
      source: { provider: "GitHub", role: "source-code", connected: true },
      runtime: { provider: "Manufact", role: "MCP-orchestration", connected: true },
    },
  }),
);

server.tool(
  {
    name: "mrone-audit-event",
    title: "MR.ONE Audit Event",
    description:
      "Create a structured audit event payload. External persistence is intentionally not wired at this stage.",
    inputSchema: z.object({
      jobId: z.string().min(1),
      event: z.string().min(1),
      actor: z.string().default("MR.ONE"),
      metadata: z.record(z.string(), z.string()).default({}),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ jobId, event, actor, metadata }) => ({
    content: [
      {
        type: "text" as const,
        text: `Audit event created for ${jobId}: ${event}`,
      },
    ],
    structuredContent: {
      auditId: `AUD-${Date.now()}`,
      jobId,
      event,
      actor,
      metadata,
      timestamp: new Date().toISOString(),
      persisted: false,
    },
  }),
);

export default server;
