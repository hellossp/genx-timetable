import { format, startOfWeek, addDays } from 'date-fns';

/**
 * Format a date as ISO date string (YYYY-MM-DD)
 */
export const toISODate = (date) => format(date, 'yyyy-MM-dd');

/**
 * Get Monday of a given week
 */
export const getWeekStart = (date) => startOfWeek(date, { weekStartsOn: 1 });

/**
 * Get day name from a date
 */
export const getDayName = (date) => format(date, 'EEEE');

/**
 * Get array of dates for a week starting from Monday
 */
export const getWeekDates = (mondayDate) => {
  return Array.from({ length: 6 }, (_, i) => addDays(mondayDate, i));
};
