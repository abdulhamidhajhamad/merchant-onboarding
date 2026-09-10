import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ApplicationRepository, type DocumentRecord } from '../database/application.repository';
import { DocumentType, documentSchema } from '../../common/schemas/document.schema';
import { S3Service } from './s3.service';

type DocumentStatus = z.infer<typeof documentSchema>['lifecycleStatus'];

const SUPPORTED_MIME_TYPES = new Map<string, string>([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
    fileSizeBytes?: number,
  ) {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const validatedMimeType = this.validateMimeType(mimeType);
    const validatedFileSize = this.validateFileSize(fileSizeBytes);
    const documentId = uuidv4();
    const extension = SUPPORTED_MIME_TYPES.get(validatedMimeType) ?? '.bin';
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
    const s3Key = `applications/${applicationId}/documents/${documentId}${extension}`;

    const documentRecord: DocumentRecord = {
      id: documentId,
      type: documentType,
      lifecycleStatus: 'REQUESTED',
      s3Key,
      mimeType: validatedMimeType,
      fileSizeBytes: validatedFileSize,
      requestedAt,
      expiresAt,
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };

    await this.applicationRepository.upsertDocumentMetadata(
      applicationId,
      documentRecord,
    );

    const { presignedUrl } = await this.s3Service.generatePresignedUploadUrl(
      s3Key,
      validatedMimeType,
      900,
    );

    const uploadingDocument: DocumentRecord = {
      ...documentRecord,
      lifecycleStatus: 'UPLOADING',
      updatedAt: new Date().toISOString(),
    };

    await this.applicationRepository.upsertDocumentMetadata(
      applicationId,
      uploadingDocument,
    );

    return {
      documentId,
      uploadUrl: presignedUrl,
      expiresIn: 900,
      documentMetadata: {
        ...uploadingDocument,
        status: uploadingDocument.lifecycleStatus,
      },
    };
  }

  async completeUpload(
    applicationId: string,
    documentId: string,
    checksum?: string,
    uploadedAt?: string,
  ) {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const documents = Array.isArray(application.documents) ? application.documents : [];
    const document = documents.find((item) => item.id === documentId);
    if (!document) {
      throw new NotFoundException(
        `Document with ID ${documentId} not found for application ${applicationId}`,
      );
    }

    const normalizedChecksum = this.normalizeChecksum(checksum ?? document.sha256Checksum);
    if (!normalizedChecksum) {
      throw new BadRequestException('A valid sha256Checksum is required.');
    }

    const nextStatus: DocumentStatus = 'RECEIVED';
    this.validateLifecycleTransition(document.lifecycleStatus, nextStatus);

    const existingChecksum = document.sha256Checksum?.toLowerCase();
    if (existingChecksum === normalizedChecksum.toLowerCase()) {
      return {
        applicationId,
        documentId,
        checksum: normalizedChecksum,
        lifecycleStatus: document.lifecycleStatus,
        uploadedAt: document.uploadedAt ?? uploadedAt ?? new Date().toISOString(),
        idempotent: true,
      };
    }

    const completionTimestamp = uploadedAt ?? new Date().toISOString();
    const updatedDocument: DocumentRecord = {
      ...document,
      sha256Checksum: normalizedChecksum,
      uploadedAt: completionTimestamp,
      lifecycleStatus: 'RECEIVED',
      updatedAt: new Date().toISOString(),
    };

    await this.applicationRepository.upsertDocumentMetadata(
      applicationId,
      updatedDocument,
    );

    return {
      applicationId,
      documentId,
      checksum: normalizedChecksum,
      lifecycleStatus: 'RECEIVED',
      uploadedAt: completionTimestamp,
      idempotent: false,
    };
  }

  private validateMimeType(mimeType: string): string {
    const normalizedType = mimeType.trim().toLowerCase();
    if (!SUPPORTED_MIME_TYPES.has(normalizedType)) {
      throw new BadRequestException(
        'Unsupported MIME type. Allowed types: application/pdf, image/jpeg, image/png.',
      );
    }
    return normalizedType;
  }

  private validateFileSize(fileSizeBytes?: number): number {
    if (typeof fileSizeBytes !== 'number' || !Number.isFinite(fileSizeBytes)) {
      throw new BadRequestException('fileSizeBytes is required and must be a number.');
    }

    if (fileSizeBytes <= 0 || fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size must be greater than 0 and no larger than ${MAX_FILE_SIZE_BYTES} bytes.`,
      );
    }

    return fileSizeBytes;
  }

  private normalizeChecksum(checksum?: string): string | null {
    if (!checksum) {
      return null;
    }

    const normalized = checksum.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
      return null;
    }

    return normalized.toLowerCase();
  }

  private validateLifecycleTransition(
    currentStatus: DocumentStatus | undefined,
    nextStatus: DocumentStatus,
  ): void {
    const allowedTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      REQUESTED: ['UPLOADING'],
      UPLOADING: ['RECEIVED'],
      RECEIVED: ['PROCESSING'],
      PROCESSING: ['ACCEPTED', 'NEEDS_REVIEW', 'REJECTED'],
      ACCEPTED: [],
      NEEDS_REVIEW: [],
      REJECTED: [],
    };

    const effectiveCurrentStatus = currentStatus ?? 'REQUESTED';
    const validProgression = allowedTransitions[effectiveCurrentStatus] ?? [];

    if (!validProgression.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid document lifecycle transition from ${effectiveCurrentStatus} to ${nextStatus}.`,
      );
    }
  }
}