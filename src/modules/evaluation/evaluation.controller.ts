import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';

@ApiTags('Evaluation & AI')
@Controller('applications')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose MCC and risk tags based on business description' })
  @ApiResponse({ status: 200, description: 'MCC classification proposal' })
  async classify(@Body('description') description: string) {
    return this.evaluationService.classifyBusiness(description || '');
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze processing statement and calculate deterministic rates with risk signals' })
  @ApiResponse({ status: 200, description: 'Underwriting evaluation summary' })
  async evaluate(@Body() body: any) {
    return this.evaluationService.evaluateStatement(body);
  }
}