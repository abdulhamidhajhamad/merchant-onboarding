# Architecture Documentation - Merchant Onboarding System

## Request-flow diagram

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant APIGW as API Gateway (HTTPS)
  participant Lambda as Lambda / NestJS<br/>TimeoutInterceptor 35s<br/>MaskSensitiveDataInterceptor
  participant Zod as ZodValidationPipe<br/>(request boundary)
  participant Svc as Controllers / Services
  participant AI as EVALUATION_AI_CLIENT<br/>(MockEvaluationAiClient today)
  participant DDB as DynamoDB<br/>(applications metadata)
  participant S3 as S3 documents bucket<br/>(SSE-AES256)

  Client->>APIGW: HTTP API request (JSON ≤ 50kb)
  APIGW->>Lambda: proxy → serverless-express

  Note over Lambda: Global interceptors wrap the handler<br/>timeout → 408; responses masked on the way out

  Lambda->>Zod: Validate body / UUID params (where applied)
  alt Validation failure
    Zod-->>Client: 400 Bad Request
  end

  Zod->>Svc: Validated DTO

  alt Classify / evaluate
    Svc->>AI: classifyBusiness / extractStatementMetrics
    AI-->>Svc: candidates / extracted metrics
    Svc->>DDB: updateMcc / updateEvaluation (OCC)
  else Application / document metadata
    Svc->>DDB: create / updateApplicant / updateBusiness / upsertDocument / submit
  else Presign document upload
    Svc->>DDB: upsert document metadata (REQUESTED → UPLOADING)
    Svc-->>Client: pre-signed PutObject URL
    Client->>S3: PUT binary directly (bypasses Lambda)
    Client->>Svc: POST .../complete (checksum)
    Svc->>DDB: mark RECEIVED (idempotent on same checksum)
  end

  alt OCC conditional check exhausted
    DDB-->>Client: 409 Conflict
  else Resource missing
    Svc-->>Client: 404 Not Found
  else Handler exceeds 35s budget
    Lambda-->>Client: 408 Request Timeout
  else Success
    Lambda-->>Client: 2xx (masked response body)
  end
```

Short read: metadata and evaluation state always go through API Gateway → Lambda → DynamoDB. Document **bytes** use a pre-signed S3 path that never enters Lambda. AI calls stay behind the `EVALUATION_AI_CLIENT` interface so the mock adapter can be replaced without changing controllers. Failures map to **400** (validation), **404** (missing), **409** (OCC), and **408** (35s interceptor / Lambda budget).

---

## 1. Request Flow (End-to-End)
- API Gateway / Lambda Integration: Incoming HTTP requests hit AWS API Gateway, proxying directly to AWS Lambda via @codegenie/serverless-express.
- NestJS Routing & Middleware: Zod validation pipes (and UUID param pipes on document routes) validate payloads at the HTTP boundary; global `TimeoutInterceptor` (35s) and `MaskSensitiveDataInterceptor` wrap responses.
- Service Layer Execution: Controllers delegate tasks to dedicated services enforcing business invariants and locking rules.
- AI / evaluation: `EvaluationService` calls `EvaluationAiClient` (`EVALUATION_AI_CLIENT`); the default binding is `MockEvaluationAiClient` (keyword matching). Catalog lookup + `RiskPolicyService` produce the persisted MCC/risk result—not a hardcoded MCC.
- Persistence Layer: State changes persist into Amazon DynamoDB with version-based locking (`ApplicationRepository`).

## 2. S3 Document Upload Path
- Presigned URL Generation: Client requests a secure upload URL for specific document types (`POST .../documents/presign`).
- Direct Binary Transfer: Client uploads files directly to Amazon S3, avoiding Lambda payload limits (6MB).
- Metadata Synchronization: Document metadata is registered within the application record in DynamoDB; `complete` confirms checksum and moves lifecycle toward `RECEIVED`.

## 3. DynamoDB State & Optimistic Concurrency Control (OCC)
- Version Tracking: Every application record includes an explicit version attribute initialized at 1.
- Conditional Writes: State-mutating operations enforce ConditionExpression: attribute_exists(id) AND version = :currentVersion.
- Automatic Retry Backoff: Concurrent modifications trigger automatic exponential backoff retries before throwing ConflictException.

## 4. Timeouts & Retries
- Application budget: Global `TimeoutInterceptor(35000)` returns HTTP 408 before the hard 45s assessment limit.
- Lambda Function Timeout: Configured to **35 seconds** in `serverless.yml` (`provider.timeout: 35`), aligned with the interceptor.
- API Gateway: REST API integrations are still subject to AWS API Gateway’s maximum integration timeout (~29s on classic REST); design handlers to finish well under that shared ceiling.
- Database Retries: Handled transparently at repository level with randomized backoff intervals.

## 5. Failure States & Error Handling
- Validation Failures (400 Bad Request): Triggered on Zod schema validation errors (and invalid UUID path params on document routes).
- Concurrency Failures (409 Conflict): Triggered on locked applications or exhausted OCC retries.
- Resource Not Found (404 Not Found): Triggered on non-existent application/document/MCC IDs.
- Request Timeout (408): Triggered when a handler exceeds the 35s `TimeoutInterceptor` budget (e.g. hanging AI/dependency).
