import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from '../database/application.repository';
import { NotFoundException } from '@nestjs/common';

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ApplicationRepository,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'app-1', status: 'DRAFT' }),
            findById: jest.fn().mockImplementation(async (id) => {
              if (id === 'app-1') {
                return {
                  id: 'app-1',
                  status: 'DRAFT',
                  applicant: {
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-01-01',
                    residentialAddress: {
                      addressLine1: '123 St',
                      city: 'Seattle',
                      state: 'WA',
                      postalCode: '98101',
                      country: 'US',
                    },
                    contact: { email: 'john@example.com', phone: '+12065550123' },
                    role: 'Owner',
                    ownershipPercentage: 100,
                    identityMetadata: { idType: 'DRIVERS_LICENSE', maskedIdentifier: '1234' },
                    attestation: { termsAccepted: true, termsVersion: 'v1', consentedAt: new Date().toISOString() },
                  },
                  business: {
                    legalName: 'Acme LLC',
                    entityType: 'LLC',
                    formationCountry: 'US',
                    formationState: 'WA',
                    registrationIdentifier: { type: 'EIN', value: '12-3456789' },
                    registeredAddress: { addressLine1: '123 St', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'US' },
                    operatingAddress: { addressLine1: '123 St', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'US' },
                    website: 'https://example.com',
                    businessDescription: 'Retail sales',
                    businessStartDate: '2020-01-01',
                    cardVolumeMetrics: {
                      expectedAnnualVolume: 100000,
                      averageTicketSize: 50,
                      highestTicketSize: 200,
                      monthlyTransactionCount: 100,
                      cardPresentPercentage: 50,
                      cardNotPresentPercentage: 50,
                      ecommercePercentage: 50,
                    },
                    beneficialOwners: [],
                    requestedSettlementBank: { bankName: 'Bank', accountHolder: 'Acme', routingNumberMasked: '1234', accountNumberMasked: '5678' },
                  },
                  documents: [
                    { type: 'GOVERNMENT_ID', lifecycleStatus: 'ACCEPTED' },
                    { type: 'BUSINESS_REGISTRATION', lifecycleStatus: 'RECEIVED' },
                    { type: 'BANK_EVIDENCE', lifecycleStatus: 'RECEIVED' },
                  ],
                };
              }
              return null;
            }),
            updateStatus: jest.fn().mockResolvedValue({ success: true }),
            updateSubmissionSnapshot: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getApplication', () => {
    it('should return application data when found', async () => {
      const app = await service.getApplication('app-1');
      expect(app.id).toBe('app-1');
    });

    it('should throw NotFoundException when application does not exist', async () => {
      await expect(service.getApplication('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitApplication', () => {
    it('should successfully validate and submit application when requirements are met', async () => {
      const result = await service.submitApplication('app-1');
      expect(result.status).toBe('SUBMITTED');
    });
  });
});