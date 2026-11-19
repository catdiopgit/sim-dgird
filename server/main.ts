import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { QueryFailedFilter } from './common/filters/query-failed.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // v8.6.5 : derrière IIS (ARR), l'adresse du poste est lue dans
  // X-Forwarded-For (limitation des tentatives de connexion) ; l'en-tête
  // X-Powered-By n'est plus envoyé.
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  // v8.6.6 : en-têtes de sécurité (helmet) ; CORS fermé par défaut — les
  // écrans appellent l'API par la même adresse (IIS). CORS_ORIGIN permet
  // d'autoriser explicitement une autre origine si besoin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
      // Tant que le SIM est servi en HTTP, pas de montée forcée en HTTPS.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  if (process.env.CORS_ORIGIN) {
    app.enableCors({ origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) });
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new QueryFailedFilter());
  app.setGlobalPrefix('api');
  // API_HOST=127.0.0.1 : l'API n'écoute plus que la machine locale (IIS).
  if (process.env.API_HOST) await app.listen(process.env.PORT ?? 3001, process.env.API_HOST);
  else await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
