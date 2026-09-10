import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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

  async updateApplicant(id: string, applicantData: CreateApplicantDto) {
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

    return this.applicationRepository.updateApplicant(id, parsed.data);
  }

  async updateBusiness(id: string, businessData: CreateBusinessDto) {
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

    return this.applicationRepository.updateBusiness(id, parsed.data);
  }

  async submitApplication(id: string) {
    const application = await this.getApplication(id);

    if (application.status === 'SUBMITTED') {
      throw new ConflictException('Application is already submitted and locked');
    }

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

    const documents = application.documents || [];
    const requiredDocumentTypes = ['GOVERNMENT_ID', 'BUSINESS_REGISTRATION', 'BANK_EVIDENCE'];

    for (const reqType of requiredDocumentTypes) {
      const doc = documents.find((d: any) => d.type === reqType);
      
      if (!doc || !['RECEIVED', 'ACCEPTED'].includes(doc.lifecycleStatus)) {
        throw new BadRequestException({
          message: `Submission blocked: Required document '${reqType}' is missing or not in a valid state.`,
          documentType: reqType,
          currentStatus: doc ? doc.lifecycleStatus : 'MISSING',
        });
      }
    }

    const submittedAt = new Date().toISOString();
    const normalizedPayload = {
      applicationId: id,
      applicant: applicantValidation.data,
      business: businessValidation.data,
      // Populated by EvaluationService.classifyBusinessForApplication via updateMcc;
      // null only when classify has not been run for this application yet.
      mcc: application.mcc || null,
      documents: documents,
      reviewStatus: 'READY_FOR_UNDERWRITING',
      submittedAt,
    };

    await this.applicationRepository.updateStatus(id, 'SUBMITTED');
    await this.applicationRepository.updateSubmissionSnapshot(id, {
      applicationId: id,
      submittedAt,
      normalizedPayload,
      status: 'SUBMITTED',
    });

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