import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// Le frontend (Phase 8) attend une erreur structurée exploitable pour les cas
// courants (ex: suppression d'une ligne encore référencée ailleurs), comme le
// faisait PostgREST via supabase-js (`error.code === '23503'`). Sans ce filtre,
// une contrainte SQL violée remonterait en 500 générique sans code exploitable.
const HTTP_STATUS_PAR_CODE_PG: Record<string, HttpStatus> = {
  '23503': HttpStatus.CONFLICT, // foreign_key_violation
  '23505': HttpStatus.CONFLICT, // unique_violation
  '23502': HttpStatus.BAD_REQUEST, // not_null_violation
  '23514': HttpStatus.BAD_REQUEST, // check_violation
};

const MESSAGE_PAR_CODE_PG: Record<string, string> = {
  '23503': 'Opération refusée : cette ressource est encore référencée ailleurs dans l\'application.',
  '23505': 'Un enregistrement avec ces valeurs existe déjà.',
  '23502': 'Un champ obligatoire est manquant.',
  '23514': 'Valeur invalide au regard des contraintes métier.',
};

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const code = (exception as unknown as { code?: string }).code;
    const status = (code && HTTP_STATUS_PAR_CODE_PG[code]) || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = (code && MESSAGE_PAR_CODE_PG[code]) || 'Erreur de base de données.';

    response.status(status).json(
      new HttpException({ statusCode: status, code, message }, status).getResponse(),
    );
  }
}
