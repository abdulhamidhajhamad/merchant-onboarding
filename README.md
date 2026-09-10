# Merchant Onboarding Service

Production-grade, serverless merchant onboarding API built with NestJS, AWS Lambda, Amazon DynamoDB, and Amazon S3.

## Tech Stack & Architecture
- Framework: NestJS (Modular Architecture)
- Runtime & Deployment: AWS Lambda via @codegenie/serverless-express, Serverless Framework
- Database: Amazon DynamoDB with Optimistic Concurrency Control (OCC) and conditional writes
- Storage: Amazon S3 with pre-signed URLs for document uploads
- Validation: Zod schema validation integrated with NestJS and Swagger (nestjs-zod)
- Testing: Jest (Unit & E2E test suites)

## Local Setup

1. Clone repository & install dependencies:
npm install

2. Configure environment variables:
cp .env.example .env

3. Run local development server:
npm run sls:offline
# Or standard NestJS mode:
npm run start:dev

4. Run Tests:
npm run test:unit
npm run test:e2e

## Deployment

Deploy service to AWS Lambda and API Gateway:
npx serverless deploy --stage prod

## API Examples

### Create a New Application
- Endpoint: POST /applications
- Response Example:
{
  "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "status": "DRAFT",
  "version": 1,
  "createdAt": "2026-06-06T00:00:00.000Z",
  "updatedAt": "2026-06-06T00:00:00.000Z"
}

### Update Applicant Details
- Endpoint: PATCH /applications/:id/applicant
- Body Example:
{
  "applicant": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "residentialAddress": {
      "addressLine1": "123 St",
      "city": "Seattle",
      "state": "WA",
      "postalCode": "98101",
      "country": "US"
    },
    "contact": { "email": "john@example.com", "phone": "+12065550123" },
    "role": "Owner",
    "ownershipPercentage": 100,
    "identityMetadata": { "idType": "DRIVERS_LICENSE", "maskedIdentifier": "1234" },
    "attestation": { "termsAccepted": true, "termsVersion": "v1", "consentedAt": "2026-06-06T00:00:00.000Z" }
  },
  "currentVersion": 1
}

Interactive Swagger API documentation is available at /docs.

## Assumptions
- Merchants complete applications incrementally (Draft state) before final submission locking.
- Document binaries stream directly to S3 via pre-signed URLs, tracking metadata asynchronously in DynamoDB.
- Risk scoring and MCC classification rely on deterministic rule sets.

## Known Gaps
- Asynchronous Webhook Processing uses local polling mechanisms instead of production EventBridge bus.
- Advanced OCR data extraction is stubbed via lifecycle status transitions.

## Cleanup Commands
Remove deployed AWS infrastructure:
npx serverless remove --stage prod