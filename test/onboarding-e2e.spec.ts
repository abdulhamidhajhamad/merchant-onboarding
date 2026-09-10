import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApplicationRepository } from '../src/modules/database/application.repository';
import { S3Service } from '../src/modules/document/s3.service';
import { EvaluationService } from '../src/modules/evaluation/evaluation.service';
import { HealthModule } from '../src/modules/health/health.module';
import { DatabaseModule } from '../src/modules/database/database.module';
import { DocumentModule } from '../src/modules/document/document.module';
import { MccModule } from '../src/modules/mcc/mcc.module';
import { ApplicationModule } from '../src/modules/application/application.module';
import { EvaluationModule } from '../src/modules/evaluation/evaluation.module';
import { MaskSensitiveDataInterceptor } from '../src/common/interceptors/mask-sensitive-data.interceptor';
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor';

process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'mock-key';
process.env.AWS_SECRET_ACCESS_KEY = 'mock-secret';
process.env.DYNAMODB_TABLE_NAME = 'mock-table';
process.env.S3_BUCKET_NAME = 'mock-bucket';

describe('Merchant Onboarding System (E2E Integration & Reliability)', () => {
  let app: INestApplication;
  let applicationRepo: ApplicationRepository;
  let s3Service: S3Service;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    applicationRepo = moduleFixture.get<ApplicationRepository>(ApplicationRepository);
    s3Service = moduleFixture.get<S3Service>(S3Service);

    const validApplicant = {
      firstName: 'John',
      middleName: 'Michael',
      lastName: 'Doe',
      dateOfBirth: '1990-05-16',
      residentialAddress: {
        addressLine1: '123 Main St',
        city: 'Seattle',
        state: 'WA',
        postalCode: '98101',
        country: 'US',
      },
      contact: {
        email: 'john@example.com',
        phone: '+12065550123',
      },
      role: 'Owner',
      ownershipPercentage: 100,
      identityMetadata: {
        idType: 'DRIVERS_LICENSE' as const,
        maskedIdentifier: '1234',
      },
      attestation: {
        termsAccepted: true,
        termsVersion: 'v1.0',
        consentedAt: new Date().toISOString(),
      },
    } as const;

    const validBusiness = {
      legalName: 'Acme LLC',
      dba: 'Acme Market',
      entityType: 'LLC' as const,
      formationCountry: 'US',
      formationState: 'WA',
      registrationIdentifier: {
        type: 'EIN' as const,
        value: '12-3456789',
      },
      registeredAddress: {
        addressLine1: '100 Pine St',
        city: 'Seattle',
        state: 'WA',
        postalCode: '98101',
        country: 'US',
      },
      operatingAddress: {
        addressLine1: '100 Pine St',
        city: 'Seattle',
        state: 'WA',
        postalCode: '98101',
        country: 'US',
      },
      website: 'https://www.acme.com',
      businessDescription: 'Retail merchant processing services for a growing local business.',
      businessStartDate: '2018-01-02',
      cardVolumeMetrics: {
        expectedAnnualVolume: 1500000,
        averageTicketSize: 80,
        highestTicketSize: 500,
        monthlyTransactionCount: 2500,
        cardPresentPercentage: 60,
        cardNotPresentPercentage: 40,
        ecommercePercentage: 20,
      },
      beneficialOwners: [
        {
          applicantId: 'owner-1',
          ownershipPercentage: 100,
          relationship: 'Owner',
        },
      ],
      requestedSettlementBank: {
        bankName: 'Bank of America',
        accountHolder: 'Acme LLC',
        routingNumberMasked: '****1234',
        accountNumberMasked: '****4321',
      },
      existingProcessorName: 'Square',
      processingHistory: {
        existingProcessorName: 'Square',
        summary: 'Prior processor for 18 months with no material issues.',
      },
    } as const;

const mockDocuments = [
  { id: 'doc-1', type: 'GOVT_ID', lifecycleStatus: 'ACCEPTED' },
  { id: 'doc-2', type: 'BUSINESS_REG', lifecycleStatus: 'RECEIVED' },
  { id: 'doc-3', type: 'BANK_EVIDENCE', lifecycleStatus: 'RECEIVED' },
];

    jest.spyOn(applicationRepo, 'create').mockImplementation(async (data: any): Promise<any> => ({
      pk: `APP#${data.id || 'test-id'}`,
      sk: 'METADATA',
      id: data.id || 'test-id',
      status: 'DRAFT',
      version: 1,
      applicant: data.applicant ?? validApplicant,
      business: data.business ?? validBusiness,
      documents: mockDocuments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(applicationRepo, 'findById').mockImplementation(async (id: string): Promise<any> => ({
      pk: `APP#${id}`,
      sk: 'METADATA',
      id,
      status: 'DRAFT',
      version: 1,
      applicant: validApplicant,
      business: validBusiness,
      documents: mockDocuments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(applicationRepo, 'updateStatus').mockImplementation(async (id: string, status: string): Promise<any> => ({
      id,
      status,
      version: 2,
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(applicationRepo, 'updateSubmissionSnapshot').mockImplementation(async (id: string, snapshot: any): Promise<any> => ({
      id,
      ...snapshot,
    }));

    jest.spyOn(applicationRepo, 'updateMcc').mockImplementation(async (id: string, mcc: any): Promise<any> => ({
      id,
      mcc,
      version: 2,
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(applicationRepo, 'updateEvaluation').mockImplementation(async (id: string, evaluation: any): Promise<any> => ({
      id,
      evaluation,
      version: 3,
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(s3Service, 'generatePresignedUploadUrl').mockImplementation(async () => ({
      presignedUrl: 'https://mock-s3-presigned-url.com/upload',
      key: 'documents/doc-12345.pdf',
    }));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health Safeguards', () => {
    it('GET /health - should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status.toLowerCase()).toBe('ok');
    });
  });

  describe('2. AI Evaluation & Risk Classification', () => {
    it('POST /applications/:id/classify - should return proposed MCC and confidence score', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications/test-id/classify')
        .send({ description: 'Italian restaurant serving pizza and pasta' })
        .expect(200);

      expect(response.body).toHaveProperty('proposedMcc');
      expect(response.body).toHaveProperty('confidenceScore');
      // MockEvaluationAiClient keyword match: restaurant/pizza/pasta → 5812 (not hardcoded 6012)
      expect(response.body.proposedMcc).toBe('5812');
      expect(response.body.proposedMcc).not.toBe('6012');
    });

    it('POST /applications/:id/evaluate - should calculate deterministic effective rate', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications/test-id/evaluate')
        .send({ monthlyVolume: 100000, totalFees: 2500 })
        .expect(200);

      expect(response.body.deterministicMetrics.calculatedEffectiveRate).toBe('2.50%');
      expect(response.body).toHaveProperty('riskSignals');
    });
  });

  describe('3. Application Workflows', () => {
    it('POST /applications - should process application creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          applicant: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          business: { legalName: 'Acme LLC', taxId: '12-3456789' },
        });

      expect([200, 201]).toContain(response.status);
    });

    it('POST /applications/:id/submit - should lock and submit application', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications/test-id/submit')
        .expect(200);

      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.normalizedPayload.reviewStatus).toBe('READY_FOR_UNDERWRITING');
    });
  });

  describe('4. Reliability & Timeout Safeguards', () => {
    it('returns HTTP 408 when a hanging dependency exceeds the server-side timeout budget', async () => {
      const serverTimeoutMs = 300;

      @Module({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          HealthModule,
          DatabaseModule,
          DocumentModule,
          MccModule,
          ApplicationModule,
          EvaluationModule,
        ],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useClass: MaskSensitiveDataInterceptor,
          },
          {
            provide: APP_INTERCEPTOR,
            useFactory: () => new TimeoutInterceptor(serverTimeoutMs),
          },
        ],
      })
      class ShortTimeoutAppModule {}

      const timeoutModule = await Test.createTestingModule({
        imports: [ShortTimeoutAppModule],
      }).compile();

      const timeoutApp = timeoutModule.createNestApplication();
      await timeoutApp.init();

      const shortTimeoutEvaluationService =
        timeoutModule.get<EvaluationService>(EvaluationService);
      const shortTimeoutRepo =
        timeoutModule.get<ApplicationRepository>(ApplicationRepository);

      jest
        .spyOn(shortTimeoutEvaluationService, 'classifyBusiness')
        .mockImplementation(() => new Promise(() => {}));
      jest.spyOn(shortTimeoutRepo, 'updateMcc').mockResolvedValue({} as any);
      jest
        .spyOn(shortTimeoutRepo, 'updateEvaluation')
        .mockResolvedValue({} as any);

      const startTime = Date.now();
      // Intentionally no .timeout() on the client — the server interceptor must respond.
      const response = await request(timeoutApp.getHttpServer())
        .post('/applications/test-id/classify')
        .send({ description: 'Hanging test description' });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(408);
      expect(response.body.statusCode).toBe(408);
      expect(response.body.message).toEqual(
        expect.stringMatching(/timed out/i),
      );
      expect(response.body.error).toBe('Request Timeout');

      const bodyText = JSON.stringify(response.body);
      expect(bodyText).not.toMatch(/node_modules|TimeoutInterceptor\.ts|at Object|stack/i);
      expect(duration).toBeLessThan(1000);

      await timeoutApp.close();
    });

    it('allows a normal classify request to complete successfully within the timeout budget', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/applications/test-id/classify')
        .send({ description: 'Italian restaurant serving pizza and pasta' })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.proposedMcc).toBe('5812');
      expect(response.body).toHaveProperty('confidenceScore');
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('5. Document Boundary Validation', () => {
    const validApplicationId = '550e8400-e29b-41d4-a716-446655440000';
    const validDocumentId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

    it('POST /applications/:id/documents/presign returns 400 when documentType is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(`/applications/${validApplicationId}/documents/presign`)
        .send({
          mimeType: 'application/pdf',
          fileSizeBytes: 2048,
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'documentType',
            message: expect.any(String),
          }),
        ]),
      );
    });

    it('POST /applications/:id/documents/:documentId/complete returns 400 for a malformed checksum', async () => {
      const response = await request(app.getHttpServer())
        .post(
          `/applications/${validApplicationId}/documents/${validDocumentId}/complete`,
        )
        .send({ checksum: 'not-64-hex-chars' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringMatching(/checksum|sha256Checksum|root/),
            message: expect.any(String),
          }),
        ]),
      );
    });

    it('POST /applications/:id/documents/presign returns 400 for a non-UUID application id', async () => {
      await request(app.getHttpServer())
        .post('/applications/not-a-uuid/documents/presign')
        .send({
          documentType: 'BANK_EVIDENCE',
          mimeType: 'application/pdf',
          fileSizeBytes: 2048,
        })
        .expect(400);
    });
  });
});
