import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppDataSource } from './data-source';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');
    }
    
    // Only run migrations in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Checking for pending migrations...');
      await AppDataSource.runMigrations();
      console.log('✅ Migrations completed successfully');
    } else {
      console.log('⏭️ Skipping migrations in production');
    }
    
  } catch (error) {
    console.error('❌ Database/Migration error:', error.message);
    
    // If the error is about existing relations, it's likely safe to continue
    if (error.message.includes('already exists')) {
      console.log('🔄 Tables already exist, continuing with app startup...');
    } else {
      console.error('🚨 Unexpected migration error, but continuing anyway...');
    }
  }
  
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

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on port: ${port}`);
}
bootstrap();