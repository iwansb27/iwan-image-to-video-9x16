# MR.ONE CONTENT PRODUCTION HUB — MASTER HANDOFF BLUEPRINT

Status: MASTER / LOCKED
Purpose: single source-of-truth handoff for building and operating MR.ONE Content Production Hub.

## 1. System Identity

MR.ONE Content Production Hub = 1 Front Door -> 3 Production Consoles -> 1 Shared Production Engine -> Review -> Schedule Queue -> Publishing -> History / Analytics.

Principle: simple in front, complex behind.

## 2. Master Flow

User
-> Front Door
-> Console 1 Product/Affiliate OR Console 2 Film/Animation OR Console 3 News
-> Input Validation
-> Source Analysis
-> Metadata / Creative
-> Storyboard
-> AI Provider Router
-> Video Production
-> 9:16 normalization
-> Raw Preview / Review
-> Reset / Delete / Approve
-> Schedule Queue
-> Buffer
-> Supported channels
-> Published
-> History
-> Analytics

## 3. Console 1 — Product / Affiliate

Input: product screenshot + affiliate product link.

Flow:
Screenshot + Link -> validate source/type match -> source analysis -> title/description/category/CTA/affiliate link/metadata -> storyboard -> video -> 9:16 -> raw preview.

If screenshot and link do not represent the same product: STOP / REJECT. Do not continue production.

## 4. Console 2 — Film / Animation

Input: screenshot + film/animation link.

If link is readable, use it as source; otherwise use screenshot as source. Keep the original link attached to the job.

Flow:
Input -> link readability/source retrieval -> analysis -> metadata/creative -> storyboard -> video -> 9:16 -> raw preview.

## 5. Console 3 — News

Input: news screenshot + news link.

Flow:
Input -> source retrieval/analysis -> source validation -> title/description/category/summary/CTA/source link -> news creative -> storyboard -> video -> 9:16 -> raw preview.

Keep source link attached to the job.

## 6. Shared Production Engine

All three consoles use one production engine. Only input and console-specific validation differ.

Engine responsibilities:
- source analysis
- content classification
- metadata generation
- creative generation
- storyboard generation
- AI provider selection
- video generation
- 9:16 normalization
- asset registration
- preview
- review
- queue handoff

## 7. AI Provider Router

Architecture:
AI request -> primary provider/model -> fallback 1 -> fallback 2 -> controlled failure.

Free-first order:
FREE -> FREE LIMITED -> existing user provider -> paid provider only when explicitly allowed.

NVIDIA is the intended primary AI gateway when an appropriate hosted free/free-limited model exists.

Candidate routing:
Text: DeepSeek V4.1 Flash -> GLM-5-3 Flash -> GLM-5-3 -> Nemotron Ultra.
Vision: GLM-5-3 Flash -> DeepSeek V4.1 Flash -> Nemotron/Cosmos Reasoner.
Embedding: Nemotron 3 Embed 1B.
Video: Cosmos3 Nano -> IWAN Image-to-Video 9:16 -> alternative approved provider.

Candidate video models must be tested for duration, aspect ratio, format, quality, latency and actual capability before being treated as replacements.

Fallback attempts are real API calls and must be counted as such.

## 8. Gemini

Gemini is an additional provider, not a single point of dependency. User API keys remain secrets and are never pasted into chat.

## 9. Video Pipeline

Source -> analysis -> creative -> storyboard -> video provider -> raw video -> 9:16 normalization -> preview.

Target output: vertical 9:16 short-form video.

The existing IWAN Image-to-Video 9:16 GitHub project is a reference/source and must not be modified except when explicitly requested.

## 10. Review Center

Raw Preview:
[ RESET ] [ DELETE ] [ APPROVE ]

RESET: return the job to the appropriate production stage.
DELETE: remove the draft/job according to lifecycle rules.
APPROVE: move job to APPROVED and then Schedule Queue.

No publishing before approval.

## 11. Job State Machine

DRAFT -> VALIDATING -> ANALYZING -> STORYBOARDING -> PRODUCING -> READY_REVIEW.

READY_REVIEW:
- RESET -> production
- DELETE -> DELETED
- APPROVE -> APPROVED -> SCHEDULED -> SENT -> PUBLISHED

Any stage may enter FAILED.
FAILED -> retry/fallback/reset according to error class.

## 12. Catalyst Backend

