import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentType } from '../../common/schemas';

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
}