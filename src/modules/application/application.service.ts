import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationRepository } from '../database/application.repository';
import { CreateApplicantDto, CreateBusinessDto } from './dto/application.dto';

@Injectable()
export class ApplicationService {
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
    await this.getApplication(id);
    return this.applicationRepository.updateApplicant(id, applicantData, currentVersion);
  }

  async updateBusiness(id: string, businessData: CreateBusinessDto, currentVersion: number) {
    await this.getApplication(id);
    return this.applicationRepository.updateBusiness(id, businessData, currentVersion);
  }
}