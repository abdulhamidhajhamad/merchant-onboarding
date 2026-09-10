# AI Usage Report

## Tools & Setup
- **Gemini 3.8:** Used for architectural design, requirement breakdown, and prompt engineering.
- **OpenCode Agent:** Used for local workspace code generation and file execution.

---

## Workflow & Prompt Log

### Step 1: Project Initialization & Serverless Setup
- **Goal:** Set up a clean NestJS project configured for AWS Lambda via Serverless Framework with offline emulation (DynamoDB & S3) without using Docker.
- **Prompt Provided:**
  > "Create a new Node.js TypeScript project using NestJS, configured for AWS Lambda deployment using Serverless Framework and serverless-offline for local testing... Important Naming Constraint: Use only generic product naming ('merchant-onboarding') across package.json, configs, service names, and descriptions. Absolutely do not include words like 'assessment', 'test', or company names."
- **My Adjustments & Verification:**
  - Enforced generic project naming (`merchant-onboarding`).
  - Strict zero-Docker requirement applied, switching to native serverless offline plugins.
  - Verified local setup by starting `serverless offline` and hitting `GET /health`.


---
### Step 1.1: Refactoring to Enterprise NestJS Architecture
- **Goal:** Restructure `src/` directory to move health checks into a dedicated `src/modules/health` module and keep the root clean.
- **Action:** Created isolated refactor branch via OpenCode, committed modular layout changes, merged into `main`, and pushed.
- **Verification:** Clean build compilation (`npm run build`) and verified project tree structure.

### Step 2: Strict Zod Domain Schemas & Contracts
- **Goal:** Establish strict runtime input validation and TypeScript types for Applicant, Business, Document lifecycles, and MCC entities under `src/common/schemas`.
- **Action:** Generated modular Zod schemas using Gemini 3.8 architecture prompts and OpenCode agent.
- **My Refinement & Verification:** Verified `z.infer` type exports, masked ID metadata fields, document status lifecycle transitions, and verified clean TypeScript compilation (`npm run build`).

---

### Step 3: DynamoDB Repository Layer & Optimistic Concurrency
- **Goal:** Implement data access layer for applications using AWS SDK v3 with state preservation and optimistic concurrency control.
- **Action:** Created `src/modules/database` containing `DynamoService`, `ApplicationRepository`, and `DatabaseModule`.
- **My Refinement & Verification:** Verified `ConditionExpression` logic for version incrementing (`version = :currentVersion`), failure handling mapped to NestJS `ConflictException`, and confirmed clean compilation (`npm run build`).

---

### Step 4: Direct-to-S3 Presigned Uploads & Document Lifecycle
- **Goal:** Implement direct document upload workflow via S3 Presigned URLs and manage document lifecycle metadata.
- **Action:** Created `src/modules/document` (`S3Service`, `DocumentService`, `DocumentController`, `DocumentModule`).
- **My Refinement & Verification:** Mapped `lifecycleStatus` types from Zod schemas, set up S3 local fallback parameters, and confirmed successful TypeScript compilation (`npm run build`).

---

### Step 5: MCC Catalog & Risk Classification Service
- **Goal:** Provide Merchant Category Code (MCC) lookup and risk policy tagging for onboarding intake workflows.
- **Action:** Created `src/modules/mcc` (`MccService`, `MccController`, `MccModule`) featuring catalog search and risk tag evaluation.
- **My Refinement & Verification:** Verified search filter execution for code/description/category and confirmed clean compilation (`npm run build`).

---

### Step 6: Application Lifecycle Management
- **Goal:** Expose RESTful endpoints for application creation, state retrieval (Save & Resume), and optimistic profile patches.
- **Prompts Used:** `"Implement ApplicationModule with endpoints for POST /applications, GET /applications/:id, PATCH /applications/:id/applicant, and PATCH /applications/:id/business."`
- **Actions & Verification:**
  - Constructed `ApplicationService` and `ApplicationController` under `src/modules/application`.
  - Wired all modules together into `AppModule`.
  - Conducted final full build verification (`npm run build`).

  ---