Baseline backend: Catalyst by Zoho.

Project:
MR-ONE-CUSTOM-CONTENT-AFFILIATE
Project ID: 103656000000014050
Environment: Development
Organization ID: 939078380

Architecture:
MR.ONE -> Catalyst Web App / Functions / Datastore / Stratus / Scheduler / Auth as required / Logs.

API Gateway is NOT on the critical path and must not be activated merely because it exists.

Supabase is not used.
Convex is not the current baseline.

## 13. Database

Core tables:
- MR_Content_Jobs
- MR_Assets
- MR_Storyboards
- MR_Schedule_Queue
- MR_History

### MR_Content_Jobs
job_type, status, source_link, console, created_at, updated_at.

### MR_Assets
job_id, asset_type, storage_key, mime_type, status, expires_at.

### MR_Storyboards
job_id, version, content, provider, status.

### MR_Schedule_Queue
job_id, platform, scheduled_at, status, external_id, error_message.

### MR_History
job_id, event_type, platform, status, message, event_at.

Foreign-key relations from child tables point to MR_Content_Jobs.ROWID with ON-DELETE-SET-NULL.

## 14. Storage

Catalyst Stratus is the intended object storage.

Target bucket:
mr-one-content-assets

Use storage keys referenced by MR_Assets.

Temporary asset lifecycle:
upload -> process -> preview -> publish -> 24 hours -> cleanup.

Use expires_at for cleanup eligibility.

## 15. Backend Function

Created function:
mr_one_backend
Function ID: 103656000000026023
Stack: Node 24
Type: Basic I/O
Memory: 256 MB

Runtime GET invocation has been successfully tested.

Important completion rule: a function is not considered complete merely because the resource exists. It must be CREATED + CONFIGURED + EXECUTED + VERIFIED.

## 16. Secrets / Environment

Secrets stay server-side.

Expected variables include:
NVIDIA_API_KEY
GEMINI_API_KEY
BUFFER_ACCESS_TOKEN

Frontend must never expose provider secrets.

## 17. Scheduler

Scheduler has two primary jobs:

A. Publishing:
Schedule Queue -> scheduled_at -> scheduler -> Buffer -> channel.

B. Cleanup:
expires_at -> scheduler -> delete expired object -> update asset state -> history event.

## 18. Publishing / Buffer

Buffer is the intended publishing bridge.

Target channels:
Facebook, YouTube, TikTok, subject to actual API/channel availability verification.

Target flow:
MR.ONE -> Schedule Queue -> Buffer API -> discovered/selected channel -> publish.

Do not claim a channel is connected until the API integration is actually verified.

Desired channel discovery: use Buffer API capabilities to discover available channels and identify platform types where supported, avoiding manual channel IDs where the API allows it.

Publishing statuses:
PENDING, SCHEDULED, SENDING, SENT, PUBLISHED, FAILED.

Failures must record error_message and History.

## 19. History

History is the audit trail proving what happened to each job.

Events may include:
JOB_CREATED, SOURCE_VALIDATED, STORYBOARD_CREATED, VIDEO_GENERATED, REVIEW_READY, APPROVED, SCHEDULED, SENT, PUBLISHED, FAILED, RESET, DELETED.

## 20. Analytics

Analytics is downstream of publishing.

Potential metrics:
published count, failed count, scheduled count, views, engagement, clicks and other metrics exposed by connected platforms.

Analytics must not be confused with the production engine.

## 21. Security

User -> Frontend -> Backend -> Secret -> External API.

Never:
User -> Frontend -> exposed API key.

Apply:
- server-side secrets
- input validation
- source validation
- provider error handling
- audit/history
- controlled publishing
- authentication when required
- no secret exposure in frontend

## 22. Error Handling

Every processing stage should distinguish:
SUCCESS
FAILED
RETRYABLE
NON_RETRYABLE

Example:
NVIDIA primary timeout -> fallback 1 -> fallback 2 -> controlled failure.

Example:
product screenshot/link mismatch -> reject immediately.

Do not silently bypass validation or silently switch to paid services.

## 23. Frontend UX

User-facing flow:
INPUT -> PROCESSING -> PREVIEW -> APPROVE -> SCHEDULE.

Backend complexity remains hidden:
AI routing, fallback, database, storage keys, functions, scheduler, Buffer API, logs and cleanup.

## 24. Master Data Flow

