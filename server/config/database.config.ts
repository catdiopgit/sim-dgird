import type { DataSourceOptions } from 'typeorm';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export function getDatabaseConfig(): DataSourceOptions {
  return {
    type: 'postgres',
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 5432),
    username: requireEnv('DB_USERNAME'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_DATABASE'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
  };
}
