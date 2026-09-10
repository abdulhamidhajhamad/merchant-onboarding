import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import type { Applicant, Business } from '@src/common/schemas';
import { DynamoService } from './dynamo.service';

export type ApplicationStatus = 'DRAFT' | string;

export type DocumentLifecycleStatus =
  | 'REQUESTED'
  | 'UPLOADING'
  | 'RECEIVED'
  | 'PROCESSING'
  | 'ACCEPTED'
  | 'NEEDS_REVIEW'
  | 'REJECTED';

export interface DocumentRecord {
  id: string;
  type: string;
  lifecycleStatus: DocumentLifecycleStatus;
  mimeType: string;
  fileSizeBytes: number;
  s3Key: string;
  sha256Checksum?: string;
  uploadedAt?: string | null;
  requestedAt: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmissionSnapshot {
  applicationId: string;
  submittedAt: string;
  status: 'SUBMITTED';
  normalizedPayload: Record<string, unknown>;
}

export interface ApplicationEvaluationRecord {
  applicationId: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED';
  riskSignals?: unknown[];
  deterministicMetrics?: Record<string, unknown>;
  classification?: Record<string, unknown>;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationItem {
  id: string;
  status: string;
  version: number;
  applicant?: Applicant;
  business?: Business;
  mcc?: Record<string, unknown>;
  documents?: DocumentRecord[];
  submissionSnapshot?: SubmissionSnapshot;
  evaluation?: ApplicationEvaluationRecord;
  createdAt: string;
  updatedAt: string;
}

interface ConditionalCheckError {
  name?: string;
}

@Injectable()
export class ApplicationRepository {
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly configService: ConfigService,
  ) {
    this.tableName =
      this.configService.get<string>('APPLICATIONS_TABLE') ?? 'applications';
  }

  async create(id: string): Promise<ApplicationItem> {
    const now = new Date().toISOString();
    const item: ApplicationItem = {
      id,
      status: 'DRAFT',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.dynamoService.documentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
    } catch (error: unknown) {
      if (this.isConditionalCheckFailure(error)) {
        throw new ConflictException(
          `Application with id "${id}" already exists`,
        );
      }

      throw error;
    }

    return item;
  }

  async findById(id: string): Promise<ApplicationItem | null> {
    const response = await this.dynamoService.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    );

    return (response.Item as ApplicationItem | undefined) ?? null;
  }

