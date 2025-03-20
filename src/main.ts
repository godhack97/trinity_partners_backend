import { CustomValidationPipeFabric } from "@app/pipes/custom-validation-pipe-fabric";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
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

  app.useGlobalPipes(CustomValidationPipeFabric());
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 9131;

  const document = SwaggerModule.createDocument(app, config);
  const swaggerCustomOptions: SwaggerCustomOptions = {
    explorer: true,
  };
  SwaggerModule.setup('api/swagger', app, document, swaggerCustomOptions);
  await app.listen(port);
  console.log('port', port);
}

bootstrap();
