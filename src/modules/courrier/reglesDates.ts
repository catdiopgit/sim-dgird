import dayjs from 'dayjs';

// Règles de dates d'un courrier arrivé (recette 2026-11), identiques au
// contrôle serveur (validerDatesCourrier) : un courrier peut être daté
// d'avant sa réception, mais aucune date ne peut être future et la réception
// ne peut précéder la date du courrier.
export interface ErreursDates {
  dateCourrier?: string;
  dateReception?: string;
}

export function controlerDatesCourrier(dateCourrier?: string, dateReception?: string): ErreursDates {
  const erreurs: ErreursDates = {};
  const maintenant = dayjs();
  if (dateCourrier && dayjs(dateCourrier).isAfter(maintenant, 'day')) {
    erreurs.dateCourrier = 'La date du courrier ne peut pas être dans le futur.';
  }
  if (dateReception) {
    const reception = dayjs(dateReception);
    if (reception.isAfter(maintenant.add(5, 'minute'))) {
      erreurs.dateReception = 'La date de réception ne peut pas être dans le futur.';
    } else if (dateCourrier && reception.isBefore(dayjs(dateCourrier), 'day')) {
      erreurs.dateReception = 'La réception ne peut pas être antérieure à la date du courrier.';
    }
  }
  return erreurs;
}

// Bornes à poser sur les champs <input> (le navigateur grise les jours futurs).
export const maxJour = () => dayjs().format('YYYY-MM-DD');
export const maxDateHeure = () => dayjs().format('YYYY-MM-DDTHH:mm');
