import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './modules/database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { MccModule } from './modules/mcc/mcc.module';
import { ApplicationModule } from './modules/application/application.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { MaskSensitiveDataInterceptor } from './common/interceptors/mask-sensitive-data.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    DatabaseModule,
    DocumentModule,
    MccModule,
    ApplicationModule,
    EvaluationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MaskSensitiveDataInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new TimeoutInterceptor(35000),
    },
  ],
})
export class AppModule {}
