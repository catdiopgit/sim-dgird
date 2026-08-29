import { SetMetadata } from '@nestjs/common';

export interface RequirePermissionOptions {
  module: string;
  action: string;
  // Nom du paramètre (route, query ou corps de requête) contenant l'entite_id
  // concernée par l'action, pour les portées 'entite'/'entite_et_descendants'.
  // Omis = vérification au niveau organisation/personnel uniquement.
  entiteIdParam?: string;
}

export const PERMISSION_KEY = 'requirePermission';

export const RequirePermission = (module: string, action: string, entiteIdParam?: string) =>
  SetMetadata(PERMISSION_KEY, { module, action, entiteIdParam } satisfies RequirePermissionOptions);
