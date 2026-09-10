# Merchant Onboarding Service

Serverless NestJS API for **merchant onboarding intake and underwriting support**: create draft applications, capture applicant/business profiles, collect documents via S3 pre-signed uploads, propose MCC codes with risk policy tags, and evaluate processing-statement metrics before locking a submission snapshot.

**Important boundary:** this service is an onboarding and underwriting-*support* prototype. It is **not** a final KYC, credit-decision, or sanctions/screening system. Those outcomes require integration with real identity, compliance, and risk providers; until then, classification and statement analysis run against a swappable mock AI adapter and deterministic local policy rules.

## Why Serverless / AWS Lambda-only

This stack is intentionally Lambda-first rather than an always-on Nest process:

- **No idle compute.** The API scales per request and to zero when idle, which fits bursty onboarding traffic and keeps cost proportional to use.
- **Explicit timeout headroom.** The assessment hard limit is **45 seconds**. Production Lambda timeout in `serverless.yml` is **35s**, and a global `TimeoutInterceptor` enforces the same **35-second** in-process budget so handlers fail cleanly (HTTP 408) before the platform kills the invocation—leaving room for cleanup and response serialization.
- **Documents bypass Lambda.** Clients upload binaries **directly to S3** with pre-signed URLs. That avoids Lambda’s payload size limits and keeps large-file transfers off the request path that is subject to the timeout budget.
- **Full request-flow detail** (API Gateway → Lambda → Nest → DynamoDB/S3, OCC retries, upload path) lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md)—this README summarizes the *why*; that doc covers the *how*.

## Tech Stack

- **Framework:** NestJS modular monolith (`src/modules/*`)
- **Runtime / deploy:** AWS Lambda via `@codegenie/serverless-express` + Serverless Framework (`serverless offline` for local)
- **Database:** Amazon DynamoDB with optimistic concurrency control (versioned conditional writes + retry)
- **Storage:** Amazon S3 pre-signed upload URLs; document metadata stored on the application record
- **Validation:** Zod schemas at API boundaries (`ZodValidationPipe` / `safeParse`), plus defense-in-depth checks in services
- **MCC / AI evaluation:** Catalog-backed MCC lookup + `RiskPolicyService`; classification/statement extraction via `EvaluationAiClient` behind the `EVALUATION_AI_CLIENT` DI token (currently `MockEvaluationAiClient`, keyword-based, swappable)
- **Testing:** Jest unit suites under `src/` and an e2e suite under `test/`

## Project Structure

```text
src/
  common/                 # Shared Zod schemas, pipes, interceptors (timeout, PII masking)
  modules/
    application/          # Application CRUD, applicant/business updates, submit lock
    document/             # Presign + complete upload; S3 client wrapper
    evaluation/           # Classify / evaluate / get evaluation; AI adapter + risk policy
    mcc/                  # MCC catalog load/search; seed script + JSON dataset
    database/             # DynamoDB client + ApplicationRepository (OCC helpers)
    health/               # Liveness: GET /health
  main.ts / lambda.ts     # Local Nest bootstrap vs Lambda handler
test/                     # E2E integration & reliability tests
```

## API Reference

