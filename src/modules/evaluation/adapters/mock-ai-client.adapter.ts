import { Injectable } from '@nestjs/common';
import { type EvaluationAiClient } from './ai-client.interface';
import {
  type AiClassificationResult,
  type ExtractedStatementNarrative,
  type MerchantProfile,
  type StatementMetrics,
} from '../../../common/schemas/evaluation.schema';

@Injectable()
export class MockEvaluationAiClient implements EvaluationAiClient {
  async classifyBusiness(input: { description: string; business?: MerchantProfile }): Promise<AiClassificationResult> {
    const description = (input.description || '').toLowerCase();
    const business = input.business || {};
    const keywords = {
      restaurant: /(restaurant|pizza|pasta|cafe|bistro|food|deli|burger|coffee)/i,
      grocery: /(grocery|market|supermarket|retail|food store)/i,
      software: /(software|saas|subscription|digital|platform)/i,
      travel: /(travel|airline|hotel|lodging|tours)/i,
      ecommerce: /(ecommerce|online|shop|web store|digital commerce|merchant)/i,
    };

    const matches = Object.entries(keywords).filter(([, regex]) => regex.test(description) || regex.test(String(business.geography || '')));

    let candidateCode = '5812';
    let candidateRiskTags: ('STANDARD' | 'ENHANCED_REVIEW' | 'RESTRICTED')[] = ['STANDARD'];
    let summary = 'Merchant profile aligns with a standard hospitality and food-service pattern.';

    if (matches.some(([key]) => key === 'grocery')) {
      candidateCode = '5411';
      summary = 'Merchant profile aligns with grocery and convenience retail, which is consistent with a retail MCC.';
    } else if (matches.some(([key]) => key === 'software')) {
      candidateCode = '5734';
      summary = 'Merchant profile indicates digital software and technology sales with low physical fulfillment risk.';
      candidateRiskTags = ['STANDARD'];
    } else if (matches.some(([key]) => key === 'travel')) {
      candidateCode = '4111';
      summary = 'Merchant profile aligns with travel and transportation services, which commonly carry moderate operational complexity.';
      candidateRiskTags = ['ENHANCED_REVIEW'];
    } else if (matches.some(([key]) => key === 'ecommerce')) {
      candidateCode = '5967';
      summary = 'Merchant profile indicates remote card-not-present activity with elevated digital risk and direct marketing traits.';
      candidateRiskTags = ['ENHANCED_REVIEW'];
    }

    const confidence = business.salesChannel === 'ONLINE' || business.fulfillmentModel === 'DIGITAL_GOODS' ? 0.88 : 0.82;

    return {
      candidates: [
        {
          mccCode: candidateCode,
          confidence,
          rationale: `Matched the merchant description to ${candidateCode} based on business activity, fulfillment pattern, and channel mix.`,
          riskTags: candidateRiskTags,
        },
      ],
      summary,
    };
  }

  async extractStatementMetrics(input: {
    statementText?: string;
    processor?: string;
    monthlyVolume?: number;
    totalFees?: number;
    transactionFees?: number;
    monthlyFees?: number;
    chargebackFees?: number;
    discountRate?: number;
    effectiveRate?: number;
    statementPeriod?: string;
    business?: MerchantProfile;
  }): Promise<{ extracted: StatementMetrics; narrative: ExtractedStatementNarrative }> {
    const monthlyVolume = Number(input.monthlyVolume ?? 0);
    const transactionFees = Number(input.transactionFees ?? 0);
    const monthlyFees = Number(input.monthlyFees ?? 0);
    const totalFees = Number(input.totalFees ?? transactionFees + monthlyFees);
    const chargebackFees = Number(input.chargebackFees ?? 0);
    const discountRate = Number(input.discountRate ?? 0);
    const effectiveRate = Number(input.effectiveRate ?? (monthlyVolume > 0 ? (totalFees / monthlyVolume) * 100 : 0));

    const extracted: StatementMetrics = {
      processor: input.processor || 'UNKNOWN_PROCESSOR',
      monthlyVolume: Number.isFinite(monthlyVolume) ? monthlyVolume : 0,
      totalFees: Number.isFinite(totalFees) ? totalFees : 0,
      discountRate: Number.isFinite(discountRate) ? discountRate : 0,
      effectiveRate: Number.isFinite(effectiveRate) ? effectiveRate / 100 : 0,
      transactionFees: Number.isFinite(transactionFees) ? transactionFees : 0,
      monthlyFees: Number.isFinite(monthlyFees) ? monthlyFees : 0,
      chargebackFees: Number.isFinite(chargebackFees) ? chargebackFees : 0,
      statementPeriod: input.statementPeriod || 'CURRENT_MONTH',
      statementText: input.statementText || '',
    };

    const narrative: ExtractedStatementNarrative = {
      summary: 'Statement parsed for fee and volume normalization with a deterministic effective rate calculation.',
      narrative: `Processor ${extracted.processor} processed ${extracted.monthlyVolume.toLocaleString()} with total fees of ${extracted.totalFees.toLocaleString()} and an effective rate of ${(extracted.effectiveRate * 100).toFixed(2)}%.`,
    };

    return { extracted, narrative };
  }
}
