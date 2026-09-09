import { Controller, Post, Get, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { UpdateApplicantBodyDto, UpdateBusinessBodyDto } from './dto/application.dto';
import { ApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';

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
    return this.applicationService.updateApplicant(id, body.applicant, body.currentVersion);
  }

  @Patch(':id/business')
  async updateBusiness(
    @Param('id') id: string,
    @Body() body: UpdateBusinessBodyDto,
  ) {
    return this.applicationService.updateBusiness(id, body.business, body.currentVersion);
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