import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MccService } from '../mcc/mcc.service';
import { RiskPolicyService } from './risk-policy.service';
import {
  EVALUATION_AI_CLIENT,
  type EvaluationAiClient,
} from './adapters/ai-client.interface';
import {
  ApplicationRepository,
  type ApplicationEvaluationRecord,
} from '../database/application.repository';
import { mccSchema } from '../../common/schemas/mcc.schema';
import {
  type ClassifyBusinessRequest,
  type EvaluateStatementRequest,
  type RiskSignal,
} from '../../common/schemas/evaluation.schema';
import {
  calculateChargebackRate,
  calculateEffectiveRate,
  formatPercent,
} from './evaluation.math';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly mccService: MccService,
    private readonly riskPolicyService: RiskPolicyService,
    private readonly applicationRepository: ApplicationRepository,
    @Inject(EVALUATION_AI_CLIENT) private readonly aiClient: EvaluationAiClient,
  ) {}

  async classifyBusiness(dto: ClassifyBusinessRequest, providerId?: string) {
    const aiResult = await this.aiClient.classifyBusiness({
      description: dto.description,
      business: dto.business,
    });

    const topCandidate = aiResult.candidates[0];
    const mccDetails = this.mccService.findByCode(topCandidate.mccCode);

    if (!mccDetails) {
      throw new NotFoundException(
        `MCC code ${topCandidate.mccCode} not found in catalog`,
      );
    }

    const riskPolicy = this.riskPolicyService.evaluateRisk(
      topCandidate.mccCode,
      providerId,
    );

    return {
      proposedMcc: mccDetails.code,
      confidenceScore: topCandidate.confidence,
      rationale: topCandidate.rationale,
      mcc: mccDetails,
      riskAssessment: {
        riskLevel: riskPolicy.riskLevel,
        requiresEnhancedReview: riskPolicy.requiresEnhancedReview,
        riskTags: riskPolicy.riskTags,
        evaluatedProviderId: providerId || 'default',
      },
    };
  }

  async classifyBusinessForApplication(
    applicationId: string,
    dto: ClassifyBusinessRequest,
  ) {
    const result = await this.classifyBusiness(dto);

    const mccData = mccSchema.parse({
      mccCode: result.mcc.code,
      description: result.mcc.description,
      industryCategory: result.mcc.category,
      confidenceScore: result.confidenceScore,
      riskPolicyTags:
        result.riskAssessment.requiresEnhancedReview
          ? ['ENHANCED_REVIEW']
          : ['STANDARD'],
    });

    await this.applicationRepository.updateMcc(applicationId, mccData);

    const now = new Date().toISOString();
    const evaluation: ApplicationEvaluationRecord = {
      applicationId,
      status: 'COMPLETE',
      classification: result,
      summary: result.rationale,
      createdAt: now,
      updatedAt: now,
    };

    await this.applicationRepository.updateEvaluation(applicationId, evaluation);

    return result;
  }

  async evaluateStatement(dto: EvaluateStatementRequest) {
    const { extracted, narrative } = await this.aiClient.extractStatementMetrics(dto);

    const monthlyVolume = Number(extracted.monthlyVolume ?? 0);
    const totalFees = Number(extracted.totalFees ?? 0);
    const chargebackFees = Number(extracted.chargebackFees ?? 0);

    const effectiveRate = calculateEffectiveRate(monthlyVolume, totalFees);
    const chargebackRate = calculateChargebackRate(chargebackFees, monthlyVolume);

    const riskSignals = this.buildStatementRiskSignals(dto, {
      monthlyVolume,
      totalFees,
      processor: extracted.processor,
    });

    return {
      status: 'COMPLETE' as const,
      deterministicMetrics: {
        monthlyVolume,
        totalFees,
        chargebackFees,
        chargebackRate,
        calculatedEffectiveRate: formatPercent(effectiveRate),
      },
      financialMetrics: {
        monthlyVolume,
        totalFees,
        effectiveRate,
        chargebackRate,
      },
      summary: narrative.narrative,
      riskSignals,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async evaluateStatementForApplication(
    applicationId: string,
    dto: EvaluateStatementRequest,
  ) {
    const result = await this.evaluateStatement(dto);

    const now = new Date().toISOString();
    const evaluation: ApplicationEvaluationRecord = {
      applicationId,
      status: 'COMPLETE',
      deterministicMetrics: result.deterministicMetrics,
      riskSignals: result.riskSignals,
      summary: result.summary,
      createdAt: now,
      updatedAt: now,
    };

    await this.applicationRepository.updateEvaluation(applicationId, evaluation);

    return result;
  }

  async getApplicationEvaluation(applicationId: string) {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    return (
      application.evaluation ?? {
        applicationId,
        status: 'PENDING' as const,
      }
    );
  }

  private buildStatementRiskSignals(
    dto: EvaluateStatementRequest,
    metrics: {
      monthlyVolume: number;
      totalFees: number;
      processor?: string;
    },
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const cardMetrics = dto.business?.cardMetrics;

    const averageTicket = Number(cardMetrics?.averageTicketSize ?? 0);
    const highestTicket = Number(cardMetrics?.highestTicketSize ?? 0);
    if (averageTicket > 0 && highestTicket >= averageTicket * 3) {
      signals.push({
        code: 'HIGH_TICKET_OUTLIER',
        severity: 'MEDIUM',
        sourceField: 'business.cardMetrics.highestTicketSize',
        message: `Highest ticket size (${highestTicket}) is at least 3x the average ticket size (${averageTicket}), which may indicate atypical transaction patterns.`,
        evidence: [
          {
            field: 'business.cardMetrics.highestTicketSize',
            source: 'business.cardMetrics',
            value: highestTicket,
          },
          {
            field: 'business.cardMetrics.averageTicketSize',
            source: 'business.cardMetrics',
            value: averageTicket,
          },
        ],
      });
    }

    const ecommercePercentage = Number(cardMetrics?.ecommercePercentage ?? 0);
    const cardNotPresentPercentage = Number(
      cardMetrics?.cardNotPresentPercentage ?? 0,
    );
    if (
      cardMetrics &&
      ecommercePercentage > cardNotPresentPercentage
    ) {
      signals.push({
        code: 'ECOMMERCE_EXCEEDS_CNP',
        severity: 'HIGH',
        sourceField: 'business.cardMetrics.ecommercePercentage',
        message: `Ecommerce percentage (${ecommercePercentage}) exceeds card-not-present percentage (${cardNotPresentPercentage}), which is inconsistent and needs review.`,
        evidence: [
          {
            field: 'business.cardMetrics.ecommercePercentage',
            source: 'business.cardMetrics',
            value: ecommercePercentage,
          },
          {
            field: 'business.cardMetrics.cardNotPresentPercentage',
            source: 'business.cardMetrics',
            value: cardNotPresentPercentage,
          },
        ],
      });
    }

    const processor = (metrics.processor || dto.processor || '').trim();
    const hasNamedProcessor =
      processor.length > 0 && processor !== 'UNKNOWN_PROCESSOR';
    if (
      hasNamedProcessor &&
      (metrics.monthlyVolume <= 0 || metrics.totalFees <= 0)
    ) {
      signals.push({
        code: 'MISSING_STATEMENT_VOLUME_OR_FEES',
        severity: 'HIGH',
        sourceField:
          metrics.monthlyVolume <= 0 ? 'monthlyVolume' : 'totalFees',
        message: `Processor "${processor}" was provided but monthly volume and/or total fees are missing or zero, so fee normalization cannot be trusted.`,
        evidence: [
          {
            field: 'processor',
            source: 'statement',
            value: processor,
          },
          {
            field: 'monthlyVolume',
            source: 'statement',
            value: metrics.monthlyVolume,
          },
          {
            field: 'totalFees',
            source: 'statement',
            value: metrics.totalFees,
          },
        ],
      });
    }

    return signals;
  }
}
