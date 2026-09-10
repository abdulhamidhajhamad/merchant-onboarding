import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { MaskSensitiveDataInterceptor } from './common/interceptors/mask-sensitive-data.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ limit: '50kb', extended: true }));

  app.useGlobalInterceptors(
    new MaskSensitiveDataInterceptor(),
    new TimeoutInterceptor(35000),
  );

  const config = new DocumentBuilder()
    .setTitle('Merchant Onboarding API')
    .setDescription('Production-grade merchant onboarding service')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
bootstrap();