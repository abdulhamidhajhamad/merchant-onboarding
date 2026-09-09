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