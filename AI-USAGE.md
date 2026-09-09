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