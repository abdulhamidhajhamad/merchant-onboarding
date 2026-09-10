import { RequestTimeoutException } from '@nestjs/common';
import { Observable, of, lastValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  it('throws RequestTimeoutException when the downstream handler hangs past the configured budget', async () => {
    const interceptor = new TimeoutInterceptor(200); // short budget, test-only value
    const hangingHandler = {
      handle: () => of('never-resolves-in-time').pipe(delay(5000)),
    };

    await expect(
      lastValueFrom(interceptor.intercept({} as any, hangingHandler as any)),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('passes through normally when the downstream handler resolves within budget', async () => {
    const interceptor = new TimeoutInterceptor(2000);
    const fastHandler = { handle: () => of('ok').pipe(delay(10)) };

    const result = await lastValueFrom(
      interceptor.intercept({} as any, fastHandler as any),
    );
    expect(result).toBe('ok');
  });

  it('re-throws non-timeout errors unchanged', async () => {
    const interceptor = new TimeoutInterceptor(2000);
    const failingHandler = {
      handle: () =>
        new Observable((subscriber) =>
          subscriber.error(new Error('downstream failure')),
        ),
    };

    await expect(
      lastValueFrom(interceptor.intercept({} as any, failingHandler as any)),
    ).rejects.toThrow('downstream failure');
  });
});
