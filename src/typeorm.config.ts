const isProduction = process.env.NODE_ENV === 'production';

export const typeOrmConfig: TypeOrmModuleOptions = isProduction
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      synchronize: false,
      logging: true,
      logger: 'advanced-console',
      entities: [__dirname + '/**/*.entity.{ts,js}'],
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true, // OK for local dev
      logging: true,
      logger: 'advanced-console',
      entities: [__dirname + '/**/*.entity.{ts,js}'],
    };
