import dayjs, { Dayjs } from 'dayjs';

export interface LifeCalculations {
  startDate: Dayjs;
  endDate: Dayjs;
  today: Dayjs;
  months: number;
  days: number;
  daysLived: number;
}

export const calculateLifeStats = (lifeSpan: number, dob: string): LifeCalculations => {
  const assumedDod = dayjs().add(lifeSpan, 'y');
  const assumedDoB = dayjs();
  const startDate = dob ? dayjs(dob) : assumedDoB;
  const endDate = dob ? dayjs(dob).add(lifeSpan, 'y') : assumedDod;
  const today = dayjs();
  const months = dayjs(endDate).diff(startDate, 'M');
  const days = dayjs(endDate).diff(startDate, 'd');
  const daysLived = dayjs().diff(startDate, 'd');

  return {
    startDate,
    endDate,
    today,
    months,
    days,
    daysLived,
  };
};