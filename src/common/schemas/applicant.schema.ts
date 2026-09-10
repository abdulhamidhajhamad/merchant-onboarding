import { z } from 'zod';

const isoDateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in ISO format YYYY-MM-DD')
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    'Date must be a valid calendar date',
  );

const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in strict E.164 format');

export const applicantAddressSchema = z.object({
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

export const applicantIdTypeSchema = z.enum([
  'SSN',
  'PASSPORT',
  'NATIONAL_ID',
  'DRIVERS_LICENSE',
  'OTHER',
]);

export const applicantSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: isoDateOnlySchema,
  residentialAddress: applicantAddressSchema,
  contact: z.object({
    email: z.string().trim().email(),
    phone: e164PhoneSchema,
  }),
  role: z.string().trim().min(1).max(120),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  identityMetadata: z.object({
    idType: applicantIdTypeSchema,
    maskedIdentifier: z
      .string()
      .regex(
        /^(?:\*{0,5}\d{4}|[A-Z0-9]{4,12})$/,
        'Masked identifier must be a safe last-4 pattern or normalized identifier',
      ),
  }),
  attestation: z.object({
    termsAccepted: z.boolean(),
    termsVersion: z.string().trim().min(1).max(50),
    consentedAt: z
      .string()
      .datetime({ offset: true, message: 'consentedAt must be ISO-8601' }),
  }),
});

export type ApplicantAddress = z.infer<typeof applicantAddressSchema>;
export type ApplicantIdType = z.infer<typeof applicantIdTypeSchema>;
export type Applicant = z.infer<typeof applicantSchema>;
