import { z } from 'zod';
import { applicantSchema } from '../../../common/schemas/applicant.schema';
import { businessSchema } from '../../../common/schemas/business.schema';

export const applicantDtoSchema = applicantSchema;
export const businessDtoSchema = businessSchema;

export const updateApplicantBodySchema = z.object({
  applicant: applicantDtoSchema,
  currentVersion: z.number().int().nonnegative(),
});

export const updateBusinessBodySchema = z.object({
  business: businessDtoSchema,
  currentVersion: z.number().int().nonnegative(),
});

export type CreateApplicantDto = z.infer<typeof applicantDtoSchema>;
export type CreateBusinessDto = z.infer<typeof businessDtoSchema>;
export type UpdateApplicantBodyDto = z.infer<typeof updateApplicantBodySchema>;
export type UpdateBusinessBodyDto = z.infer<typeof updateBusinessBodySchema>;