  async updateApplicant(
    id: string,
    applicantData: Applicant,
  ): Promise<ApplicationItem> {
    return this.executeWithRetry(id, (currentVersion) =>
      this.updateWithConcurrencyControl(id, currentVersion, {
        UpdateExpression: 'SET applicant = :applicant, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeValues: {
          ':applicant': applicantData,
          ':inc': 1,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  async updateBusiness(
    id: string,
    businessData: Business,
  ): Promise<ApplicationItem> {
    return this.executeWithRetry(id, (currentVersion) =>
      this.updateWithConcurrencyControl(id, currentVersion, {
        UpdateExpression: 'SET business = :business, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeValues: {
          ':business': businessData,
          ':inc': 1,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  async updateMcc(
    applicationId: string,
    mccData: Record<string, unknown>,
  ): Promise<ApplicationItem> {
    return this.executeWithRetry(applicationId, (currentVersion) =>
      this.updateWithConcurrencyControl(applicationId, currentVersion, {
        UpdateExpression: 'SET mcc = :mcc, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeValues: {
          ':mcc': mccData,
          ':inc': 1,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<ApplicationItem> {
    return this.executeWithRetry(id, (currentVersion) =>
      this.updateWithConcurrencyControl(id, currentVersion, {
        UpdateExpression: 'SET #status = :status, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':inc': 1,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  async upsertDocumentMetadata(
    applicationId: string,
    document: DocumentRecord,
  ): Promise<ApplicationItem> {
    return this.executeWithRetry(applicationId, async (currentVersion) => {
      const application = await this.findById(applicationId);
      if (!application) {
        throw new ConflictException(
          `Application with id "${applicationId}" does not exist`,
        );
      }

      const documents = Array.isArray(application.documents)
        ? [...application.documents]
        : [];
      const existingIndex = documents.findIndex((item) => item.id === document.id);
      const timestamp = new Date().toISOString();

      const nextDocument: DocumentRecord = {
        ...document,
        createdAt: document.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      if (existingIndex >= 0) {
        documents[existingIndex] = { ...documents[existingIndex], ...nextDocument };
      } else {
        documents.push(nextDocument);
      }

      return this.updateWithConcurrencyControl(applicationId, currentVersion, {
        UpdateExpression:
          'SET documents = :documents, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeValues: {
          ':documents': documents,
          ':inc': 1,
          ':now': timestamp,
        },
      });
    });
  }

  async updateSubmissionSnapshot(
    applicationId: string,
    snapshot: SubmissionSnapshot,
  ): Promise<ApplicationItem> {
    const timestamp = new Date().toISOString();

    return this.executeWithRetry(applicationId, (currentVersion) =>
      this.updateWithConcurrencyControl(applicationId, currentVersion, {
        UpdateExpression:
          'SET submissionSnapshot = :submissionSnapshot, updatedAt = :now, #v = #v + :inc',
        ExpressionAttributeValues: {
          ':submissionSnapshot': snapshot,
          ':inc': 1,
          ':now': timestamp,
        },
      }),
    );
  }

  async updateEvaluation(
    applicationId: string,
    evaluation: ApplicationEvaluationRecord,
  ): Promise<ApplicationItem> {
    const timestamp = new Date().toISOString();

    return this.executeWithRetry(applicationId, (currentVersion) =>
      this.updateWithConcurrencyControl(applicationId, currentVersion, {
        UpdateExpression:
          'SET evaluation = :evaluation, updatedAt = :now, #v = #v + :inc',
        ExpressionAttributeValues: {
          ':evaluation': {
            ...evaluation,
            updatedAt: timestamp,
          },
          ':inc': 1,
          ':now': timestamp,
        },
      }),
    );
  }

  private async executeWithRetry<T>(
    id: string,
    operation: (currentVersion: number) => Promise<T>,
    maxRetries = 5,
    baseDelayMs = 50,
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const application = await this.findById(id);
      if (!application) {
        throw new ConflictException(`Application with id "${id}" does not exist`);
      }

      try {
        return await operation(application.version);
      } catch (error: unknown) {
        if (this.isConditionalCheckFailure(error) && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * baseDelayMs + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      `Max retries reached while resolving optimistic lock for application "${id}"`,
    );
  }

  private async updateWithConcurrencyControl(
    id: string,
    currentVersion: number,
    updateInput: Pick<
      UpdateCommandInput,
      | 'UpdateExpression'
      | 'ExpressionAttributeNames'
      | 'ExpressionAttributeValues'
    >,
  ): Promise<ApplicationItem> {
    const expressionAttributeNames = {
      '#v': 'version',
      ...(updateInput.ExpressionAttributeNames ?? {}),
    };

    try {
      const response = await this.dynamoService.documentClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          ConditionExpression: 'attribute_exists(id) AND version = :currentVersion',
          ExpressionAttributeNames: expressionAttributeNames,
          UpdateExpression: updateInput.UpdateExpression,
          ExpressionAttributeValues: {
            ':currentVersion': currentVersion,
            ...(updateInput.ExpressionAttributeValues ?? {}),
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      if (!response.Attributes) {
        throw new ConflictException(
          `Failed to update application with id "${id}"`,
        );
      }

      return response.Attributes as ApplicationItem;
    } catch (error: unknown) {
      if (this.isConditionalCheckFailure(error)) {
        throw new ConflictException(
          `Application "${id}" was modified concurrently or does not exist`,
        );
      }

      throw error;
    }
  }

  private isConditionalCheckFailure(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as ConditionalCheckError).name === 'ConditionalCheckFailedException'
    );
  }
}