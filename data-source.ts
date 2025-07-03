import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        synchronize: false,
        entities: ['dist/**/*.entity.js'],
        migrations: ['dist/migrations/*.js'],
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        synchronize: false,
        entities: ['src/**/*.entity.{ts,js}'],
        migrations: ['src/migrations/*.ts'],
      }
);