### Step 7: 45-Second Reliability & Timeout Safeguards
- **Goal:** Enforce hard 45-second execution limits and protect Lambda execution from downstream hanging dependencies.
- **Prompts Used:** `"Implement a global NestJS Interceptor that cuts requests at 35 seconds with a 504 Request Timeout, and configure serverless.yml execution timeout bounds."`
- **Actions & Verification:**
  - Implemented `TimeoutInterceptor` using RxJS `timeout` operator under `src/common/interceptors`.
  - Registered the interceptor globally in `src/main.ts`.
  - Configured `timeout: 35` bound in `serverless.yml`.
  - Verified clean TypeScript compilation (`npm run build`).

  ---

### Step 8: Document Completion & Application Submission Lifecycle
- **Goal:** Complete document lifecycle transitions (upload confirmation) and provide a locked, validated application submission producing a normalized review payload.
- **Prompts Used:** `"Implement POST /applications/:id/documents/:docId/complete and POST /applications/:id/submit with required field validation, OCC version locking, and normalized payload generation."`
- **Actions & Verification:**
  - Added `completeUpload` method to `DocumentService` and exposed `POST /applications/:id/documents/:docId/complete` endpoint with Swagger documentation.
  - Added `submitApplication` method to `ApplicationService` to validate completeness (applicant and business details), lock state to `SUBMITTED`, and yield normalized underwriting payload[cite: 1].

  ---

### Step 8.1: Manual Bug Fixes & Type Definitions Refactoring
- **Goal:** Resolve TypeScript compilation errors occurring during `npm run build` after adding new submission endpoints.
- **Actions Taken Manually:**
  - Fixed missing Swagger decorator imports (`ApiOperation`, `ApiResponse`) in `DocumentController`.
  - Updated `ApplicationItem` interface in `application.repository.ts` to include optional properties (`mcc`, `documents`) for strict type safety.
  - Resolved dynamic property access errors in `ApplicationService`.
  - Re-compiled project successfully (`npm run build`) with 0 errors.

  ---

### Step 9: AI-Assisted Evaluation & Risk Classification Module
- **Goal:** Implement AI classification for MCC suggestions and statement evaluation with strict separation between deterministic financial metrics and explainable risk signals.
- **Prompts Used:** `"Create EvaluationModule providing POST /applications/classify for MCC matching and POST /applications/evaluate for statement analysis with deterministic effective rate calculations."`
- **Actions & Verification:**
  - Implemented `EvaluationService` providing MCC proposal logic (`classifyBusiness`) and statement analysis (`evaluateStatement`).
  - Added `POST /applications/classify` and `POST /applications/evaluate` controllers with complete Swagger metadata.
  - Separated deterministic calculation (effective processing rate) from explainable AI risk signals (`HIGH_CNP_RATIO`).
  - Integrated `EvaluationModule` into `AppModule` and verified clean build (`npm run build`).

  ### Step 10: E2E Integration Testing & Reliability Verification
- **Goal:** Implement end-to-end integration tests (`test/onboarding-e2e.spec.ts`) validating health checks, MCC classifications, financial rate evaluations, and full application lifecycles.
- **Prompts & Fixes Applied:**
  - Resolved `CredentialsProviderError` and `AggregateError` during local test execution by stubbing AWS SDK environment variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
  - Implemented Jest function spies (`jest.spyOn`) on `ApplicationRepository` and `S3Service` to completely decouple E2E test execution from external AWS/DynamoDB resources.
  - Aligned mock return interfaces strictly with NestJS domain types (matching `{ presignedUrl, key }` contracts for S3 signed URLs).
- **Actions & Verification:**
  - Standardized assertion checks for status endpoints (normalizing string responses via `.toLowerCase()`).
  - Executed `npm run test:e2e` successfully, verifying all E2E test scenarios passed (`5 passed, 5 total`).

  ---

### Step 11: Security Hardening, Document Validation & Lifecycle Refactoring
- **Goal:** Address compliance gaps by implementing global sensitive data masking (PII/PCI), strict document upload validation (MIME/size), persistence of integrity metadata (SHA-256), and deterministic document lifecycle state transitions.
- **Prompts & Strategy:**
  - Designed and implemented a custom NestJS interceptor (`MaskSensitiveDataInterceptor`) to automatically sanitize outbound HTTP payloads and log streams without installing third-party dependencies.
  - Hardened document upload logic in `DocumentService` to enforce an absolute 10 MB limit and restrict MIME types to allowed formats (`application/pdf`, `image/jpeg`, `image/png`).
  - Updated `ApplicationRepository` to support idempotent storage of document completion metadata (`sha256Checksum`, `uploadedAt`).
  - Refactored `DocumentService` to enforce strict state machine transitions (`REQUESTED` -> `UPLOADING` -> `RECEIVED` -> `PROCESSING` -> `ACCEPTED` / `NEEDS_REVIEW` / `REJECTED`) with explicit `BadRequestException` guards against illegal jumps.
