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

export const applicantIdTypeSchema = z.enum([
  'SSN',
  'PASSPORT',
  'NATIONAL_ID',
  'DRIVERS_LICENSE',
  'OTHER',
]);

export const applicantSchema = z.object({
  legalFirstName: z.string().trim().min(1).max(100),
  legalMiddleName: z.string().trim().min(1).max(100).optional(),
  legalLastName: z.string().trim().min(1).max(100),
  dateOfBirth: isoDateOnlySchema,
  residentialAddress: applicantAddressSchema,
  contact: z.object({
    email: z.string().trim().email(),
    phone: e164PhoneSchema,
  }),
  businessRoleTitle: z.string().trim().min(1).max(120),
  ownershipPercentage: z.number().min(0).max(100),
  identityMetadata: z.object({
    idType: applicantIdTypeSchema,
    maskedIdentifier: z
      .string()
      .regex(/^\d{4}$/, 'Masked identifier must store only the last 4 digits'),
  }),
  attestation: z.object({
    consentTimestamp: z
      .string()
      .datetime({ offset: true, message: 'Consent timestamp must be ISO-8601' }),
    termsVersionAccepted: z.string().trim().min(1).max(50),
  }),
});

export type ApplicantAddress = z.infer<typeof applicantAddressSchema>;
export type ApplicantIdType = z.infer<typeof applicantIdTypeSchema>;
export type Applicant = z.infer<typeof applicantSchema>;
