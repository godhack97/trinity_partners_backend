import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.setGlobalPrefix('api');
  app.enableCors();

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

  await app.listen(9131);
}
bootstrap();