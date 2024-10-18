import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const config = new DocumentBuilder()
    .setTitle('Trinity')
    .setDescription('Trinity API')
    .setVersion('1.0')
    .build();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  console.log('port', port);
  const document = SwaggerModule.createDocument(app, config);
  const swaggerCustomOptions: SwaggerCustomOptions = {
    explorer: true,
  };
  SwaggerModule.setup('api/swagger', app, document, swaggerCustomOptions);
  await app.listen(port);
}

bootstrap();
