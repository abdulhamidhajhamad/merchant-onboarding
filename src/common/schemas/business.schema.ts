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
  'SOLE_PROPRIETOR',
  'NONPROFIT',
  'OTHER',
]);

export const businessRegistrationTypeSchema = z.enum([
  'TAX_ID',
  'EIN',
  'UBI',
  'LOCAL_BUSINESS_REGISTRATION',
]);

export const businessAddressSchema = z.object({
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80),
  stateProvince: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(2).max(20),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, 'Country must be ISO 3166-1 alpha-2 uppercase'),
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
  accountLast4: z
    .string()
    .regex(/^\d{4}$/, 'Account field must only include the last 4 digits'),
});

export const businessSchema = z
  .object({
    legalBusinessName: z.string().trim().min(1).max(200),
    dbaTradeName: z.string().trim().min(1).max(200),
    entityType: businessEntityTypeSchema,
    formationCountry: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/, 'Formation country must be ISO 3166-1 alpha-2 uppercase'),
    formationStateProvince: z.string().trim().min(1).max(80),
    registrationIdentifier: z.object({
      type: businessRegistrationTypeSchema,
      value: z.string().trim().min(3).max(64),
    }),
    registeredAddress: businessAddressSchema,
    operatingAddress: businessAddressSchema,
    websiteUrl: z.string().trim().url(),
    customerFacingDescription: z.string().trim().min(10).max(2000),
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
    requestedSettlementBank: settlementBankMetadataSchema,
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
export type Business = z.infer<typeof businessSchema>;
