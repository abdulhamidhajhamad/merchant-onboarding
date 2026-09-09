import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('merchant-onboarding')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  @ApiOkResponse({ description: 'Health check' })
  getHealthCheck() {
    return {
      status: 'OK',
      service: 'merchant-onboarding',
      timestamp: new Date().toISOString(),
    };
  }
}