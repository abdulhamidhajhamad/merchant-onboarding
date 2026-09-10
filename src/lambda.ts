import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import { Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';

let cachedHandler: Handler;

const bootstrapServer = async (): Promise<Handler> => {
  const expressApp = express();
  expressApp.use(express.json({ limit: '50kb' }));
  expressApp.use(express.urlencoded({ limit: '50kb', extended: true }));

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  await app.init();
  return serverlessExpress({ app: expressApp });
};

export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }

  return cachedHandler(event, context, callback);
};