Interactive OpenAPI UI: **`/docs`** (Swagger). Routes below are taken from the Nest controllers.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/applications` | Create a new draft application |
| `GET` | `/applications/:id` | Fetch application state by id |
| `PATCH` | `/applications/:id/applicant` | Upsert the single applicant profile (Zod-validated) |
| `PATCH` | `/applications/:id/business` | Upsert business profile (Zod-validated) |
| `POST` | `/applications/:id/submit` | Validate completeness, lock status to `SUBMITTED`, persist snapshot |
| `POST` | `/applications/:id/documents/presign` | Request S3 pre-signed upload URL + document metadata |
| `POST` | `/applications/:id/documents/presigned-url` | Legacy alias of `presign` (same behavior) |
| `POST` | `/applications/:id/documents/:documentId/complete` | Confirm upload + SHA-256 checksum; move lifecycle toward `RECEIVED` |
| `GET` | `/mcc` | List or search MCC catalog (`?query=` / `?q=`) |
| `GET` | `/mcc/:code` | Lookup a single MCC by code |
| `POST` | `/applications/classify` | Stateless MCC classification from a business description |
| `POST` | `/applications/:id/classify` | Classify and persist `mcc` + evaluation on the application |
| `POST` | `/applications/evaluate` | Stateless processing-statement metrics + risk signals |
| `POST` | `/applications/:id/evaluate` | Evaluate statement and persist evaluation record |
| `GET` | `/applications/:id/evaluation` | Read stored evaluation (or `PENDING` if none) |
| `GET` | `/health` | Health check |

## Local Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

```bash
cp .env.example .env
```

`.env.example` includes `PORT`, `AWS_REGION`, local DynamoDB/S3 endpoints, and `APPLICATIONS_TABLE`.

3. **Refresh MCC seed cache** (optional but recommended after catalog changes)

```bash
npm run seed:mcc
```

4. **Run locally**

```bash
npm run sls:offline
# or Nest watch mode:
npm run start:dev
```

5. **Tests**

```bash
npm run test:unit
npm run test:e2e
```

## Testing

| Command | What it covers |
|---------|----------------|
| `npm run test:unit` | Module unit tests: application service, evaluation service (AI + persistence wiring), MCC catalog/search, document Zod request schemas, `TimeoutInterceptor` isolation |
| `npm run test:e2e` | HTTP lifecycle against Nest: health, classify/evaluate, create/submit, **server-side 408** timeout behavior (short-budget app), document boundary 400s |
| `npm run test:cov` | Same Jest unit run with coverage under `coverage/` |

E2E uses mocked DynamoDB/S3 collaborators where needed; the reliability section asserts a real HTTP **408** from `TimeoutInterceptor` (not a client-side socket timeout).

## Deployment

Deploy / remove with Serverless Framework (Lambda timeout is **35s** in `serverless.yml`):

```bash
npx serverless deploy --stage prod
npx serverless remove --stage prod
```

## Assumptions

- Applications move through an incremental **DRAFT** workflow and are locked on **submit**.
- Document **bytes** go to S3; DynamoDB holds metadata and lifecycle status only.
- One **primary applicant** record is written per application (`PATCH .../applicant`). Business payloads may list `beneficialOwners` as lightweight references, but there is no multi-person applicant API yet.
- MCC proposals combine catalog data + `RiskPolicyService`; AI classification is adapter-backed and currently mock-driven.
- Submit expects required document types to be present in an accepted lifecycle state before locking.

## Known Gaps

Honest gaps relative to the **current** codebase (not historical stubs that have already been fixed):

- **Multi-owner / controlling persons:** only a single `applicant` field exists on the application record (`ApplicationRepository` / `updateApplicant`). Full multi-beneficial-owner capture as separate individuals (with dedicated endpoints) is **not** implemented—tracked as follow-up work.
- **AI providers:** classification and statement extraction use `MockEvaluationAiClient` behind `EVALUATION_AI_CLIENT`. Controllers and persistence do not need to change to swap in a real model/provider.
- **Post-upload document intelligence:** upload complete moves documents to `RECEIVED`; there is no OCR/async review pipeline advancing `PROCESSING` → `ACCEPTED` / `NEEDS_REVIEW` automatically (no EventBridge/webhook consumer in-repo).
- **Document type naming drift:** Zod document types use values such as `GOVT_ID` / `BUSINESS_REG`, while submit-time required-document checks still look for `GOVERNMENT_ID` / `BUSINESS_REGISTRATION`. Aligning those enums is remaining cleanup.

**Not gaps anymore (do not treat as unfinished):** expanded MCC catalog seeding, wiring of the AI adapter into `EvaluationService` with DynamoDB persistence of `mcc` / evaluation, Zod validation on document controller boundaries, and a real server-side timeout test.

## Further reading

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — request flow, S3 upload path, DynamoDB OCC, timeouts/retries
- [`SECURITY.md`](./SECURITY.md) — threat model, IAM, encryption, redaction, production hardening
- [`AI-USAGE.md`](./AI-USAGE.md) — development workflow and AI-assisted implementation log
