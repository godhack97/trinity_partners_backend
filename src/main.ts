import "./observability/instrument";
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { DataSource } from "typeorm";
import { swaggerSuperAdminMiddleware } from "./security/swagger-super-admin.middleware";
import { StructuredLogger } from "./observability/structured-logger";
import { MetricsService } from "./observability/metrics.service";
import { httpObservabilityMiddleware } from "./observability/http-observability.middleware";

async function bootstrap() {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 'loopback');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Origin is not allowed by CORS'));
    },
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Client-Id',
      'X-CSRF-Token',
      'X-Request-Id',
      'sentry-trace',
      'baggage',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  const metrics = app.get(MetricsService);
  app.use(httpObservabilityMiddleware(logger, metrics));

  const swaggerGuard = swaggerSuperAdminMiddleware(app.get(DataSource));
  express.use(
    /^\/api\/(?:docs(?:\/|$)|swagger-(?:json|yaml)$)/,
    swaggerGuard,
  );

  const config = new DocumentBuilder()
    .setTitle('Trinity Admin API')
    .setDescription('API для админ-панели Trinity')
    .setVersion('1.0')
    .addServer('http://localhost:9131', 'Development server')
    .addServer('https://partner-api.trinity.ru', 'Production server')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      // Убираем "Controller" из имени
      const cleanController = controllerKey.replace('Controller', '');
      return `${cleanController}_${methodKey}`;
    }
  });

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: '/api/swagger-json',
    yamlDocumentUrl: '/api/swagger-yaml',
  });

  await app.listen(Number(process.env.PORT || 9131));
}
bootstrap().catch((error) => {
  const logger = new StructuredLogger();
  logger.fatal(error, 'Bootstrap');
  process.exitCode = 1;
});
