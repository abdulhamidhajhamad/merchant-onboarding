import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  classifyBusinessRequestSchema,
  evaluateStatementRequestSchema,
  type ClassifyBusinessRequest,
  type EvaluateStatementRequest,
} from '../../common/schemas/evaluation.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EvaluationService } from './evaluation.service';

@ApiTags('Evaluation & AI')
@Controller('applications')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose MCC and risk tags based on business description' })
  @ApiResponse({ status: 200, description: 'MCC classification proposal' })
  async classify(
    @Body(new ZodValidationPipe(classifyBusinessRequestSchema)) dto: ClassifyBusinessRequest,
  ) {
    return this.evaluationService.classifyBusiness(dto);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze processing statement and calculate deterministic rates with risk signals' })
  @ApiResponse({ status: 200, description: 'Underwriting evaluation summary' })
  async evaluate(
    @Body(new ZodValidationPipe(evaluateStatementRequestSchema)) dto: EvaluateStatementRequest,
  ) {
    return this.evaluationService.evaluateStatement(dto);
  }
}