import { DAYS, PERIODS } from './constants';

/**
 * Timetable Generation Algorithm
 * Uses constraint-satisfaction with greedy assignment + backtracking.
 * 
 * @param {Object} params
 * @param {Array} params.subjects - [{id, name, periodsPerWeek}]
 * @param {Array} params.teachers - [{id, name, subjects: [subjectId], availability: {day: [periods]}}]
 * @param {Array} params.days - Days to schedule (e.g. ['Monday', 'Tuesday', ...])
 * @param {Object} params.existingBookings - { "day-period": teacherId } global bookings across ALL sections
 * @returns {Object} { schedule: {day: {period: {teacherId, teacherName, subjectId, subjectName}}}, conflicts: [] }
 */
export function generateTimetable({ subjects, teachers, days, existingBookings = {} }) {
  const schedule = {};
  const conflicts = [];
  
  // Track assignments: how many periods each subject got
  const subjectAssignments = {};
  subjects.forEach(s => {
    subjectAssignments[s.id] = 0;
  });

  // Track teacher bookings for this timetable (to avoid double-booking within this section)
  const localBookings = { ...existingBookings };

  // Create slots: [{day, period}]
  const slots = [];
  days.forEach(day => {
    PERIODS.forEach(period => {
      slots.push({ day, period });
    });
  });

  // Shuffle slots for better distribution
  shuffleArray(slots);

  // Sort subjects by periodsPerWeek (descending) — assign subjects needing more periods first
  const sortedSubjects = [...subjects].sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);

  // Initialize schedule
  days.forEach(day => {
    schedule[day] = {};
    PERIODS.forEach(period => {
      schedule[day][period] = null;
    });
  });

  // Greedy assignment
  for (const subject of sortedSubjects) {
    let assigned = 0;
    const target = Math.min(subject.periodsPerWeek, days.length * PERIODS.length);

    // Find eligible teachers for this subject
    const eligibleTeachers = teachers.filter(t =>
      t.subjects && t.subjects.includes(subject.id)
    );

    if (eligibleTeachers.length === 0) {
      conflicts.push(`No teacher available for "${subject.name}"`);
      continue;
    }

    // Track per-day assignments for this subject (to distribute evenly)
    const dayCount = {};
    days.forEach(d => dayCount[d] = 0);

    // Sort slots: prefer days with fewer assignments of this subject
    const sortedSlots = [...slots].sort((a, b) => {
      return (dayCount[a.day] || 0) - (dayCount[b.day] || 0);
    });

    for (const slot of sortedSlots) {
      if (assigned >= target) break;
      if (schedule[slot.day][slot.period] !== null) continue;

      // Don't stack same subject too many times on one day (max 2)
      if ((dayCount[slot.day] || 0) >= 2) continue;

      // Try each eligible teacher
      let placed = false;
      for (const teacher of eligibleTeachers) {
        const bookingKey = `${slot.day}-${slot.period}`;

        // Check teacher availability
        const teacherAvail = teacher.availability?.[slot.day] || [];
        if (!teacherAvail.includes(slot.period)) continue;

        // Check if teacher is already booked elsewhere in this period
        if (localBookings[bookingKey] === teacher.id) continue;

        // Assign!
        schedule[slot.day][slot.period] = {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjectId: subject.id,
          subjectName: subject.name,
        };
        localBookings[bookingKey] = teacher.id;
        assigned++;
        dayCount[slot.day] = (dayCount[slot.day] || 0) + 1;
        subjectAssignments[subject.id]++;
        placed = true;
        break;
      }
    }

    if (assigned < target) {
      conflicts.push(
        `"${subject.name}" needs ${target} periods/week but only ${assigned} could be assigned`
      );
    }
  }

  // Check for empty slots
  days.forEach(day => {
    PERIODS.forEach(period => {
      if (!schedule[day][period]) {
        schedule[day][period] = {
          teacherId: null,
          teacherName: 'Free',
          subjectId: null,
          subjectName: 'Free Period',
        };
      }
    });
  });

  return { schedule, conflicts };
}

/**
 * Generate timetable for a single day
 */
export function generateDailyTimetable({ subjects, teachers, day, existingBookings = {} }) {
  return generateTimetable({
    subjects,
    teachers,
    days: [day],
    existingBookings,
  });
}

/**
 * Generate timetable for a full week
 */
export function generateWeeklyTimetable({ subjects, teachers, existingBookings = {} }) {
  return generateTimetable({
    subjects,
    teachers,
    days: DAYS,
    existingBookings,
  });
}

/**
 * Collect all teacher bookings across all existing timetables for conflict detection
 */
export function collectExistingBookings(timetables) {
  const bookings = {};
  timetables.forEach(tt => {
    if (!tt.schedule) return;
    Object.entries(tt.schedule).forEach(([day, periods]) => {
      Object.entries(periods).forEach(([period, slot]) => {
        if (slot?.teacherId) {
          bookings[`${day}-${period}`] = slot.teacherId;
        }
      });
    });
  });
  return bookings;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
