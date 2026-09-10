import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  aiClassificationResultSchema,
  classifyBusinessRequestSchema,
  evaluateStatementRequestSchema,
  extractedStatementNarrativeSchema,
  riskSignalSchema,
  type ClassifyBusinessRequest,
  type EvaluateStatementRequest,
  type RiskSignal,
} from '../../common/schemas/evaluation.schema';
import { EVALUATION_AI_CLIENT, type EvaluationAiClient } from './adapters/ai-client.interface';
import { calculateChargebackRate, calculateEffectiveRate, formatPercent } from './evaluation.math';

@Injectable()
export class EvaluationService {
  constructor(@Inject(EVALUATION_AI_CLIENT) private readonly aiClient: EvaluationAiClient) {}

  async classifyBusiness(input: ClassifyBusinessRequest) {
    const parsed = classifyBusinessRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid classification request payload',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    const aiOutput = await this.aiClient.classifyBusiness({
      description: parsed.data.description,
      business: parsed.data.business,
    });

    const validated = aiClassificationResultSchema.safeParse(aiOutput);
    if (!validated.success) {
      throw new BadRequestException({
        message: 'AI classification response failed schema validation',
        errors: validated.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    const primaryCandidate = validated.data.candidates[0];

    return {
      proposedMcc: primaryCandidate.mccCode,
      confidenceScore: primaryCandidate.confidence,
      explanation: primaryCandidate.rationale,
      suggestedRiskTags: primaryCandidate.riskTags,
      summary: validated.data.summary,
      candidates: validated.data.candidates,
      profileSummary: this.buildProfileSummary(parsed.data.business),
    };
  }

  async evaluateStatement(input?: EvaluateStatementRequest) {
    const parsed = evaluateStatementRequestSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid evaluation request payload',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    const business = parsed.data.business || {};
    const transactionFees = Number(parsed.data.transactionFees ?? 0);
    const monthlyFees = Number(parsed.data.monthlyFees ?? 0);
    const monthlyVolume = Number(parsed.data.monthlyVolume ?? 0);
    const totalFees = Number(parsed.data.totalFees ?? transactionFees + monthlyFees);
    const chargebackFees = Number(parsed.data.chargebackFees ?? 0);
    const discountRate = Number(parsed.data.discountRate ?? 0);
    const effectiveRatePercent = calculateEffectiveRate(monthlyVolume, totalFees);

    const extracted = await this.aiClient.extractStatementMetrics({
      statementText: parsed.data.statementText,
      processor: parsed.data.processor,
      monthlyVolume,
      totalFees,
      transactionFees,
      monthlyFees,
      chargebackFees,
      discountRate,
      effectiveRate: effectiveRatePercent / 100,
      statementPeriod: parsed.data.statementPeriod,
      business,
    });

    const narrativeCheck = extractedStatementNarrativeSchema.safeParse(extracted.narrative);
    if (!narrativeCheck.success) {
      throw new BadRequestException({
        message: 'AI statement analysis failed schema validation',
        errors: narrativeCheck.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    const normalizedStatement = {
      processor: extracted.extracted.processor || parsed.data.processor || 'UNKNOWN_PROCESSOR',
      monthlyVolume,
      totalFees,
      discountRate,
      effectiveRate: effectiveRatePercent / 100,
      transactionFees,
      monthlyFees,
      chargebackFees,
      statementPeriod: parsed.data.statementPeriod || extracted.extracted.statementPeriod || 'CURRENT_MONTH',
      statementText: parsed.data.statementText || extracted.extracted.statementText || '',
    };

    const riskSignals = this.buildRiskSignals(normalizedStatement, business);

    return {
      deterministicMetrics: {
        monthlyVolume,
        totalFees,
        transactionFees,
        monthlyFees,
        chargebackFees,
        discountRate,
        calculatedEffectiveRate: formatPercent(effectiveRatePercent),
        effectiveRatePercent,
      },
      riskSignals,
      aiCommentary: narrativeCheck.data.narrative,
      summary: narrativeCheck.data.summary,
      extractedStatement: normalizedStatement,
    };
  }

  private buildProfileSummary(business?: ClassifyBusinessRequest['business']) {
    if (!business) {
      return {
        salesChannel: 'UNKNOWN',
        geography: 'UNKNOWN',
        fulfillmentModel: 'UNKNOWN',
        recurringBehavior: 'UNKNOWN',
        customerType: 'UNKNOWN',
      };
    }

    return {
      legalName: business.legalName || 'UNKNOWN',
      salesChannel: business.salesChannel || 'UNKNOWN',
      geography: business.geography || 'UNKNOWN',
      fulfillmentModel: business.fulfillmentModel || 'UNKNOWN',
      recurringBehavior: business.recurringBehavior || 'UNKNOWN',
      customerType: business.customerType || 'UNKNOWN',
      ownerCount: business.beneficialOwners?.length || 0,
      cardNotPresentPercentage: business.cardMetrics?.cardNotPresentPercentage ?? 0,
    };
  }

  private buildRiskSignals(statement: any, business?: any): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const cnp = Number(business?.cardMetrics?.cardNotPresentPercentage ?? 0);
    const ticketSize = Number(business?.cardMetrics?.averageTicketSize ?? 0);
    const ownerTotal = Array.isArray(business?.beneficialOwners)
      ? business.beneficialOwners.reduce((sum: number, owner: any) => sum + Number(owner.ownershipPercentage ?? 0), 0)
      : 0;
    const chargebackRate = calculateChargebackRate(Number(statement.chargebackFees ?? 0), Number(statement.monthlyVolume ?? 0));

    if (cnp > 80) {
      signals.push(
        riskSignalSchema.parse({
          code: 'HIGH_CNP_RATIO',
          severity: 'HIGH',
          sourceField: 'business.cardMetrics.cardNotPresentPercentage',
          documentType: 'PROCESSING_STATEMENT',
          message: 'Card-not-present mix exceeds 80%, which materially increases chargeback risk.',
          evidence: [
            {
              field: 'business.cardMetrics.cardNotPresentPercentage',
              documentType: 'PROCESSING_STATEMENT',
              source: 'merchantProfile.cardMetrics',
              value: cnp,
            },
          ],
        }),
      );
    }

    if (ticketSize > 1000) {
      signals.push(
        riskSignalSchema.parse({
          code: 'TICKET_SIZE_ANOMALY',
          severity: 'MEDIUM',
          sourceField: 'business.cardMetrics.averageTicketSize',
          documentType: 'PROCESSING_STATEMENT',
          message: 'Average ticket size is unusually high relative to standard consumer retail patterns and may indicate a concentrated or unusual order profile.',
          evidence: [
            {
              field: 'business.cardMetrics.averageTicketSize',
              documentType: 'PROCESSING_STATEMENT',
              source: 'merchantProfile.cardMetrics',
              value: ticketSize,
            },
          ],
        }),
      );
    }

    if (Array.isArray(business?.beneficialOwners) && ownerTotal < 100) {
      signals.push(
        riskSignalSchema.parse({
          code: 'OWNERSHIP_INCOMPLETE',
          severity: 'HIGH',
          sourceField: 'business.beneficialOwners',
          documentType: 'BUSINESS_REG',
          message: 'Beneficial ownership percentages do not sum to 100%, which can indicate incomplete ownership disclosure.',
          evidence: [
            {
              field: 'business.beneficialOwners',
              documentType: 'BUSINESS_REG',
              source: 'merchantProfile.beneficialOwners',
              value: ownerTotal,
            },
          ],
        }),
      );
    }

    if (chargebackRate > 2) {
      signals.push(
        riskSignalSchema.parse({
          code: 'CHARGEBACK_RATE_ELEVATED',
          severity: 'HIGH',
          sourceField: 'statement.chargebackFees',
          documentType: 'PROCESSING_STATEMENT',
          message: 'Chargeback loss exposure exceeds the standard 2% threshold for this merchant profile.',
          evidence: [
            {
              field: 'statement.chargebackFees',
              documentType: 'PROCESSING_STATEMENT',
              source: 'statement.extractor',
              value: Number(statement.chargebackFees ?? 0),
            },
          ],
        }),
      );
    }

    if (!statement.processor || statement.processor === 'UNKNOWN_PROCESSOR') {
      signals.push(
        riskSignalSchema.parse({
          code: 'PROCESSOR_MISSING',
          severity: 'LOW',
          sourceField: 'statement.processor',
          documentType: 'PROCESSING_STATEMENT',
          message: 'Processor name is missing from the statement, reducing corroboration strength.',
          evidence: [
            {
              field: 'statement.processor',
              documentType: 'PROCESSING_STATEMENT',
              source: 'statement.extractor',
              value: null,
            },
          ],
        }),
      );
    }

    if (signals.length === 0) {
      signals.push(
        riskSignalSchema.parse({
          code: 'LOW_RISK_PROFILE',
          severity: 'LOW',
          sourceField: 'statement.monthlyVolume',
          documentType: 'PROCESSING_STATEMENT',
          message: 'No material underwriting risk triggers were identified from the supplied data.',
          evidence: [
            {
              field: 'statement.monthlyVolume',
              documentType: 'PROCESSING_STATEMENT',
              source: 'statement.extractor',
              value: Number(statement.monthlyVolume ?? 0),
            },
          ],
        }),
      );
    }

    return signals;
  }
}
