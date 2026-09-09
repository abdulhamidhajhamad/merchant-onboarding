import { Module } from '@nestjs/common';
import { ApplicationRepository } from './application.repository';
import { DynamoService } from './dynamo.service';

@Module({
  providers: [DynamoService, ApplicationRepository],
  exports: [DynamoService, ApplicationRepository],
})
export class DatabaseModule {}
