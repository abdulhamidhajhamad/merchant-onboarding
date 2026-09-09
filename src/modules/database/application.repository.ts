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

export interface ApplicationItem {
  id: string;
  status: ApplicationStatus;
  version: number;
  created_at: string;
  updated_at: string;
  applicant?: Applicant;
  business?: Business;
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
      created_at: now,
      updated_at: now,
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
    currentVersion: number,
  ): Promise<ApplicationItem> {
    return this.updateWithConcurrencyControl(id, currentVersion, {
      UpdateExpression:
        'SET applicant = :applicant, #v = #v + :inc, updated_at = :now',
      ExpressionAttributeValues: {
        ':applicant': applicantData,
        ':currentVersion': currentVersion,
        ':inc': 1,
        ':now': new Date().toISOString(),
      },
    });
  }

  async updateBusiness(
    id: string,
    businessData: Business,
    currentVersion: number,
  ): Promise<ApplicationItem> {
    return this.updateWithConcurrencyControl(id, currentVersion, {
      UpdateExpression:
        'SET business = :business, #v = #v + :inc, updated_at = :now',
      ExpressionAttributeValues: {
        ':business': businessData,
        ':currentVersion': currentVersion,
        ':inc': 1,
        ':now': new Date().toISOString(),
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    currentVersion: number,
  ): Promise<ApplicationItem> {
    return this.updateWithConcurrencyControl(id, currentVersion, {
      UpdateExpression:
        'SET #status = :status, #v = #v + :inc, updated_at = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':currentVersion': currentVersion,
        ':inc': 1,
        ':now': new Date().toISOString(),
      },
    });
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
          ExpressionAttributeValues: updateInput.ExpressionAttributeValues,
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
