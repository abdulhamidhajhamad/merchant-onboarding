import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:4569';
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'merchant-documents-local';

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, 
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'S3RVER',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'S3RVER',
      },
    });
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 900,
  ): Promise<{ presignedUrl: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256', 
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    return { presignedUrl, key };
  }
}