import { z } from 'zod';

export const riskSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const sourceDocumentTypeSchema = z.enum([
  'GOVT_ID',
  'BUSINESS_REG',
  'BUSINESS_LICENSE',
  'BANK_EVIDENCE',
  'PROCESSING_STATEMENT',
  'ADDITIONAL_UNDERWRITING',
]);

export const salesChannelSchema = z.enum([
  'ONLINE',
  'IN_STORE',
  'B2B',
  'OMNICHANNEL',
  'OTHER',
]);

export const fulfillmentModelSchema = z.enum([
  'SHIP_TO_HOME',
  'PICKUP',
  'DIGITAL_GOODS',
  'SERVICE',
  'OTHER',
]);

export const recurringBehaviorSchema = z.enum(['SUBSCRIPTION', 'ONE_TIME', 'HYBRID']);
export const customerTypeSchema = z.enum(['CONSUMER', 'BUSINESS', 'GOVERNMENT', 'HYBRID']);

export const merchantOwnerSchema = z.object({
  name: z.string().trim().max(200).optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
});

export const cardMetricsSchema = z.object({
  expectedAnnualVolume: z.number().min(0).optional(),
  averageTicketSize: z.number().min(0).optional(),
  highestTicketSize: z.number().min(0).optional(),
  monthlyTransactionCount: z.number().min(0).optional(),
  cardPresentPercentage: z.number().min(0).max(100).optional(),
  cardNotPresentPercentage: z.number().min(0).max(100).optional(),
  ecommercePercentage: z.number().min(0).max(100).optional(),
});

export const merchantProfileSchema = z
  .object({
    legalName: z.string().trim().min(1).max(200).optional(),
    salesChannel: salesChannelSchema.optional(),
    geography: z.string().trim().min(1).max(120).optional(),
    fulfillmentModel: fulfillmentModelSchema.optional(),
    recurringBehavior: recurringBehaviorSchema.optional(),
    customerType: customerTypeSchema.optional(),
    beneficialOwners: z.array(merchantOwnerSchema).optional(),
    cardMetrics: cardMetricsSchema.optional(),
  })
  .passthrough();

export const classifyBusinessRequestSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  business: merchantProfileSchema.optional(),
});

export const classificationCandidateSchema = z.object({
  mccCode: z.string().regex(/^\d{4}$/),
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().min(10).max(500),
  riskTags: z.array(z.enum(['STANDARD', 'ENHANCED_REVIEW', 'RESTRICTED'])).default(['STANDARD']),
});

export const aiClassificationResultSchema = z.object({
  candidates: z.array(classificationCandidateSchema).min(1).max(5),
  summary: z.string().trim().min(10).max(500),
});

export const extractedStatementMetricsSchema = z.object({
  processor: z.string().trim().max(200).optional(),
  monthlyVolume: z.number().min(0).optional(),
  totalFees: z.number().min(0).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  effectiveRate: z.number().min(0).max(1).optional(),
  transactionFees: z.number().min(0).optional(),
  monthlyFees: z.number().min(0).optional(),
  chargebackFees: z.number().min(0).optional(),
  statementPeriod: z.string().trim().max(120).optional(),
  statementText: z.string().trim().max(10000).optional(),
});

export const evaluateStatementRequestSchema = z.object({
  processor: z.string().trim().max(200).optional(),
  monthlyVolume: z.number().min(0).optional(),
  totalFees: z.number().min(0).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  effectiveRate: z.number().min(0).max(1).optional(),
  transactionFees: z.number().min(0).optional(),
  monthlyFees: z.number().min(0).optional(),
  chargebackFees: z.number().min(0).optional(),
  statementPeriod: z.string().trim().max(120).optional(),
  business: merchantProfileSchema.optional(),
  statementText: z.string().trim().max(10000).optional(),
}).passthrough();

export const evidenceRefSchema = z.object({
  field: z.string().trim().min(1),
  documentType: sourceDocumentTypeSchema.optional(),
  source: z.string().trim().min(1),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
});

export const riskSignalSchema = z.object({
  code: z.string().trim().min(1).max(120),
  severity: riskSeveritySchema,
  sourceField: z.string().trim().min(1).max(200),
  documentType: sourceDocumentTypeSchema.optional(),
  message: z.string().trim().min(10).max(500),
  evidence: z.array(evidenceRefSchema).optional(),
});

export const extractedStatementNarrativeSchema = z.object({
  summary: z.string().trim().min(10).max(500),
  narrative: z.string().trim().min(10).max(500),
});

export type MerchantProfile = z.infer<typeof merchantProfileSchema>;
export type ClassifyBusinessRequest = z.infer<typeof classifyBusinessRequestSchema>;
export type AiClassificationResult = z.infer<typeof aiClassificationResultSchema>;
export type StatementMetrics = z.infer<typeof extractedStatementMetricsSchema>;
export type EvaluateStatementRequest = z.infer<typeof evaluateStatementRequestSchema>;
export type RiskSignal = z.infer<typeof riskSignalSchema>;
export type ExtractedStatementNarrative = z.infer<typeof extractedStatementNarrativeSchema>;
