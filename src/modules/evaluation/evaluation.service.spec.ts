import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { MccService } from '../mcc/mcc.service';
import { RiskPolicyService } from './risk-policy.service';
import { NotFoundException } from '@nestjs/common';
import { EVALUATION_AI_CLIENT } from './adapters/ai-client.interface';
import { MockEvaluationAiClient } from './adapters/mock-ai-client.adapter';
import { ApplicationRepository } from '../database/application.repository';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let applicationRepository: {
    updateMcc: jest.Mock;
    updateEvaluation: jest.Mock;
    findById: jest.Mock;
  };
  let aiClient: MockEvaluationAiClient;

  const catalog: Record<string, { code: string; description: string; category: string }> = {
    '6012': {
      code: '6012',
      description: 'Financial Institutions - Merchandise, Services, and Debt Repayment',
      category: 'Financial Services',
    },
    '5812': {
      code: '5812',
      description: 'Eating Places and Restaurants',
      category: 'Food & Beverage',
    },
    '5734': {
      code: '5734',
      description: 'Computer Software Stores',
      category: 'Technology',
    },
    '5411': {
      code: '5411',
      description: 'Grocery Stores, Supermarkets',
      category: 'Retail',
    },
  };

  beforeEach(async () => {
    applicationRepository = {
      updateMcc: jest.fn(async (_id, mcc) => ({ id: _id, mcc })),
      updateEvaluation: jest.fn(async (_id, evaluation) => ({
        id: _id,
        evaluation,
      })),
      findById: jest.fn(),
    };

    aiClient = new MockEvaluationAiClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: MccService,
          useValue: {
            findByCode: jest.fn((code: string) => catalog[code] ?? null),
          },
        },
        {
          provide: RiskPolicyService,
          useValue: {
            evaluateRisk: jest.fn((mccCode: string) => {
              if (mccCode === '6012') {
                return {
                  riskLevel: 'HIGH',
                  requiresEnhancedReview: true,
                  riskTags: ['SPECIALIZED_MCC', 'FINANCIAL_OBLIGATION'],
                };
              }
              if (mccCode === '5812' || mccCode === '5411') {
                return {
                  riskLevel: 'LOW',
                  requiresEnhancedReview: false,
                  riskTags: ['STANDARD_RETAIL'],
                };
              }
              return {
                riskLevel: 'MEDIUM',
                requiresEnhancedReview: false,
                riskTags: ['UNKNOWN_MCC_DEFAULT'],
              };
            }),
          },
        },
        {
          provide: ApplicationRepository,
          useValue: applicationRepository,
        },
        {
          provide: EVALUATION_AI_CLIENT,
          useValue: aiClient,
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyBusiness', () => {
    it('returns a food-service MCC for a restaurant description, not 6012', async () => {
      const result = await service.classifyBusiness({
        description: 'Italian restaurant serving pizza and pasta',
      });

      expect(result.proposedMcc).toBe('5812');
      expect(result.proposedMcc).not.toBe('6012');
      expect(result.mcc.category).toBe('Food & Beverage');
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.rationale).toBeTruthy();
    });

    it('returns 5734 for a software/SaaS description, not 6012', async () => {
      const result = await service.classifyBusiness({
        description: 'B2B SaaS software subscription platform',
      });

      expect(result.proposedMcc).toBe('5734');
      expect(result.proposedMcc).not.toBe('6012');
      expect(result.mcc.category).toBe('Technology');
    });

    it('throws NotFoundException when the AI candidate MCC is missing from the catalog', async () => {
      jest.spyOn(aiClient, 'classifyBusiness').mockResolvedValue({
        candidates: [
          {
            mccCode: '9999',
            confidence: 0.5,
            rationale: 'Synthetic unknown MCC candidate for negative-path coverage.',
            riskTags: ['STANDARD'],
          },
        ],
        summary: 'Unknown MCC candidate used only for NotFoundException coverage.',
      });

      await expect(
        service.classifyBusiness({ description: 'Anything that would otherwise classify' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('classifyBusinessForApplication', () => {
    it('persists MCC and evaluation payloads via ApplicationRepository', async () => {
      const result = await service.classifyBusinessForApplication('app-1', {
        description: 'Italian restaurant serving pizza and pasta',
      });

      expect(result.proposedMcc).toBe('5812');
      expect(applicationRepository.updateMcc).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({
          mccCode: '5812',
          description: 'Eating Places and Restaurants',
          industryCategory: 'Food & Beverage',
          confidenceScore: expect.any(Number),
          riskPolicyTags: ['STANDARD'],
        }),
      );
      expect(applicationRepository.updateEvaluation).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({
          applicationId: 'app-1',
          status: 'COMPLETE',
          classification: expect.objectContaining({
            proposedMcc: '5812',
          }),
        }),
      );
    });
  });

  describe('getApplicationEvaluation', () => {
    it('throws NotFoundException for a missing application id', async () => {
      applicationRepository.findById.mockResolvedValue(null);

      await expect(service.getApplicationEvaluation('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the stored evaluation object for an existing application', async () => {
      const storedEvaluation = {
        applicationId: 'app-1',
        status: 'COMPLETE',
        classification: { proposedMcc: '5812' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      applicationRepository.findById.mockResolvedValue({
        id: 'app-1',
        evaluation: storedEvaluation,
      });

      const result = await service.getApplicationEvaluation('app-1');
      expect(result).toEqual(storedEvaluation);
    });
  });

  describe('evaluateStatement (Rate Arithmetic)', () => {
    it('should calculate correct effective rate and financial metrics via AI + math helpers', async () => {
      const result = await service.evaluateStatement({
        monthlyVolume: 100000,
        totalFees: 2500,
      });

      expect(result.deterministicMetrics.monthlyVolume).toBe(100000);
      expect(result.deterministicMetrics.totalFees).toBe(2500);
      expect(result.deterministicMetrics.calculatedEffectiveRate).toBe('2.50%');
      expect(result.financialMetrics.effectiveRate).toBe(2.5);
    });

    it('should handle zero volume without calculation failure', async () => {
      const result = await service.evaluateStatement({
        monthlyVolume: 0,
        totalFees: 0,
      });

      expect(result.deterministicMetrics.calculatedEffectiveRate).toBe('0.00%');
      expect(result.financialMetrics.effectiveRate).toBe(0);
    });

    it('emits explainable risk signals with sourceField for ticket outliers and missing fees', async () => {
      const result = await service.evaluateStatement({
        processor: 'Square',
        monthlyVolume: 0,
        totalFees: 0,
        business: {
          cardMetrics: {
            averageTicketSize: 50,
            highestTicketSize: 200,
            ecommercePercentage: 80,
            cardNotPresentPercentage: 40,
          },
        },
      });

      const codes = result.riskSignals.map((signal) => signal.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'HIGH_TICKET_OUTLIER',
          'ECOMMERCE_EXCEEDS_CNP',
          'MISSING_STATEMENT_VOLUME_OR_FEES',
        ]),
      );
      for (const signal of result.riskSignals) {
        expect(signal.sourceField).toBeTruthy();
        expect(signal.message.length).toBeGreaterThanOrEqual(10);
      }
    });
  });
});
