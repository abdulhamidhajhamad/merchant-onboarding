import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DocumentType } from '../../common/schemas';
import { DocumentService } from './document.service';

class PresignedUrlDto {
  documentType: DocumentType;
  mimeType: string;
  fileSizeBytes: number;
}

class CompleteDocumentUploadDto {
  checksum?: string;
  sha256Checksum?: string;
  uploadedAt?: string;
}

@Controller('applications/:id/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  async getPresignedUrl(
    @Param('id') applicationId: string,
    @Body() dto: PresignedUrlDto,
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
    @Param('id') applicationId: string,
    @Body() dto: PresignedUrlDto,
  ) {
    return this.getPresignedUrl(applicationId, dto);
  }

  @Post(':documentId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm document upload completion and checksum' })
  @ApiResponse({ status: 200, description: 'Document status updated to RECEIVED' })
  async completeUpload(
    @Param('id') applicationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: CompleteDocumentUploadDto,
  ) {
    return this.documentService.completeUpload(
      applicationId,
      documentId,
      dto.sha256Checksum ?? dto.checksum,
      dto.uploadedAt,
    );
  }
}