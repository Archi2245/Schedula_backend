import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  // Skip ALL database initialization in main.ts
  // Let TypeORM handle it through the module
  
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  // Add session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'super-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    }),
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on port: ${port}`);
}
bootstrap();