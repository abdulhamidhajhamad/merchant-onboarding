import {
  completeUploadRequestSchema,
  presignRequestSchema,
} from './document.schema';

describe('document request schemas', () => {
  const validPresign = {
    documentType: 'BANK_EVIDENCE' as const,
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
  };

  const validChecksum =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  describe('presignRequestSchema', () => {
    it('accepts a valid payload', () => {
      const result = presignRequestSchema.safeParse(validPresign);
      expect(result.success).toBe(true);
    });

    it('rejects a missing documentType', () => {
      const { documentType: _removed, ...withoutType } = validPresign;
      const result = presignRequestSchema.safeParse(withoutType);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes('documentType')),
        ).toBe(true);
      }
    });

    it('rejects an invalid documentType enum value', () => {
      const result = presignRequestSchema.safeParse({
        ...validPresign,
        documentType: 'GOVERNMENT_ID',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes('documentType')),
        ).toBe(true);
      }
    });

    it('rejects zero or negative fileSizeBytes', () => {
      expect(
        presignRequestSchema.safeParse({ ...validPresign, fileSizeBytes: 0 }).success,
      ).toBe(false);
      expect(
        presignRequestSchema.safeParse({ ...validPresign, fileSizeBytes: -1 }).success,
      ).toBe(false);
    });
  });

  describe('completeUploadRequestSchema', () => {
    it('accepts a valid sha256Checksum payload', () => {
      const result = completeUploadRequestSchema.safeParse({
        sha256Checksum: validChecksum,
        uploadedAt: '2026-01-15T12:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a checksum that is not exactly 64 hex characters', () => {
      const result = completeUploadRequestSchema.safeParse({
        checksum: 'not-a-sha256',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes('checksum') || issue.path.includes('sha256Checksum'),
          ),
        ).toBe(true);
      }
    });

    it('rejects when both checksum fields are missing', () => {
      const result = completeUploadRequestSchema.safeParse({
        uploadedAt: '2026-01-15T12:00:00.000Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) =>
            issue.message.includes('checksum or sha256Checksum'),
          ),
        ).toBe(true);
      }
    });
  });
});