- **My Refinement & Verification:**
  - Registered `MaskSensitiveDataInterceptor` globally in `src/main.ts`.
  - Applied sanitization logic within `ApplicationService` to ensure raw applicant/business payloads are masked upon application submission.
  - Verified compilation via `npm run build` (0 errors).
  - Executed full E2E test suite via `npm run test:e2e -- --runInBand` with all 5 integration suites passing (100% success rate).

  ---

### Step 12: Data Contract Compliance Refactoring (Sections 3.1 & 3.2)
- **Goal:** Resolve compliance gaps by aligning `Applicant` and `Business` schemas strictly with Sections 3.1 & 3.2 data contract specifications, resolving naming mismatches, missing nested structures, and loose persistence typing.
- **Prompts & Strategy:**
  - Performed an automated system topology trace to generate a pre-remediation impact ledger across DTOs, Services, Repositories, and E2E Test suites.
  - Refactored `applicant.schema.ts` and `business.schema.ts` to enforce strictly typed field renames (`firstName`, `addressLine1`, `legalName`, `dba`, `accountNumberMasked`), updated legal entity enums (`SOLE_PROPRIETORSHIP`, `NON_PROFIT`), and added missing schemas (`beneficialOwners`, `processingHistory`).
  - Updated `attestation` payload requirements to strictly enforce `termsAccepted: boolean` and ISO timestamp `consentedAt`.
  - Replaced loose `Record<string, any>` types in `ApplicationRepository` with concrete domain entities (`Applicant`, `Business`) to prevent persistence data drift.
  - Remediated mock JSON objects, DTO type inferences, and HTTP test payloads in `test/onboarding-e2e.spec.ts` to reflect updated schema contracts.
- **My Refinement & Verification:**
  - Verified clean TypeScript project compilation via `npm run build` with 0 errors.
  - Executed unit test and E2E integration test suites via `npm run test` and `npm run test:e2e` to confirm 100% test pass rates without validation regressions.

  ---

### Step 13: Production-Ready AI-Assisted Evaluation Layer & Zero-Trust Hardening
- **Goal:** Upgrade the `EvaluationModule` from a static stub into a production-ready, zero-trust evaluation architecture matching Section 3.3 acceptance criteria without external API dependencies.
- **Prompts & Strategy:**
  - Designed a decoupled `EvaluationAiClient` interface and implemented a dynamic `MockEvaluationAiClient` capable of processing real merchant attributes (`salesChannel`, `fulfillmentModel`, `cardMetrics`) to return contextual, rule-driven evaluations.
  - Implemented strict zero-trust input/output validation in `evaluation.schema.ts` using Zod schemas (`.safeParse()`) to guarantee malformed AI/mock JSON payloads never cause unhandled server crashes.
  - Isolated deterministic financial calculations (e.g., effective processing rate formula `totalFees / monthlyVolume * 100`) into pure, strongly-typed utility functions to eliminate AI hallucination risks.
  - Built an explainable risk engine that populates explicit field-level source citations (`sourceField` and `documentType`) for every generated warning or mismatch (e.g., MCC vs. description discrepancies).
  - Hardened `EvaluationController` endpoints by replacing loose `any` body objects with strictly-typed DTOs validated via Zod pipes.
- **My Refinement & Verification:**
  - Verified clean TypeScript compilation (`npm run build`) with zero type errors.
  - Executed end-to-end test suite (`npm run test:e2e`) to confirm full system compatibility and regression-free operation.

  ---

