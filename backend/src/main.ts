import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Global prefix ---
  app.setGlobalPrefix('api');

  // --- CORS — restrict to frontend origin from environment ---
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  // --- Global exception filter — standardized error format per API_SPEC.md ---
  app.useGlobalFilters(new GlobalExceptionFilter());

  // --- Cookie Parser ---
  app.use(cookieParser());

  // --- Global validation pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO class instances
    }),
  );

  // --- ClassSerializerInterceptor — enables @Exclude() on passwordHash ---
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // --- Swagger (available in non-production environments) ---
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Simple Banking App API')
      .setDescription('REST API documentation for Simple Banking App')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
