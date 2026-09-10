import { z } from 'zod';

export const documentTypeSchema = z.enum([
  'GOVT_ID',
  'BUSINESS_REG',
  'BUSINESS_LICENSE',
  'BANK_EVIDENCE',
  'PROCESSING_STATEMENT',
  'ADDITIONAL_UNDERWRITING',
]);

export const documentLifecycleStatusSchema = z.enum([
  'REQUESTED',
  'UPLOADING',
  'RECEIVED',
  'PROCESSING',
  'ACCEPTED',
  'NEEDS_REVIEW',
  'REJECTED',
]);

export const documentObjectMetadataSchema = z
  .object({
    s3Key: z
      .string()
      .trim()
      .regex(
        /^(?=.{24,512}$)[A-Za-z0-9/_-]+$/,
        'S3 key must be non-guessable, length >= 24, and include only safe key characters',
      ),
    sha256Checksum: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{64}$/, 'Checksum must be a valid SHA-256 hex digest'),
    mimeType: z
      .string()
      .trim()
      .regex(
        /^(application|audio|font|example|image|message|model|multipart|text|video)\/[A-Za-z0-9!#$&^_.+-]+$/,
        'MIME type must be valid',
      ),
    fileSizeBytes: z.number().int().positive(),
    uploadedAt: z
      .string()
      .datetime({ offset: true, message: 'uploadedAt must be ISO-8601' }),
    expiresAt: z
      .string()
      .datetime({ offset: true, message: 'expiresAt must be ISO-8601' }),
  })
  .superRefine((metadata, ctx) => {
    if (Date.parse(metadata.expiresAt) <= Date.parse(metadata.uploadedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'expiresAt must be later than uploadedAt',
      });
    }
  });

export const documentSchema = z.object({
  documentType: documentTypeSchema,
  lifecycleStatus: documentLifecycleStatusSchema,
  objectMetadata: documentObjectMetadataSchema,
});

export const presignRequestSchema = z.object({
  documentType: documentTypeSchema,
  mimeType: z.string().trim().min(1),
  fileSizeBytes: z.number().positive(),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const completeUploadRequestSchema = z
  .object({
    checksum: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .optional(),
    sha256Checksum: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .optional(),
    uploadedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((data) => data.checksum || data.sha256Checksum, {
    message: 'Either checksum or sha256Checksum is required',
  });
export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>;

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentLifecycleStatus = z.infer<typeof documentLifecycleStatusSchema>;
export type DocumentObjectMetadata = z.infer<typeof documentObjectMetadataSchema>;
export type Document = z.infer<typeof documentSchema>;
