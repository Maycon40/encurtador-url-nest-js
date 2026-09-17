import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { SnakeCaseExceptionFilter } from './common/filters/http-exception.filter';
import { PerformanceAuditInterceptor } from './common/interceptors/performance-audit.interceptor';
import { exceptionFactory } from './common/utils/exception-factory.utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [process.env.FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalInterceptors(new PerformanceAuditInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory,
    }),
  );

  app.useGlobalFilters(new SnakeCaseExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('API do Encurtador de URLs')
    .setDescription('Documentação dos endpoints do backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
