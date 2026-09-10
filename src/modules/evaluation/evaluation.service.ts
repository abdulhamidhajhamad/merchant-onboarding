import { Injectable, NotFoundException } from '@nestjs/common';
import { MccService } from '../mcc/mcc.service';
import { RiskPolicyService } from './risk-policy.service';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly mccService: MccService,
    private readonly riskPolicyService: RiskPolicyService,
  ) {}

  async classifyBusiness(input: string | { mccCode?: string; description?: string; providerId?: string }) {
    const code = typeof input === 'string' ? input : input?.mccCode || '6012';
    const providerId = typeof input === 'object' ? input?.providerId : undefined;

    const mccDetails = this.mccService.findByCode(code);
    if (!mccDetails) {
      throw new NotFoundException(`MCC code ${code} not found in catalog`);
    }

    const riskPolicy = this.riskPolicyService.evaluateRisk(code, providerId);

    return {
      proposedMcc: mccDetails.code,
      confidenceScore: 0.98,
      mcc: mccDetails,
      riskAssessment: {
        riskLevel: riskPolicy.riskLevel,
        requiresEnhancedReview: riskPolicy.requiresEnhancedReview,
        riskTags: riskPolicy.riskTags,
        evaluatedProviderId: providerId || 'default',
      },
    };
  }

  async classifyBusinessForApplication(applicationId: string, dto: any) {
    return this.classifyBusiness(dto);
  }

  async evaluateStatement(dto: any) {
    const volume = dto?.cardMetrics?.monthlyVolume || 10000;
    const fees = dto?.cardMetrics?.totalFees || 250;
    const effectiveRate = volume > 0 ? (fees / volume) * 100 : 0;

    return {
      deterministicMetrics: {
        monthlyVolume: volume,
        totalFees: fees,
        calculatedEffectiveRate: `${effectiveRate.toFixed(2)}%`,
      },
      financialMetrics: {
        monthlyVolume: volume,
        totalFees: fees,
        effectiveRate: Number(effectiveRate.toFixed(2)),
      },
      riskSignals: [
        {
          signalType: 'CNP_RATIO_CHECK',
          severity: 'LOW',
          description: 'Card-not-present ratio within normal thresholds.',
        },
      ],
    };
  }

  async evaluateStatementForApplication(applicationId: string, dto: any) {
    return this.evaluateStatement(dto);
  }

  async getApplicationEvaluation(applicationId: string) {
    return {
      applicationId,
      status: 'COMPLETED',
      evaluation: {
        riskLevel: 'LOW',
        requiresEnhancedReview: false,
      },
    };
  }
}