import { type AiClassificationResult, type ExtractedStatementNarrative, type MerchantProfile, type StatementMetrics } from '../../../common/schemas/evaluation.schema';

export const EVALUATION_AI_CLIENT = Symbol('EVALUATION_AI_CLIENT');

export interface EvaluationAiClient {
  classifyBusiness(input: {
    description: string;
    business?: MerchantProfile;
  }): Promise<AiClassificationResult>;

  extractStatementMetrics(input: {
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
  }): Promise<{
    extracted: StatementMetrics;
    narrative: ExtractedStatementNarrative;
  }>;
}
