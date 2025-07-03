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
    
    // Only run migrations in development or when explicitly needed
    if (process.env.NODE_ENV !== 'production' || process.env.RUN_MIGRATIONS === 'true') {
      console.log('🔄 Checking for pending migrations...');
      try {
        await AppDataSource.runMigrations();
        console.log('✅ Migrations completed successfully');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError.message);
        if (migrationError.message.includes('already exists')) {
          console.log('🔄 Tables already exist, trying to sync schema...');
          // Try to sync the schema to add missing columns
          try {
            await AppDataSource.synchronize();
            console.log('✅ Schema synchronized successfully');
          } catch (syncError) {
            console.error('❌ Schema sync failed:', syncError.message);
          }
        }
      }
    } else {
      console.log('⏭️ Skipping migrations in production');
    }
    
  } catch (error) {
    console.error('❌ Database/Migration error:', error.message);
    console.log('🔄 Continuing with app startup...');
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