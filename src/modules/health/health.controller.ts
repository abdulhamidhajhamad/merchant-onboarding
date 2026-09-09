import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  getHealthCheck() {
    return {
      status: 'OK',
      service: 'merchant-onboarding',
      timestamp: new Date().toISOString(),
    };
  }
}
