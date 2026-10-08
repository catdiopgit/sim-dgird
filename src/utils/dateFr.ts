import dayjs, { type ConfigType, type Dayjs } from 'dayjs';
import 'dayjs/locale/fr';

// Formatage d'affichage en français sans changer la locale globale de dayjs :
// la passer en 'fr' déplacerait le début de semaine (dimanche → lundi) utilisé
// par les calculs de période existants (modules/dashboard/periode.ts).
export function fr(date?: ConfigType): Dayjs {
  return dayjs(date).locale('fr');
}
