import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  completeUploadRequestSchema,
  presignRequestSchema,
  type CompleteUploadRequest,
  type PresignRequest,
} from '../../common/schemas';
import { DocumentService } from './document.service';

@Controller('applications/:id/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  async getPresignedUrl(
    @Param('id', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body(new ZodValidationPipe(presignRequestSchema)) dto: PresignRequest,
  ) {
    return this.documentService.requestDocumentUpload(
      applicationId,
      dto.documentType,
      dto.mimeType,
      dto.fileSizeBytes,
    );
  }

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  async getPresignedUrlLegacy(
    @Param('id', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body(new ZodValidationPipe(presignRequestSchema)) dto: PresignRequest,
  ) {
    return this.getPresignedUrl(applicationId, dto);
  }

  @Post(':documentId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm document upload completion and checksum' })
  @ApiResponse({ status: 200, description: 'Document status updated to RECEIVED' })
  async completeUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Body(new ZodValidationPipe(completeUploadRequestSchema))
    dto: CompleteUploadRequest,
  ) {
    return this.documentService.completeUpload(
      applicationId,
      documentId,
      dto.sha256Checksum ?? dto.checksum,
      dto.uploadedAt,
    );
  }
}
