import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApplicationRepository } from '../src/modules/database/application.repository';
import { S3Service } from '../src/modules/document/s3.service';

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

    // Mock لقواعد البيانات
    jest.spyOn(applicationRepo, 'create').mockImplementation(async (data: any) => ({
      pk: `APP#${data.id || 'test-id'}`,
      sk: 'METADATA',
      id: data.id || 'test-id',
      status: 'DRAFT',
      version: 1,
      applicant: data.applicant,
      business: data.business,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    jest.spyOn(applicationRepo, 'findById').mockImplementation(async (id: string) => ({
      pk: `APP#${id}`,
      sk: 'METADATA',
      id,
      status: 'DRAFT',
      version: 1,
      applicant: { name: 'John Doe', email: 'john@example.com' },
      business: { legalName: 'Acme LLC', taxId: '12-3456789' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // التعديل هنا: المطابقة التامة مع Return Type الخاص بـ S3Service
    jest.spyOn(s3Service, 'generatePresignedUploadUrl').mockImplementation(async () => ({
      presignedUrl: 'https://mock-s3-presigned-url.com/upload',
      key: 'documents/doc-12345.pdf',
    }));
  });

  afterAll(async () => {
    await app.close();
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
    it('POST /applications/classify - should return proposed MCC and confidence score', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications/classify')
        .send({ description: 'Italian restaurant serving pizza and pasta' })
        .expect(200);

      expect(response.body).toHaveProperty('proposedMcc');
      expect(response.body).toHaveProperty('confidenceScore');
    });

    it('POST /applications/evaluate - should calculate deterministic effective rate', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications/evaluate')
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
          applicant: { name: 'John Doe', email: 'john@example.com' },
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
});