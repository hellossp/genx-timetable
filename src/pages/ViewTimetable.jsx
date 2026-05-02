import { useState, useEffect } from 'react';
import {
  HiOutlineEye,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi';
import { formatTimetableAsText } from '../utils/helpers';
import { timetableService } from '../services/timetableService';
import { classService } from '../services/classService';
import { PERIOD_LABELS } from '../utils/constants';
import { getSubjectColor } from '../utils/constants';

import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const ViewTimetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Filters
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tt, c] = await Promise.all([
        timetableService.getAll(),
        classService.getAll(),
      ]);
      setTimetables(tt);
      setClasses(c);
    } catch (err) {
      toast.error('Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await timetableService.delete(deleteConfirm.id);
      setTimetables(prev => prev.filter(t => t.id !== deleteConfirm.id));
      if (selectedTimetable?.id === deleteConfirm.id) setSelectedTimetable(null);
      toast.success('Timetable deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete timetable');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTimetables = timetables.filter(tt => {
    if (filterClass && tt.classId !== filterClass) return false;
    return true;
  });

  const getSubjectColorMap = (schedule) => {
    const map = {};
    let index = 0;
    Object.values(schedule || {}).forEach(periods => {
      Object.values(periods).forEach(slot => {
        if (slot?.subjectId && !map[slot.subjectId]) {
          map[slot.subjectId] = getSubjectColor(index++);
        }
      });
    });
    return map;
  };

  if (loading) return <Loader text="Loading timetables..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">View Timetables</h1>
          <p className="page-subtitle">Browse and print saved schedules</p>
        </div>
        {selectedTimetable && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const text = formatTimetableAsText(selectedTimetable);
                navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard!');
              }}
              className="btn-secondary flex items-center gap-2 no-print"
            >
              <HiOutlineDocumentDuplicate className="w-5 h-5" /> Copy as Text
            </button>
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 no-print">
              <HiOutlinePrinter className="w-5 h-5" /> Print
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - List */}
        <div className="lg:col-span-1 space-y-4 no-print">
          {/* Filters */}
          <div className="glass-card p-4 space-y-3">
            <select className="select-field text-sm" value={filterClass}
              onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Timetable List */}
          {filteredTimetables.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <HiOutlineCalendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No timetables found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTimetables.map(tt => (
                <div
                  key={tt.id}
                  onClick={() => setSelectedTimetable(tt)}
                  className={`glass-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedTimetable?.id === tt.id
                      ? 'ring-2 ring-primary-500 shadow-lg'
                      : 'hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-success">
                          Daily
                        </span>
                      </div>
                      <p className="font-semibold text-dark-900 text-sm">
                        {tt.className} — {tt.sectionName}
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">
                        {`${tt.dayName || ''} ${tt.date}`}
                      </p>
                      <p className="text-xs text-dark-400">Created: {tt.createdAt ? new Date(tt.createdAt).toLocaleDateString() : ''}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(tt); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Timetable View */}
        <div className="lg:col-span-2">
          {!selectedTimetable ? (
            <EmptyState
              icon={HiOutlineEye}
              title="Select a timetable"
              description="Click on a timetable from the list to view it here."
            />
          ) : (
            <div className="glass-card overflow-hidden" id="timetable-view">
              <div className="p-6 border-b border-dark-100 gradient-header text-white">
                <h2 className="text-lg font-bold">
                  {selectedTimetable.className} — {selectedTimetable.sectionName}
                </h2>
                <p className="text-sm mt-0.5 text-white/80">
                  {`Daily Schedule — ${selectedTimetable.dayName || ''} ${selectedTimetable.date}`}
                </p>
              </div>

              <div className="overflow-x-auto p-4">
                {(() => {
                  const schedule = selectedTimetable.schedule;
                  const colorMap = getSubjectColorMap(schedule);
                  const days = Object.keys(schedule || {});
                  const numPeriods = selectedTimetable.numPeriods || 6;
                  const periodsArray = Array.from({ length: numPeriods }, (_, i) => i + 1);

                  return (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="timetable-header">Day / Period</th>
                          {periodsArray.map(p => (
                            <th key={p} className="timetable-header">
                              <div>Period {p}</div>
                              <div className="text-[10px] font-normal opacity-70">
                                {selectedTimetable.timings?.[p] || PERIOD_LABELS[p]}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {days.map(day => (
                          <tr key={day}>
                            <td className="timetable-header text-left">{day}</td>
                            {periodsArray.map(period => {
                              const slot = schedule[day]?.[period];
                              const color = slot?.subjectId ? colorMap[slot.subjectId] : null;

                              return (
                                <td key={period}
                                  className={`timetable-cell ${
                                    slot?.subjectId
                                      ? `${color?.bg || 'bg-primary-50'} ${color?.text || 'text-primary-800'}`
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
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete}
        title="Delete Timetable" message="Are you sure you want to delete this timetable? This action cannot be undone." />
    </div>
  );
};

export default ViewTimetable;
