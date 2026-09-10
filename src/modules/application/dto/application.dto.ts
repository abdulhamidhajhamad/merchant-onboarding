import { createZodDto } from 'nestjs-zod';
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

export class CreateApplicantDto extends createZodDto(applicantDtoSchema) {}
export class CreateBusinessDto extends createZodDto(businessDtoSchema) {}
export class UpdateApplicantBodyDto extends createZodDto(updateApplicantBodySchema) {}
export class UpdateBusinessBodyDto extends createZodDto(updateBusinessBodySchema) {}