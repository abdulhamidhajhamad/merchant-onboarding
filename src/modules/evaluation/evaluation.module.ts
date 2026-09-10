import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EVALUATION_AI_CLIENT } from './adapters/ai-client.interface';
import { MockEvaluationAiClient } from './adapters/mock-ai-client.adapter';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [ConfigModule],
  controllers: [EvaluationController],
  providers: [
    EvaluationService,
    MockEvaluationAiClient,
    {
      provide: EVALUATION_AI_CLIENT,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('EVALUATION_AI_PROVIDER', 'mock');
        if (provider === 'mock') {
          return new MockEvaluationAiClient();
        }
        return new MockEvaluationAiClient();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EvaluationService],
})
export class EvaluationModule {}