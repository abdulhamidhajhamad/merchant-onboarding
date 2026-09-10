import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { RiskPolicyService } from './risk-policy.service';
import { MccModule } from '../mcc/mcc.module';

@Module({
  imports: [MccModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, RiskPolicyService],
  exports: [EvaluationService, RiskPolicyService],
})
export class EvaluationModule {}