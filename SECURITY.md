# Security Notes

Threat, IAM, encryption, logging/redaction, and production-hardening notes for the merchant onboarding service. Claims below are tied to the current codebase and IaC—not aspirational controls unless labeled **production improvement**.

This service is an intake / underwriting-support layer. It is **not** authoritative KYC, credit decisioning, or sanctions screening; see the **Important boundary** in [`README.md`](./README.md).

---

## 1. Threat model / abuse considerations

### What this service mitigates today

| Abuse / failure mode | Mitigation in code / config |
|----------------------|-----------------------------|
| Oversized JSON bodies | Express body parsers limited to **`50kb`** in both `src/main.ts` and `src/lambda.ts` (`express.json({ limit: '50kb' })` and matching `urlencoded`). |
| Concurrent / duplicate state races | DynamoDB writes use OCC (`version` + `ConditionExpression`) with retry in `ApplicationRepository` (`executeWithRetry` / `updateWithConcurrencyControl`). |
| Duplicate document completion | `DocumentService.completeUpload` returns `idempotent: true` when the same SHA-256 is presented again, without advancing state twice. |
| Path / param manipulation on document routes | `DocumentController` uses Nest `ParseUUIDPipe` (UUID v4) on `:id` and `:documentId`, plus Zod request-body schemas (`presignRequestSchema` / `completeUploadRequestSchema`) via `ZodValidationPipe`. |
| Large binary upload DoS via Lambda | Binaries never transit the API—clients upload to S3 with pre-signed URLs (`S3Service.generatePresignedUploadUrl`). |

### Untrusted AI / adapter output

`EvaluationService` calls `EvaluationAiClient` (`EVALUATION_AI_CLIENT`) and uses `aiResult.candidates[0]` directly. Request bodies for classify/evaluate **are** Zod-validated at the controller, and persisted MCC payloads are validated with `mccSchema.parse(...)`, but **adapter responses are not currently run through `aiClassificationResultSchema` / related evaluation schemas before use**. A malicious or malformed provider response could therefore surface unexpected shapes until that gate is added.

**Production improvement:** validate every adapter response with `aiClassificationResultSchema` / statement metric schemas in `evaluation.schema.ts` before catalog lookup or persistence.

### Explicit non-goals (today)

- No authentication or authorization on any HTTP endpoint (open API surface in this prototype).
- No WAF, request signing, or mTLS to external processors.
- No claim of full PII taxonomy coverage—see logging section.

---

## 2. IAM approach

Lambda execution role statements in `serverless.yml` are intentionally narrow:

**DynamoDB** (resource: `ApplicationsTable.Arn` only):

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:Query`

**S3** (resource: `arn:aws:s3:::${MerchantDocumentsBucket}/*` only):

- `s3:GetObject`
- `s3:PutObject`

**Not granted** (among others): `dynamodb:DeleteItem`, `dynamodb:Scan`, `s3:DeleteObject`, `s3:ListBucket`, and no `Resource: '*'`.

---

## 3. Encryption & data protection

### Implemented today

- **S3 uploads:** `PutObjectCommand` sets `ServerSideEncryption: 'AES256'` in `S3Service`; the `MerchantDocumentsBucket` resource also sets `BucketEncryption` → `SSEAlgorithm: AES256`.
- **Bucket exposure:** `PublicAccessBlockConfiguration` blocks public ACLs/policies on the documents bucket.
- **Transport:** API Gateway is configured with `https: true` in `serverless.yml`.

### Production improvements (not implemented)

- Customer-managed **KMS CMKs** for S3 (and DynamoDB at rest) instead of SSE-S3/AES256, with CloudTrail-visible key use and rotation.
- **Secrets Manager** or **SSM Parameter Store** for real provider API credentials—today config uses environment variables / local mock credentials for S3 offline.

---

## 4. Logging & redaction decisions

### Response masking (global)

`MaskSensitiveDataInterceptor` is registered as a global `APP_INTERCEPTOR` in `AppModule`. It recursively walks JSON responses and masks values whose **keys** match:

- `/tax/i`, `/ssn/i`, `/identity/i`
- `/routing[_-]?number/i`, `/account[_-]?number/i`
- `/routing/i`, `/account/i`

Masking keeps the last four characters and replaces the prefix with `*` (`maskSensitiveValue`).

### Log-time sanitization

`ApplicationService.submitApplication()` builds a submission payload and runs it through the same `maskSensitiveData(...)` helper before `Logger.log`, so submit logs are not raw PII dumps of tax/SSN/account-shaped fields.

### Known limitation

Redaction is **key-name pattern matching**, not a schema-driven PII taxonomy. Fields that hold sensitive data under unexpected names may leak; benign fields whose names contain `account`/`routing` may be over-masked.

**Production improvement:** explicit allow/deny lists or PII tags on Zod schemas, plus structured audit logs to an append-only sink.

---

## 5. What is explicitly NOT stored

- **No card PAN / CVV:** applicant, business, document, MCC, and evaluation schemas contain **no** card-number / PAN / CVV fields (confirmed by schema search). Statement evaluation uses volume/fee metrics, not card data.
- **Bank identifiers only as masked metadata:** `settlementBankMetadataSchema` requires `routingNumberMasked` and `accountNumberMasked` with regexes that allow only optional `*` mask characters plus the last four digits—full routing/account numbers are rejected at validation time.

---

## 6. Retention / deletion approach

### Implemented today

S3 `LifecycleConfiguration` rule `CleanupAbandonedDocuments` expires objects after **90 days** (`ExpirationInDays: 90` on `MerchantDocumentsBucket`).

### Not implemented

DynamoDB has **no TTL attribute** and no scheduled cleanup for abandoned `DRAFT` applications. Old draft rows can remain indefinitely.

**Production improvement:** add a TTL attribute (e.g. based on `updatedAt` for drafts) and/or a scheduled cleanup Lambda that archives or deletes abandoned applications and related metadata consistently with legal retention policy.

---

## 7. Production improvements

Before handling real merchant PII in production, at minimum:

1. **Authentication / authorization** on every route (today: **none**).
2. **KMS CMKs** for S3 and DynamoDB; CloudTrail for data-plane/key audit.
3. **AWS WAF** (and throttling) in front of API Gateway.
4. **mTLS / signed requests** for any real processor or AI provider integration.
5. **Runtime validation of adapter outputs** against `evaluation.schema.ts`.
6. **Structured, append-only audit logging** separate from application logs.
7. **Secrets Manager / SSM** for credentials (no long-lived secrets in env alone).
8. **DynamoDB TTL / draft cleanup** aligned with the existing 90-day S3 lifecycle.
9. Stronger PII redaction than key-pattern matching alone.
