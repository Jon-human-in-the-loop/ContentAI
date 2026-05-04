import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  const rawOrigin = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const allowedOrigins = rawOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '');
      // Allow explicitly configured origins
      if (allowedOrigins.includes(clean)) return callback(null, true);
      // Allow all Vercel deployment URLs (preview + production)
      if (clean.endsWith('.vercel.app')) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.setGlobalPrefix('api/v1');
  const port = config.get('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`ContentAI API on port ${port}`);
}
bootstrap();
