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

/**
 * Format a generated timetable into a text block for sharing (e.g. WhatsApp)
 */
export const formatTimetableAsText = (timetableData) => {
  const { className, sectionName, date, dayName, schedule, timings, numPeriods = 6 } = timetableData;
  const periodsArray = Array.from({ length: numPeriods }, (_, i) => i + 1);

  let text = `📚 *Timetable for ${className} — ${sectionName}*\n`;
  text += `📅 *Date:* ${dayName}, ${date}\n\n`;

  // For daily timetables, there should be only one day in the schedule object
  const targetDay = dayName || Object.keys(schedule || {})[0];
  const daySchedule = schedule?.[targetDay];

  if (!daySchedule) {
    return text + "No schedule available.";
  }

  periodsArray.forEach(p => {
    const slot = daySchedule[p];
    const timeLabel = timings?.[p] || `Period ${p}`;
    
    if (slot && slot.subjectName && slot.subjectName !== 'Free Period') {
      text += `*P${p}* (${timeLabel}) : ${slot.subjectName} — ${slot.teacherName}\n`;
    } else {
      text += `*P${p}* (${timeLabel}) : ☕ Free Period\n`;
    }
  });

  return text;
};
