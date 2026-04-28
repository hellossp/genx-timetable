export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PERIODS = [1, 2, 3, 4, 5, 6];

export const PERIOD_LABELS = {
  1: '9:00 - 9:45',
  2: '9:50 - 10:35',
  3: '10:40 - 11:25',
  4: '11:30 - 12:15',
  5: '1:00 - 1:45',
  6: '1:50 - 2:35',
};

export const DATA_VALIDITY_MONTHS = 6;

export const SUBJECT_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
];

export const getSubjectColor = (index) => {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
};
