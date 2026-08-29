import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';

// Utilisé uniquement par la CLI TypeORM (génération/exécution de migrations),
// hors du cycle de vie NestJS. Voir les scripts `migration:*` du package.json.
export default new DataSource(getDatabaseConfig());
