import { z } from 'zod';

const isoDateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in ISO format YYYY-MM-DD')
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    'Date must be a valid calendar date',
  );

export const businessEntityTypeSchema = z.enum([
  'LLC',
  'CORPORATION',
  'PARTNERSHIP',
  'SOLE_PROPRIETORSHIP',
  'NON_PROFIT',
  'OTHER',
]);

export const businessRegistrationTypeSchema = z.enum([
  'TAX_ID',
  'EIN',
  'UBI',
  'LOCAL_BUSINESS_REGISTRATION',
]);

export const businessAddressSchema = z.object({
  addressLine1: z.string().trim().min(1).max(120),
  addressLine2: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  province: z.string().trim().min(1).max(80).optional(),
  postalCode: z.string().trim().min(2).max(20),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2,3}$/, 'Country must be ISO alpha-2 or alpha-3 uppercase'),
});

export const settlementBankMetadataSchema = z.object({
  bankName: z.string().trim().min(1).max(120),
  accountHolder: z.string().trim().min(1).max(120),
  routingNumberMasked: z
    .string()
    .trim()
    .regex(
      /^(?:\*{0,5}\d{4})$/,
      'Routing number must be masked and only include optional mask chars plus last 4 digits',
    ),
  accountNumberMasked: z
    .string()
    .trim()
    .regex(
      /^(?:\*{0,6}\d{4})$/,
      'Account number must be masked and only include optional mask chars plus last 4 digits',
    ),
});

export const beneficialOwnerSchema = z.object({
  applicantId: z.string().trim().min(1),
  ownershipPercentage: z.number().min(0).max(100),
  relationship: z.string().trim().min(1).max(120).optional(),
});

export const processingHistorySchema = z.object({
  existingProcessorName: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(1000).optional(),
});

export const businessSchema = z
  .object({
    legalName: z.string().trim().min(1).max(200),
    dba: z.string().trim().min(1).max(200).optional(),
    entityType: businessEntityTypeSchema,
    formationCountry: z
      .string()
      .trim()
      .regex(/^[A-Z]{2,3}$/, 'Formation country must be ISO alpha-2 or alpha-3 uppercase'),
    formationState: z.string().trim().min(1).max(80),
    registrationIdentifier: z.object({
      type: businessRegistrationTypeSchema,
      value: z.string().trim().min(3).max(64),
    }),
    registeredAddress: businessAddressSchema,
    operatingAddress: businessAddressSchema,
    website: z.string().trim().url(),
    businessDescription: z.string().trim().min(10).max(2000),
    businessStartDate: isoDateOnlySchema,
    cardVolumeMetrics: z.object({
      expectedAnnualVolume: z.number().positive(),
      averageTicketSize: z.number().positive(),
      highestTicketSize: z.number().positive(),
      monthlyTransactionCount: z.number().int().positive(),
      cardPresentPercentage: z.number().min(0).max(100),
      cardNotPresentPercentage: z.number().min(0).max(100),
      ecommercePercentage: z.number().min(0).max(100),
    }),
    beneficialOwners: z.array(beneficialOwnerSchema).optional(),
    requestedSettlementBank: settlementBankMetadataSchema,
    existingProcessorName: z.string().trim().max(200).optional(),
    processingHistory: processingHistorySchema.optional(),
  })
  .superRefine((business, ctx) => {
    const {
      cardPresentPercentage,
      cardNotPresentPercentage,
      ecommercePercentage,
    } = business.cardVolumeMetrics;

    if (cardPresentPercentage + cardNotPresentPercentage !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cardVolumeMetrics', 'cardNotPresentPercentage'],
        message: 'Card-present and CNP percentages must sum exactly to 100',
      });
    }

    if (ecommercePercentage > cardNotPresentPercentage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cardVolumeMetrics', 'ecommercePercentage'],
        message: 'E-commerce percentage cannot exceed card-not-present percentage',
      });
    }
  });

export type BusinessEntityType = z.infer<typeof businessEntityTypeSchema>;
export type BusinessRegistrationType = z.infer<typeof businessRegistrationTypeSchema>;
export type BusinessAddress = z.infer<typeof businessAddressSchema>;
export type SettlementBankMetadata = z.infer<typeof settlementBankMetadataSchema>;
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;
export type ProcessingHistory = z.infer<typeof processingHistorySchema>;
export type Business = z.infer<typeof businessSchema>;
