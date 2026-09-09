import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DocumentController],
  providers: [S3Service, DocumentService],
  exports: [DocumentService, S3Service],
})
export class DocumentModule {}