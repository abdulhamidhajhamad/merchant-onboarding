# Architecture Documentation - Merchant Onboarding System

## 1. Request Flow (End-to-End)
- API Gateway / Lambda Integration: Incoming HTTP requests hit AWS API Gateway, proxying directly to AWS Lambda via @codegenie/serverless-express.
- NestJS Routing & Middleware: Validation pipes and security filters validate payloads via strict Zod schemas.
- Service Layer Execution: Controllers delegate tasks to dedicated services enforcing business invariants and locking rules.
- Persistence Layer: State changes persist into Amazon DynamoDB with version-based locking.

## 2. S3 Document Upload Path
- Presigned URL Generation: Client requests a secure upload URL for specific document types.
- Direct Binary Transfer: Client uploads files directly to Amazon S3, avoiding Lambda payload limits (6MB).
- Metadata Synchronization: Document metadata is registered within the application record in DynamoDB.

## 3. DynamoDB State & Optimistic Concurrency Control (OCC)
- Version Tracking: Every application record includes an explicit version attribute initialized at 1.
- Conditional Writes: State-mutating operations enforce ConditionExpression: attribute_exists(id) AND version = :currentVersion.
- Automatic Retry Backoff: Concurrent modifications trigger automatic exponential backoff retries before throwing ConflictException.

## 4. Timeouts & Retries
- API Gateway Timeout: Hard-capped at 29 seconds.
- Lambda Function Timeout: Configured to 30 seconds inside serverless.yml.
- Database Retries: Handled transparently at repository level with randomized backoff intervals.

## 5. Failure States & Error Handling
- Validation Failures (400 Bad Request): Triggered on Zod schema validation errors.
- Concurrency Failures (409 Conflict): Triggered on locked applications or exhausted OCC retries.
- Resource Not Found (404 Not Found): Triggered on non-existent IDs.