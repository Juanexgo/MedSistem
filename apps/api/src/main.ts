import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { createCsrfProtection, CSRF_HEADER_NAME } from './common/middleware/csrf';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createWinstonLogger } from './common/logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  const port = configService.get<number>('API_PORT', 4000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigins = corsOrigin.split(',').map(o => o.trim());
  const helmetEnabled = configService.get<string>('HELMET_ENABLED', 'true') === 'true';
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix(apiPrefix);

  if (nodeEnv === 'production') {
    // Behind Railway/Render/Fly proxies — trust the X-Forwarded-* headers so
    // req.ip reports the real client (used by audit logs and rate limiting).
    const httpAdapter: any = app.getHttpAdapter().getInstance();
    if (typeof httpAdapter.set === 'function') {
      httpAdapter.set('trust proxy', 1);
    }
  }

  if (helmetEnabled) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", ...corsOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }));
  }

  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER_NAME, 'X-CSRF-Token'],
    exposedHeaders: [CSRF_HEADER_NAME],
    maxAge: 86400,
  });

  const csrfSecret = configService.get<string>('CSRF_SECRET');
  if (!csrfSecret || csrfSecret.length < 32) {
    throw new Error('CSRF_SECRET env var must be set and at least 32 characters long');
  }
  const { doubleCsrfProtection } = createCsrfProtection(
    csrfSecret,
    nodeEnv === 'production',
  );

  const csrfExemptPaths = [
    `${apiPrefix}/auth/login`,
    `${apiPrefix}/auth/csrf-token`,
  ];
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (csrfExemptPaths.includes(req.path)) {
      return next();
    }
    if (req.path.startsWith(`${apiPrefix}/tracking/`)) {
      return next();
    }
    return doubleCsrfProtection(req, res, (err?: unknown) => {
      if (err) {
        // csrf-csrf throws a plain Error (not HttpException), so the default
        // Nest filter would turn it into a 500. Translate it here to a 403 with
        // a discriminating code so the web client can transparently refresh the
        // token and retry the mutation.
        return res.status(403).json({
          success: false,
          statusCode: 403,
          code: 'invalid_csrf_token',
          message: (err as Error)?.message || 'Invalid CSRF token',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }
      return next();
    });
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MediFlow API')
      .setDescription('Hospital Internal Logistics & Patient Transport Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port);
  logger.log(`MediFlow API running on port ${port}`);
  logger.log(`Swagger docs at http://localhost:${port}${apiPrefix}/docs`);
}

bootstrap();
