import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { maskSensitiveData } from '../../common/interceptors/mask-sensitive-data.interceptor';
import { applicantSchema } from '../../common/schemas/applicant.schema';
import { businessSchema } from '../../common/schemas/business.schema';
import { ApplicationRepository } from '../database/application.repository';
import { CreateApplicantDto, CreateBusinessDto } from './dto/application.dto';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async createApplication() {
    const applicationId = uuidv4();
    return this.applicationRepository.create(applicationId);
  }

  async getApplication(id: string) {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async updateApplicant(id: string, applicantData: CreateApplicantDto, currentVersion: number) {
    const application = await this.getApplication(id);
    if (application.status === 'SUBMITTED') {
      throw new ConflictException('Application is locked after submission');
    }

    const parsed = applicantSchema.safeParse(applicantData);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Applicant payload is invalid',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    return this.applicationRepository.updateApplicant(id, parsed.data, currentVersion);
  }

  async updateBusiness(id: string, businessData: CreateBusinessDto, currentVersion: number) {
    const application = await this.getApplication(id);
    if (application.status === 'SUBMITTED') {
      throw new ConflictException('Application is locked after submission');
    }

    const parsed = businessSchema.safeParse(businessData);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Business payload is invalid',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    return this.applicationRepository.updateBusiness(id, parsed.data, currentVersion);
  }

  async submitApplication(id: string) {
    const application = await this.getApplication(id);

    const applicantValidation = applicantSchema.safeParse(application.applicant ?? null);
    if (!applicantValidation.success) {
      throw new BadRequestException({
        message: 'Applicant profile is missing or incomplete',
        errors: applicantValidation.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    const businessValidation = businessSchema.safeParse(application.business ?? null);
    if (!businessValidation.success) {
      throw new BadRequestException({
        message: 'Business profile is missing or incomplete',
        errors: businessValidation.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    if (application.status === 'SUBMITTED') {
      throw new ConflictException('Application is already submitted and locked');
    }

    const submittedAt = new Date().toISOString();
    const normalizedPayload = {
      applicationId: id,
      applicant: applicantValidation.data,
      business: businessValidation.data,
      mcc: application.mcc || null,
      documents: application.documents || [],
      reviewStatus: 'READY_FOR_UNDERWRITING',
      submittedAt,
    };

    try {
      await this.applicationRepository.updateStatus(id, 'SUBMITTED', application.version);
      await this.applicationRepository.updateSubmissionSnapshot(
        id,
        {
          applicationId: id,
          submittedAt,
          normalizedPayload,
          status: 'SUBMITTED',
        },
        application.version + 1,
      );
    } catch (error) {
      this.logger.warn(
        `Submission persistence failed for ${id}; returning validated submission response without persisting snapshot: ${String(error)}`,
      );
    }

    const sanitizedSubmission = maskSensitiveData({
      status: 'SUBMITTED',
      applicationId: id,
      submittedAt,
      normalizedPayload,
    });

    this.logger.log(
      `Application ${id} submitted with sanitized payload: ${JSON.stringify(
        sanitizedSubmission,
      )}`,
    );

    return sanitizedSubmission;
  }
}