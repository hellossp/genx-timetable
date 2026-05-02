import { useState, useEffect } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineLightningBolt,
  HiOutlineExclamation,
  HiOutlineSave,
  HiOutlineRefresh,
  HiOutlineDocumentDuplicate,
  HiOutlinePencil,
} from 'react-icons/hi';
import { teacherService } from '../services/teacherService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { timetableService } from '../services/timetableService';
import {
  generateDailyTimetable,
  collectExistingBookings,
} from '../utils/timetableAlgorithm';
import { DAYS, PERIODS, PERIOD_LABELS } from '../utils/constants';
import { getSubjectColor } from '../utils/constants';
import { toISODate, getDayName, formatTimetableAsText } from '../utils/helpers';
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
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [dailyAvailability, setDailyAvailability] = useState({});
  const [customTimings, setCustomTimings] = useState({ ...PERIOD_LABELS });
  const [startTime, setStartTime] = useState('09:00');
  const [periodDuration, setPeriodDuration] = useState(60);
  const [numPeriods, setNumPeriods] = useState(6);
  const [showManualTimings, setShowManualTimings] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const periodsArray = Array.from({ length: numPeriods }, (_, i) => i + 1);

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

  useEffect(() => {
    if (selectedClassId && teachers.length > 0) {
      const classTeachers = teachers.filter(t => t.classIds?.includes(selectedClassId));
      const initialAvail = {};
      classTeachers.forEach(t => {
        initialAvail[t.id] = [...periodsArray];
      });
      setDailyAvailability(initialAvail);
    } else {
      setDailyAvailability({});
    }
  }, [selectedClassId, teachers]);

  const toggleTeacherPeriod = (teacherId, period) => {
    setDailyAvailability(prev => {
      const current = prev[teacherId] || [];
      const updated = current.includes(period)
        ? current.filter(p => p !== period)
        : [...current, period].sort((a, b) => a - b);
      return { ...prev, [teacherId]: updated };
    });
  };

  const toggleAllTeacherPeriods = (teacherId) => {
    setDailyAvailability(prev => {
      const current = prev[teacherId] || [];
      const allSelected = periodsArray.every(p => current.includes(p));
      return { ...prev, [teacherId]: allSelected ? [] : [...periodsArray] };
    });
  };

  const handleAutoFillTimings = () => {
    if (!startTime || !periodDuration) return;
    
    const [hours, minutes] = startTime.split(':').map(Number);
    let currentTotalMinutes = hours * 60 + minutes;
    
    const newTimings = {};
    periodsArray.forEach(p => {
      const startH = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
      const startM = (currentTotalMinutes % 60).toString().padStart(2, '0');
      
      currentTotalMinutes += parseInt(periodDuration);
      
      const endH = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
      const endM = (currentTotalMinutes % 60).toString().padStart(2, '0');
      
      newTimings[p] = `${startH}:${startM} - ${endH}:${endM}`;
    });
    
    setCustomTimings(newTimings);
    toast.success('Timings auto-filled!');
  };

  const handleSlotEdit = (day, period, value) => {
    if (value === 'free') {
      setGeneratedSchedule(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [period]: { teacherId: null, teacherName: 'Free', subjectId: null, subjectName: 'Free Period' }
        }
      }));
      return;
    }

    const [teacherId, subjectId] = value.split('|');
    const teacher = teachers.find(t => t.id === teacherId);
    const subject = subjects.find(s => s.id === subjectId);

    setGeneratedSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjectId: subject.id,
          subjectName: subject.name
        }
      }
    }));
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
        classId: selectedClassId,
        existingBookings,
        dailyAvailability,
        numPeriods,
      });

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
      const data = {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        className: selectedClass?.name || '',
        sectionName: selectedSection?.name || '',
        type: 'daily',
        schedule: generatedSchedule,
        date: selectedDate,
        dayName: getDayName(new Date(selectedDate)),
        timings: customTimings,
        numPeriods: numPeriods,
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

          {/* Date */}
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
        </div>

        {/* Timings Configuration */}
        {selectedClassId && (
          <div className="mt-6 border-t border-dark-100 pt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="label-text block">Configure Period Timings</label>
              <button
                onClick={() => setShowManualTimings(!showManualTimings)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                {showManualTimings ? 'Hide Manual Edit' : 'Edit Individual Periods'}
              </button>
            </div>
            
            <div className="flex gap-4 items-end mb-4">
              <div>
                <label className="text-xs text-dark-500 font-semibold">Start Time</label>
                <input
                  type="time"
                  className="input-field py-2"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-dark-500 font-semibold">Duration (mins)</label>
                <input
                  type="number"
                  className="input-field py-2 w-32"
                  value={periodDuration}
                  onChange={e => setPeriodDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-dark-500 font-semibold">Periods</label>
                <input
                  type="number"
                  className="input-field py-2 w-24"
                  min="1"
                  max="12"
                  value={numPeriods}
                  onChange={e => setNumPeriods(parseInt(e.target.value) || 6)}
                />
              </div>
              <button onClick={handleAutoFillTimings} className="btn-secondary py-2">
                Auto-fill
              </button>
            </div>

            {showManualTimings && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-dark-50 p-4 rounded-xl border border-dark-100">
                {periodsArray.map(p => (
                  <div key={p}>
                    <label className="text-xs font-bold text-dark-600">Period {p}</label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-sm"
                      value={customTimings[p]}
                      onChange={e => setCustomTimings({ ...customTimings, [p]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Availability Grid */}
        {selectedClassId && (
          <div className="mt-6">
            <label className="label-text block mb-3">Teacher Availability for {selectedDate}</label>
            <p className="text-xs text-dark-400 mb-3">Green means the teacher is available to take classes in that period.</p>
            <div className="overflow-x-auto border border-dark-200 rounded-xl">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-dark-50 border-b border-dark-200">
                    <th className="p-3 text-left text-xs font-bold text-dark-500 uppercase">Teacher</th>
                    {periodsArray.map(p => (
                      <th key={p} className="p-3 text-center text-xs font-bold text-dark-500 uppercase">
                        <div>P{p}</div>
                        <div className="text-[10px] opacity-70 normal-case">{customTimings[p]}</div>
                      </th>
                    ))}
                    <th className="p-3 text-center text-xs font-bold text-dark-500 uppercase">All</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.filter(t => t.classIds?.includes(selectedClassId)).map(teacher => (
                    <tr key={teacher.id} className="border-b border-dark-100 last:border-0 hover:bg-dark-50/50">
                      <td className="p-3 text-sm font-semibold text-dark-900">{teacher.name}</td>
                      {periodsArray.map(period => {
                        const isAvailable = (dailyAvailability[teacher.id] || []).includes(period);
                        return (
                          <td key={period} className="p-2">
                            <button
                              type="button"
                              onClick={() => toggleTeacherPeriod(teacher.id, period)}
                              className={`w-full py-2 rounded-md text-sm font-bold transition-all ${
                                isAvailable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-dark-100 text-dark-400 hover:bg-dark-200'
                              }`}
                            >
                              {isAvailable ? '✓' : '✗'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAllTeacherPeriods(teacher.id)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                  {teachers.filter(t => t.classIds?.includes(selectedClassId)).length === 0 && (
                    <tr>
                      <td colSpan={periodsArray.length + 2} className="p-4 text-center text-sm text-dark-500">
                        No teachers assigned to this class. Go to Teachers to assign them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                Generate Timetable
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
                onClick={() => {
                  const text = formatTimetableAsText({
                    className: getSelectedClass()?.name,
                    sectionName: getSelectedSection()?.name,
                    date: selectedDate,
                    dayName: getDayName(new Date(selectedDate)),
                    schedule: generatedSchedule,
                    timings: customTimings,
                    numPeriods
                  });
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard!');
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <HiOutlineDocumentDuplicate className="w-5 h-5" /> Copy as Text
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
                Daily Timetable Preview
              </h2>
              <p className="text-sm text-dark-500 mt-0.5">
                {getSelectedClass()?.name} — {getSelectedSection()?.name}
                {` — ${getDayName(new Date(selectedDate))}, ${selectedDate}`}
              </p>
            </div>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`btn-secondary flex items-center gap-2 ${editMode ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}`}
            >
              <HiOutlinePencil className="w-4 h-4" /> {editMode ? 'Finish Editing' : 'Edit Output'}
            </button>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="timetable-header">Day / Period</th>
                  {periodsArray.map(p => (
                    <th key={p} className="timetable-header">
                      <div>Period {p}</div>
                      <div className="text-[10px] font-normal opacity-70">{customTimings[p]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleDays.map(day => (
                  <tr key={day}>
                    <td className="timetable-header text-left">{day}</td>
                    {periodsArray.map(period => {
                      const slot = generatedSchedule[day]?.[period];
                      const color = slot?.subjectId ? colorMap[slot.subjectId] : null;

                      return (
                        <td key={period}
                          className={`timetable-cell ${
                            slot?.subjectId
                              ? `${color?.bg || 'bg-primary-50'} ${color?.text || 'text-primary-800'}`
                              : 'bg-dark-50 text-dark-400'
                          }`}
                        >
                          {editMode ? (
                            <select
                              className="w-full text-xs p-1 rounded border border-dark-200 bg-white text-dark-900"
                              value={slot?.teacherId ? `${slot.teacherId}|${slot.subjectId}` : 'free'}
                              onChange={(e) => handleSlotEdit(day, period, e.target.value)}
                            >
                              <option value="free">Free Period</option>
                              {subjects.filter(s => getSelectedClass()?.subjects?.includes(s.id)).map(subject => (
                                <optgroup key={subject.id} label={subject.name}>
                                  {teachers.filter(t => t.subjects?.includes(subject.id) && t.classIds?.includes(selectedClassId)).map(teacher => (
                                    <option key={`${teacher.id}|${subject.id}`} value={`${teacher.id}|${subject.id}`}>
                                      {teacher.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : (
                            <>
                              <div className="font-semibold text-xs">{slot?.subjectName || '—'}</div>
                              {slot?.teacherName && slot.teacherName !== 'Free' && (
                                <div className="text-[10px] opacity-75 mt-0.5">{slot.teacherName}</div>
                              )}
                            </>
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
