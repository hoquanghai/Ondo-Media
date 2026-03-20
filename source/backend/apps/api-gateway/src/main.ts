import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  createValidationPipe,
  GlobalExceptionFilter,
  TransformInterceptor,
} from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (disabled in production)
  if (process.env.APP_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('コープネット API')
      .setDescription('社内SNSシステム API ドキュメント')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`API Gateway is running on port ${port}`);
}
bootstrap();
