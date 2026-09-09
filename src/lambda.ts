import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ServerlessExpressMiddleware } from '@codegenie/serverless-express';
import { AppModule } from './app.module';

let serverlessExpressMiddleware: ServerlessExpressMiddleware;

export const handler = async (event: any, context: any) => {
  if (!serverlessExpressMiddleware) {
    const app = await NestFactory.create(AppModule, {
      httpAdapter: new ExpressAdapter(),
    });
    const expressApp = app.getHttpAdapter().getInstance();
    serverlessExpressMiddleware = new ServerlessExpressMiddleware(
      'merchant-onboarding',
      expressApp,
      false,
    );
  }

  return new Promise((resolve, reject) => {
    serverlessExpressMiddleware.event(event, context, (err: any, data: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};