import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentType } from '../../common/schemas';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; 
class PresignedUrlDto {
  documentType: DocumentType;
  mimeType: string;
}

@Controller('applications/:id/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  async getPresignedUrl(
    @Param('id') applicationId: string,
    @Body() dto: PresignedUrlDto,
  ) {
    return this.documentService.requestDocumentUpload(
      applicationId,
      dto.documentType,
      dto.mimeType,
    );
  }

  @Post(':documentId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm document upload completion and checksum' })
  @ApiResponse({ status: 200, description: 'Document status updated to RECEIVED' })
  async completeUpload(
    @Param('id') applicationId: string,
    @Param('documentId') documentId: string,
    @Body('checksum') checksum: string,
  ) {
    return this.documentService.completeUpload(applicationId, documentId, checksum);
  }
}