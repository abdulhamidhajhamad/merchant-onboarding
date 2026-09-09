import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { S3Service } from './s3.service';
import { ApplicationRepository } from '../database/application.repository';
import { DocumentType, documentSchema } from '../../common/schemas/document.schema';

type DocumentStatus = z.infer<typeof documentSchema>['lifecycleStatus'];

@Injectable()
export class DocumentService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async requestDocumentUpload(
    applicationId: string,
    documentType: DocumentType,
    mimeType: string,
  ) {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const documentId = uuidv4();
    const fileExtension = mimeType.split('/')[1] || 'bin';
    const s3Key = `applications/${applicationId}/docs/${documentId}.${fileExtension}`;

    const { presignedUrl } = await this.s3Service.generatePresignedUploadUrl(s3Key, mimeType);

    const documentMetadata = {
      id: documentId,
      type: documentType,
      status: 'REQUESTED' as DocumentStatus,
      s3Key,
      mimeType,
      requestedAt: new Date().toISOString(),
    };

    return {
      documentId,
      uploadUrl: presignedUrl,
      expiresIn: 900,
      documentMetadata,
    };
  }
}