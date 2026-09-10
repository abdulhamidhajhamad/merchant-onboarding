import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { RiskPolicyService } from './risk-policy.service';
import { MccModule } from '../mcc/mcc.module';
import { DatabaseModule } from '../database/database.module';
import { EVALUATION_AI_CLIENT } from './adapters/ai-client.interface';
import { MockEvaluationAiClient } from './adapters/mock-ai-client.adapter';

@Module({
  imports: [MccModule, DatabaseModule],
  controllers: [EvaluationController],
  providers: [
    EvaluationService,
    RiskPolicyService,
    { provide: EVALUATION_AI_CLIENT, useClass: MockEvaluationAiClient },
  ],
  exports: [EvaluationService, RiskPolicyService],
})
export class EvaluationModule {}
