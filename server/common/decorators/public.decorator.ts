import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marque une route accessible sans JWT (ex: POST /auth/login). JwtAuthGuard,
// posé globalement dans AppModule, vérifie ce flag avant d'exiger un token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