### Step 14: API Surface Contract Alignment, Route Normalization & Submit-Locking Semantics
- **Goal:** Achieve 100% specification compliance by eliminating contract drift across REST endpoints, enforcing application-scoped evaluation routes, implementing strict Zod DTO runtime validation, and securing submitted applications against post-submission modifications.
- **Prompts & Strategy:**
  - Audited full project controllers, services, and repositories against the 11 target API behaviors to identify and remediate path/query mismatches.
  - Re-aligned document upload endpoint path to exact spec: `POST /applications/:id/documents/presign`, and updated MCC catalog query filter from `?q=` to `?query=`.
  - Re-architected evaluation and classification endpoints to operate under application-scoped resource routes: `POST /applications/:id/classify`, `POST /applications/:id/evaluate`, and implemented missing state retrieval route `GET /applications/:id/evaluation`.
  - Hardened `POST /applications/:id/submit` by enforcing Zod runtime schema validation across applicant and business payloads, transitioning database status to `SUBMITTED`, and capturing an immutable submission review snapshot.
  - Implemented an immutability guard across `PATCH /applications/:id/applicant` and `PATCH /applications/:id/business` that returns `409 ConflictException` if modification is attempted on a locked/submitted application.
  - Replaced loose controller body interfaces with strict Zod validation pipes to reject untrusted client payloads early.
- **My Refinement & Verification:**
  - Updated application repository methods to support per-application evaluation persistence and status state locking.
  - Verified clean TypeScript compilation (`npm run build`) with zero type errors.
  - Executed end-to-end integration tests (`npm run test:e2e`) confirming 100% compliance across all 11 endpoints and verifying post-submission immutability enforcement.


  ### Step 15: Security Controls, S3 Encryption & Section 10 Zero-Trust Hardening
- **Goal:** Perform a comprehensive security audit against Section 10 ("Security & Privacy Requirements") and eliminate vulnerability gaps through infrastructure-as-code hardening, least-privilege policies, and runtime payload safeguards.
- **Prompts & Strategy:**
  - Conducted a line-by-line static security audit of AWS configurations, NestJS bootstrap handlers, and S3 upload services.
  - Hardened S3 data persistence by injecting `ServerSideEncryption: 'AES256'` into `PutObjectCommand` inside `S3Service` to guarantee data encryption at rest for presigned URL uploads.
  - Re-architected `serverless.yml` to define explicit, least-privilege IAM statements (`iamRoleStatements`) restricting Lambda execution strictly to required DynamoDB actions (`GetItem`, `PutItem`, `UpdateItem`, `Query`) and S3 actions (`GetObject`, `PutObject`).
  - Configured AWS S3 bucket policies in IaC (`serverless.yml`) to enforce `PublicAccessBlockConfiguration` across all public ACL/policy flags and established S3 `LifecycleConfiguration` rules (90-day automatic expiration) to satisfy document retention and cleanup requirements.
  - Enforced HTTPS/TLS transport security bounds in `serverless.yml` (`apiGateway.https: true`).
  - Protected API boundary ingress against Denial of Service (DoS) oversized payload attacks by configuring strict Express body-parser size caps (`50kb`) in `main.ts`.
- **My Refinement & Verification:**
  - Re-verified entire source code to confirm absolute zero capture/storage of raw credit card PAN or CVV payloads.
  - Confirmed global execution of `MaskSensitiveDataInterceptor` to strip raw SSN, Tax ID, and bank account fields across API responses and log streams.
  - Verified clean TypeScript compilation (`npm run build`) with 0 errors.
  - Executed full E2E test suite (`npm run test:e2e`) confirming 100% pass rate with zero security regression.

  ---

### Step 16: Optimistic Concurrency Control & Repository Layer Refactoring
- **Goal:** Resolve parallel document upload conflicts (`409 Conflict` / `ConditionalCheckFailedException`), streamline state versioning across services, and eliminate dead DynamoDB primary key attributes.
- **Prompts & Strategy:**
  - Diagnosed `ConditionalCheckFailedException` errors occurring during concurrent/parallel document uploads (`Promise.all` in front-end workflows) caused by stale application versions.
  - Implemented an automated **Exponential Backoff & Jitter Retry** loop (`executeWithRetry`) directly within `ApplicationRepository` to resolve optimistic concurrency locks internally without exposing conflict errors to end users.
  - Refactored `DocumentService` and `ApplicationService` to eliminate manual `currentVersion` passing, offloading version resolution and retry mechanics entirely to the repository layer.
  - Cleaned up the database abstraction by removing dead schema attributes (`pk` and `sk`) from `ApplicationItem` and repository methods, bringing the model in line with single-table DynamoDB primary key requirements (`id`).
- **My Refinement & Verification:**
  - Verified clean TypeScript project compilation via `npm run build` with 0 errors.
  - Executed full E2E test suite (`npm run test:e2e`) confirming 100% pass rates with zero regression in application lifecycles and document upload state transitions.