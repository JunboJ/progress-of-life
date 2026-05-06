import { DateObj, now, parseDate, addDuration, diffDates } from './date';

export interface LifeCalculations {
  startDate: DateObj;
  endDate: DateObj;
  today: DateObj;
  months: number;
  days: number;
  daysLived: number;
}

export const calculateLifeStats = (lifeSpan: number, dob: string): LifeCalculations => {
  const assumedDod = addDuration(now(), lifeSpan, 'y');
  const assumedDoB = now();
  const startDate = dob ? parseDate(dob) : assumedDoB;
  const endDate = dob ? addDuration(parseDate(dob), lifeSpan, 'y') : assumedDod;
  const today = now();
  const months = diffDates(endDate, startDate, 'M');
  const days = diffDates(endDate, startDate, 'd');
  const daysLived = diffDates(now(), startDate, 'd');

  return {
    startDate,
    endDate,
    today,
    months,
    days,
    daysLived,
  };
};