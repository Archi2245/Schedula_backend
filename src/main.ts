import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  // ✅ Add session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'super-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // set to true in production with HTTPS
    }),
  );

  // ✅ Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  app.setGlobalPrefix('api/v1');


  await app.listen(process.env.PORT || 3000);
}
bootstrap();
