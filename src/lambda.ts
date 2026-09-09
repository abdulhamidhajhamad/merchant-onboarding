import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import { Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let cachedHandler: Handler;

const bootstrapServer = async (): Promise<Handler> => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
};

export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }

  return cachedHandler(event, context, callback);
};