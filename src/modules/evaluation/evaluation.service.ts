import { Injectable } from '@nestjs/common';

@Injectable()
export class EvaluationService {
  async classifyBusiness(description: string) {
    return {
      proposedMcc: '5812',
      confidenceScore: 0.92,
      explanation: 'Matched based on business description referring to food service and dining operations.',
      suggestedRiskTags: ['STANDARD'],
    };
  }

  async evaluateStatement(statementData?: any) {
    // فصل الحسابات الرياضية الدقيقة عن التقييم النصي للذكاء الاصطناعي
    const monthlyVolume = statementData?.monthlyVolume || 50000;
    const totalFees = statementData?.totalFees || 1250;
    const effectiveRate = ((totalFees / monthlyVolume) * 100).toFixed(2);

    return {
      deterministicMetrics: {
        monthlyVolume,
        totalFees,
        calculatedEffectiveRate: `${effectiveRate}%`,
      },
      riskSignals: [
        {
          code: 'HIGH_CNP_RATIO',
          severity: 'WARNING',
          sourceField: 'business.cardNotPresentPercentage',
          message: 'E-commerce card-not-present mix exceeds 80%, requiring enhanced chargeback review.',
        },
      ],
      aiCommentary: 'Merchant operating model presents standard processing risk with slightly elevated CNP transactions.',
    };
  }
}