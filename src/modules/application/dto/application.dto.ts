import { applicantSchema } from '../../../common/schemas/applicant.schema';
import { businessSchema } from '../../../common/schemas/business.schema';
import { z } from 'zod';

export type CreateApplicantDto = z.infer<typeof applicantSchema>;
export type CreateBusinessDto = z.infer<typeof businessSchema>;

export class UpdateApplicantBodyDto {
  applicant: CreateApplicantDto;
  currentVersion: number;
}

export class UpdateBusinessBodyDto {
  business: CreateBusinessDto;
  currentVersion: number;
}