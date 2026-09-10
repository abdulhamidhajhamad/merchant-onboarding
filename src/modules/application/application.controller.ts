import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import {
  updateApplicantBodySchema,
  updateBusinessBodySchema,
  type UpdateApplicantBodyDto,
  type UpdateBusinessBodyDto,
} from './dto/application.dto';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create() {
    return this.applicationService.createApplication();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.applicationService.getApplication(id);
  }

  @Patch(':id/applicant')
  async updateApplicant(
    @Param('id') id: string,
    @Body() body: UpdateApplicantBodyDto,
  ) {
    const parsed = updateApplicantBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Applicant update payload is invalid',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    return this.applicationService.updateApplicant(
      id,
      parsed.data.applicant,
    );
  }

  @Patch(':id/business')
  async updateBusiness(
    @Param('id') id: string,
    @Body() body: UpdateBusinessBodyDto,
  ) {
    const parsed = updateBusinessBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Business update payload is invalid',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    return this.applicationService.updateBusiness(
      id,
      parsed.data.business,
    );
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate required fields, lock application version, and submit for review' })
  @ApiResponse({ status: 200, description: 'Application successfully submitted' })
  @ApiResponse({ status: 400, description: 'Missing required applicant or business data' })
  async submit(@Param('id') id: string) {
    return this.applicationService.submitApplication(id);
  }
}