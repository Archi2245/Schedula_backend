import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // ✅ Use DATABASE_URL in production
  synchronize: true,
  logging: true,
  entities: ['src/**/*.entity.{ts,js}'],
  migrations: ['src/migrations/*.ts'],
});
