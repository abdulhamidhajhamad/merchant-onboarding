import { z } from 'zod';
import { applicantSchema } from '../../../common/schemas/applicant.schema';
import { businessSchema } from '../../../common/schemas/business.schema';

export const applicantDtoSchema = applicantSchema;
export const businessDtoSchema = businessSchema;

export type CreateApplicantDto = z.infer<typeof applicantDtoSchema>;
export type CreateBusinessDto = z.infer<typeof businessDtoSchema>;

export class UpdateApplicantBodyDto {
  applicant: CreateApplicantDto;
  currentVersion: number;
}

export class UpdateBusinessBodyDto {
  business: CreateBusinessDto;
  currentVersion: number;
}