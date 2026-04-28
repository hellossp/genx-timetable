import { useState, useEffect } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineLightningBolt,
  HiOutlineExclamation,
  HiOutlineSave,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { teacherService } from '../services/teacherService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { timetableService } from '../services/timetableService';
import {
  generateWeeklyTimetable,
  generateDailyTimetable,
  collectExistingBookings,
} from '../utils/timetableAlgorithm';
import { DAYS, PERIODS, PERIOD_LABELS } from '../utils/constants';
import { getSubjectColor } from '../utils/constants';
import { toISODate, getWeekStart, getDayName } from '../utils/helpers';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const GenerateTimetable = () => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [existingTimetables, setExistingTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [mode, setMode] = useState('weekly'); // 'weekly' or 'daily'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));

  // Result state
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, c, s, tt] = await Promise.all([
        teacherService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
        timetableService.getAll(),
      ]);
      setTeachers(t);
      setClasses(c);
      setSubjects(s);
      setExistingTimetables(tt);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedClass = () => classes.find(c => c.id === selectedClassId);
  const getSelectedSection = () => getSelectedClass()?.sections?.find(s => s.id === selectedSectionId);

  const handleGenerate = () => {
    if (!selectedClassId || !selectedSectionId) {
      toast.error('Please select a class and section');
      return;
    }

    setGenerating(true);

    try {
      const selectedClass = getSelectedClass();
      const classSubjectIds = selectedClass?.subjects || [];
      const classSubjects = subjects.filter(s => classSubjectIds.includes(s.id));

      if (classSubjects.length === 0) {
        toast.error('No subjects assigned to this class. Please add subjects first.');
        setGenerating(false);
        return;
      }

      // Get existing bookings for conflict detection (exclude current class/section)
      const otherTimetables = existingTimetables.filter(
        t => !(t.classId === selectedClassId && t.sectionId === selectedSectionId)
      );
      const existingBookings = collectExistingBookings(otherTimetables);

      let result;
      if (mode === 'weekly') {
        result = generateWeeklyTimetable({
          subjects: classSubjects,
          teachers,
          existingBookings,
        });
      } else {
        const dayName = getDayName(new Date(selectedDate));
        if (!DAYS.includes(dayName)) {
          toast.error('Selected date falls on Sunday. Please pick a weekday (Mon-Sat).');
          setGenerating(false);
          return;
        }
        result = generateDailyTimetable({
          subjects: classSubjects,
          teachers,
          day: dayName,
          existingBookings,
        });
      }

      setGeneratedSchedule(result.schedule);
      setConflicts(result.conflicts);

      if (result.conflicts.length > 0) {
        toast('Timetable generated with some warnings', { icon: '⚠️' });
      } else {
        toast.success('Timetable generated successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedSchedule) return;

    setSaving(true);
    try {
      const selectedClass = getSelectedClass();
      const selectedSection = getSelectedSection();
      const weekStart = getWeekStart(new Date(selectedDate));

      const data = {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        className: selectedClass?.name || '',
        sectionName: selectedSection?.name || '',
        type: mode,
        schedule: generatedSchedule,
        ...(mode === 'weekly'
          ? { weekStartDate: toISODate(weekStart) }
          : { date: selectedDate, dayName: getDayName(new Date(selectedDate)) }),
      };

      await timetableService.save(data);
      toast.success('Timetable saved to Firestore!');

      // Refresh existing timetables
      const updated = await timetableService.getAll();
      setExistingTimetables(updated);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  const getSubjectColorMap = () => {
    const map = {};
    const selectedClass = getSelectedClass();
    const classSubjectIds = selectedClass?.subjects || [];
    classSubjectIds.forEach((id, index) => {
      map[id] = getSubjectColor(index);
    });
    return map;
  };

  if (loading) return <Loader text="Loading data..." />;

  const colorMap = getSubjectColorMap();
  const scheduleDays = generatedSchedule ? Object.keys(generatedSchedule) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-header">Generate Timetable</h1>
        <p className="page-subtitle">Auto-generate schedules for your classes</p>
      </div>

      {/* Configuration Card */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-dark-900 mb-5">Configuration</h2>

        {/* Mode Toggle */}
        <div className="mb-6">
          <label className="label-text">Generation Mode</label>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => { setMode('weekly'); setGeneratedSchedule(null); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                mode === 'weekly'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-dark-200 bg-white text-dark-500 hover:border-dark-300'
              }`}
            >
              📅 Weekly Timetable
            </button>
            <button
              onClick={() => { setMode('daily'); setGeneratedSchedule(null); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                mode === 'daily'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-dark-200 bg-white text-dark-500 hover:border-dark-300'
              }`}
            >
              📆 Daily Timetable
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Class */}
          <div>
            <label className="label-text">Class *</label>
            <select
              id="gen-class"
              className="select-field"
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); setGeneratedSchedule(null); }}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="label-text">Section *</label>
            <select
              id="gen-section"
              className="select-field"
              value={selectedSectionId}
              onChange={e => { setSelectedSectionId(e.target.value); setGeneratedSchedule(null); }}
            >
              <option value="">Select Section</option>
              {(getSelectedClass()?.sections || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date (for daily) */}
          {mode === 'daily' && (
            <div>
              <label className="label-text">Date *</label>
              <input
                id="gen-date"
                type="date"
                className="input-field"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setGeneratedSchedule(null); }}
              />
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex gap-3">
          <button
            id="generate-btn"
            onClick={handleGenerate}
            disabled={generating || !selectedClassId || !selectedSectionId}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <HiOutlineLightningBolt className="w-5 h-5" />
                Generate {mode === 'weekly' ? 'Weekly' : 'Daily'} Timetable
              </>
            )}
          </button>

          {generatedSchedule && (
            <>
              <button
                onClick={handleGenerate}
                className="btn-secondary flex items-center gap-2"
              >
                <HiOutlineRefresh className="w-5 h-5" /> Regenerate
              </button>
              <button
                id="save-timetable-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                {saving ? 'Saving...' : <><HiOutlineSave className="w-5 h-5" /> Save to Firestore</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <HiOutlineExclamation className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Warnings ({conflicts.length})</h3>
          </div>
          <ul className="space-y-1">
            {conflicts.map((c, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generated Timetable Preview */}
      {generatedSchedule && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-dark-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-dark-900">
                {mode === 'weekly' ? 'Weekly' : 'Daily'} Timetable Preview
              </h2>
              <p className="text-sm text-dark-500 mt-0.5">
                {getSelectedClass()?.name} — {getSelectedSection()?.name}
                {mode === 'daily' && ` — ${getDayName(new Date(selectedDate))}, ${selectedDate}`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="timetable-header">Day / Period</th>
                  {PERIODS.map(p => (
                    <th key={p} className="timetable-header">
                      <div>Period {p}</div>
                      <div className="text-[10px] font-normal opacity-70">{PERIOD_LABELS[p]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleDays.map(day => (
                  <tr key={day}>
                    <td className="timetable-header text-left">{day}</td>
                    {PERIODS.map(period => {
                      const slot = generatedSchedule[day]?.[period];
                      const color = slot?.subjectId ? colorMap[slot.subjectId] : null;

                      return (
                        <td key={period}
                          className={`timetable-cell ${
                            slot?.subjectId
                              ? `${color?.bg || 'bg-primary-50'} ${color?.text || 'text-primary-800'} ${color?.border || ''}`
                              : 'bg-dark-50 text-dark-400'
                          }`}
                        >
                          <div className="font-semibold text-xs">{slot?.subjectName || '—'}</div>
                          {slot?.teacherName && slot.teacherName !== 'Free' && (
                            <div className="text-[10px] opacity-75 mt-0.5">{slot.teacherName}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateTimetable;
