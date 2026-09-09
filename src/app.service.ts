import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck() {
    return {
      status: 'OK',
      service: 'merchant-onboarding',
      timestamp: new Date().toISOString(),
    };
  }
}