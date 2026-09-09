import { Controller, Post, Get, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { UpdateApplicantBodyDto, UpdateBusinessBodyDto } from './dto/application.dto';

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
}