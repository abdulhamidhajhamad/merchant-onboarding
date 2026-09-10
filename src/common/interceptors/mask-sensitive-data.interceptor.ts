import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_KEY_PATTERNS = [
  /tax/i,
  /ssn/i,
  /identity/i,
  /routing[_-]?number/i,
  /account[_-]?number/i,
  /routing/i,
  /account/i,
];

export function maskSensitiveValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const lastFour = raw.slice(-4);
  const visiblePrefix = raw.length > 4 ? '*'.repeat(raw.length - 4) : '';
  return `${visiblePrefix}${lastFour}`;
}

export function maskSensitiveData<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => maskSensitiveData(item)) as T;
  }

  if (payload !== null && typeof payload === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
        pattern.test(normalizedKey),
      );

      if (isSensitiveKey && value !== undefined && value !== null) {
        sanitized[key] = maskSensitiveValue(value);
        continue;
      }

      sanitized[key] =
        value !== null && typeof value === 'object'
          ? maskSensitiveData(value)
          : value;
    }

    return sanitized as T;
  }

  return payload;
}

@Injectable()
export class MaskSensitiveDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response) => maskSensitiveData(response)),
    );
  }
}
