import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { MccService } from '../mcc/mcc.service';
import { RiskPolicyService } from './risk-policy.service';
import { NotFoundException } from '@nestjs/common';

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: MccService,
          useValue: {
            findByCode: jest.fn((code) => {
              if (code === '6012') {
                return { code: '6012', description: 'Financial Services' };
              }
              return null;
            }),
          },
        },
        {
          provide: RiskPolicyService,
          useValue: {
            evaluateRisk: jest.fn(() => ({
              riskLevel: 'ENHANCED',
              requiresEnhancedReview: true,
              riskTags: ['FINANCIAL_SERVICES'],
            })),
          },
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyBusiness', () => {
    it('should return MCC details and risk assessment for valid code', async () => {
      const result = await service.classifyBusiness('6012');
      expect(result.proposedMcc).toBe('6012');
      expect(result.riskAssessment.requiresEnhancedReview).toBe(true);
    });

    it('should throw NotFoundException for invalid MCC code', async () => {
      await expect(service.classifyBusiness('9999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateStatement (Rate Arithmetic)', () => {
    it('should calculate correct effective rate and financial metrics', async () => {
      const dto = {
        cardMetrics: {
          monthlyVolume: 100000,
          totalFees: 2500,
        },
      };

      const result = await service.evaluateStatement(dto);
      expect(result.deterministicMetrics.monthlyVolume).toBe(100000);
      expect(result.deterministicMetrics.totalFees).toBe(2500);
      expect(result.deterministicMetrics.calculatedEffectiveRate).toBe('2.50%');
      expect(result.financialMetrics.effectiveRate).toBe(2.5);
    });

    it('should handle zero volume without calculation failure', async () => {
      const dto = {
        cardMetrics: {
          monthlyVolume: 0,
          totalFees: 0,
        },
      };

      const result = await service.evaluateStatement(dto);
      expect(result.deterministicMetrics.calculatedEffectiveRate).toBe('0.00%');
      expect(result.financialMetrics.effectiveRate).toBe(0);
    });
  });
});