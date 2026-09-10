import { BadRequestException, Injectable, type PipeTransform, type ArgumentMetadata } from '@nestjs/common';
import { z, type ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
