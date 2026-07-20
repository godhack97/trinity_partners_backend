import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
const envFilePath = `.env.${process.env.NODE_ENV?.trim() || 'prod'}`;
dotenvConfig({ path: envFilePath });

const config = {
  type: 'mysql',
  host: `${process.env.DATABASE_HOST}`,
  port: `${process.env.DATABASE_PORT}`,
  username: `${process.env.DATABASE_USERNAME}`,
  password: `${process.env.DATABASE_PASSWORD}`,
  database: `${process.env.DATABASE_NAME}`,
  entities: ['dist/**/*.entity{.ts,.js}'],
  // Keep the original schema migrations and the newer application migrations
  // in one chain so a fresh database can be bootstrapped from zero. Existing
  // databases are unaffected because TypeORM skips migrations already recorded
  // in the migrations table.
  migrations: [
    '1745997975688-CreateUserTokensTable.ts',
    'migrations/*{.ts,.js}',
    'src/migrations/*{.ts,.js}',
  ],
  autoLoadEntities: true,
  synchronize: false,
  driver: require('mysql2')
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
