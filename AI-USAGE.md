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

### Step 2: Data Models & Zod Schemas
- **Goal:** Define strict Zod validation schemas for Applicant, Business, Document, and MCC models.
- **Prompt Provided:**
  > "Implement Data Models and Zod Schemas for the merchant onboarding layer in src/common/schemas... Create applicant, business, document, and mcc schemas with strict enums and types."
- **My Adjustments & Verification:**
  - Reviewed generated Zod schemas to ensure sensitive fields use masked identifiers and proper document lifecycles are enforced.
  - Verified type exports using `tsc --noEmit`.

---