USER
-> FRONT DOOR
-> PRODUCT / FILM-ANIMATION / NEWS
-> INPUT VALIDATION
-> SOURCE ANALYSIS
-> CONTENT METADATA
-> CREATIVE
-> STORYBOARD
-> AI ROUTER
-> VIDEO ENGINE
-> 9:16
-> STRATUS
-> RAW PREVIEW
-> RESET / DELETE / APPROVE
-> SCHEDULE QUEUE
-> BUFFER
-> SOCIAL CHANNEL
-> PUBLISHED
-> HISTORY
-> ANALYTICS

## 25. Technical Stack

Front Door: MR.ONE Web App
Backend: Catalyst by Zoho
Database: Catalyst Datastore
Storage: Catalyst Stratus
Functions: Catalyst Functions
Scheduler: Catalyst Job Scheduling
AI Gateway: NVIDIA API
Additional AI: Gemini / approved providers
Video: NVIDIA / IWAN Image-to-Video reference
Publishing: Buffer API
History: Catalyst Datastore
Analytics: Catalyst + platform APIs
API Gateway: not required on critical path
Supabase: not used
Convex: not current baseline
GitHub reference: source/reference, not to modify without explicit request

## 26. Stage Roadmap

00 Blueprint & Rules — COMPLETE
01 Catalyst Audit — COMPLETE
02 Full-Stack Foundation — ACTIVE
03 Front Door
04 Input & Matching
05 Console 1 — Product
06 Console 2 — Film/Animation
07 Console 3 — News
08 Shared Production Engine
09 NVIDIA Model Router
10 Gemini / Additional Providers
11 Video Production
12 Review Center
13 Temporary Asset Lifecycle
14 Schedule Queue
15 Buffer Integration
16 Publishing
17 History
18 Analytics
19 End-to-End Test
20 Hardening
21 Production Ready

## 27. Stage 02 Current Checkpoint

Completed:
- database tables
- schema/columns
- relations
- Stratus access
- mr_one_backend function
- runtime invocation test

Open:
- backend source code
- environment secrets
- scheduler
- web app
- end-to-end backend verification

Order:
backend -> scheduler -> frontend -> integrations -> E2E.

## 28. Completion Rule

A component is DONE only when:
CREATED + CONFIGURED + EXECUTED + VERIFIED.

Never mark a component complete merely because a resource exists.

## 29. Global MR.ONE Rules

1. Master Workspace Mr.One is the primary cross-session source of truth.
2. Do not modify or delete resources without explicit authorization.
3. Do not create a new project when the locked project is usable.
4. Free/zero-rupiah first.
5. Do not activate API Gateway unless later proven necessary.
6. Do not expose or request secrets through chat.
7. Verify connector capability before promising execution.
8. Do not claim a connection, deployment, publishing route or completion without an actual test.
9. Keep the three consoles behind one shared production engine.
10. Keep all content output standardized to 9:16.
11. Preserve the existing GitHub reference project unless the user explicitly asks for code changes.
12. One concrete human action at a time, only when the action cannot be performed through available tools.
13. At every meaningful checkpoint record CURRENT POSITION, TECHNICAL STATUS, OPERATIONAL STATUS, CONNECTOR/API STATUS, LOCKED DECISIONS, OPEN ISSUES, TEST RESULT, CHECK & BALANCE, NEXT EXACT STEP.

## 30. Current Check & Balance

CURRENT POSITION: Stage 02 — Full-Stack Foundation.

TECHNICAL STATUS: database + schema + relations + storage + function runtime exist and have been verified to the extent stated above.

OPERATIONAL STATUS: production workflow and publishing are not active.

CONNECTOR/API STATUS: Catalyst connector is active. Function runtime invocation succeeded. Some provisioning operations, notably direct Function creation and Web App creation, are not exposed as connector operations.

LOCKED DECISIONS: one front door, three consoles, one shared production engine, 9:16, free-first, NVIDIA-first routing, Gemini additional provider, Catalyst backend, Stratus storage, Buffer publishing bridge, no Supabase, no new project, API Gateway not critical path.

OPEN ISSUES: backend source code, environment secrets, scheduler, Web App, AI router, video pipeline, Buffer integration, E2E test.

TEST RESULT: mr_one_backend runtime GET invocation succeeded.

NEXT EXACT STEP: complete and verify the backend source code for mr_one_backend before moving to Web App or Buffer.
