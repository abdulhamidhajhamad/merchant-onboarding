import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  classifyBusinessRequestSchema,
  evaluateStatementRequestSchema,
  type ClassifyBusinessRequest,
  type EvaluateStatementRequest,
} from '../../common/schemas/evaluation.schema';
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

  @Post(':id/classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Persist an MCC classification result for a given application' })
  @ApiResponse({ status: 200, description: 'Application-scoped MCC classification proposal' })
  async classifyForApplication(
    @Param('id') applicationId: string,
    @Body(new ZodValidationPipe(classifyBusinessRequestSchema)) dto: ClassifyBusinessRequest,
  ) {
    return this.evaluationService.classifyBusinessForApplication(applicationId, dto);
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

  @Post(':id/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze processing statement and persist underwriting result for an application' })
  @ApiResponse({ status: 200, description: 'Persisted application evaluation summary' })
  async evaluateForApplication(
    @Param('id') applicationId: string,
    @Body(new ZodValidationPipe(evaluateStatementRequestSchema)) dto: EvaluateStatementRequest,
  ) {
    return this.evaluationService.evaluateStatementForApplication(applicationId, dto);
  }

  @Get(':id/evaluation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve stored evaluation state for an application' })
  @ApiResponse({ status: 200, description: 'Stored evaluation result' })
  async getEvaluationForApplication(@Param('id') applicationId: string) {
    return this.evaluationService.getApplicationEvaluation(applicationId);
  }
}