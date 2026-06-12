import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {
  json,
  urlencoded,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const allowedOrigins = config.get('ALLOWED_ORIGINS', { infer: true });
  const swaggerEnabled = config.get('SWAGGER_ENABLED', { infer: true });
  const swaggerPath = config.get('SWAGGER_PATH', { infer: true });

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  // Security headers. `contentSecurityPolicy` is disabled because the API
  // does not serve HTML; Swagger UI handles its own CSP.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.use(cookieParser());

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.disable('etag');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableShutdownHooks();

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GI Tiempo API')
      .setDescription('GI Tiempo backend REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    // `cleanupOpenApiDoc` strips Zod-internal artifacts so the generated
    // OpenAPI document is consumable by codegen tools.
    const document = cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, swaggerConfig),
    );
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger docs available at /${swaggerPath}`, 'Bootstrap');
  }

  await app.listen(port);

  logger.log(`Application running on port ${port} [${nodeEnv}]`, 'Bootstrap');
}

bootstrap();
