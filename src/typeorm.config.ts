import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,  // ✅ Use full connection URL
  synchronize: false,
  migrations: ['dist/migrations/*.js'], // for production
  entities: ['dist/**/*.entity.js'],    // for production
  ssl: {
    rejectUnauthorized: false,  // ✅ Important for Render's managed PostgreSQL
  },
});
