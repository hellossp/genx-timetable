import { useState, useEffect } from 'react';
import { HiOutlineUserGroup, HiPlus, HiPencil, HiTrash, HiOutlineClock } from 'react-icons/hi';
import { teacherService } from '../services/teacherService';
import { subjectService } from '../services/subjectService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import { DAYS, PERIODS, PERIOD_LABELS } from '../utils/constants';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [availabilityTeacher, setAvailabilityTeacher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', subjects: [] });
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, s] = await Promise.all([
        teacherService.getAll(),
        subjectService.getAll(),
      ]);
      setTeachers(t);
      setSubjects(s);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({ name: teacher.name, phone: teacher.phone || '', subjects: teacher.subjects || [] });
    } else {
      setEditingTeacher(null);
      setFormData({ name: '', phone: '', subjects: [] });
    }
    setShowForm(true);
  };

  const openAvailability = (teacher) => {
    setAvailabilityTeacher(teacher);
    const avail = {};
    DAYS.forEach(day => {
      avail[day] = teacher.availability?.[day] || [];
    });
    setAvailability(avail);
    setShowAvailability(true);
  };

  const togglePeriod = (day, period) => {
    setAvailability(prev => {
      const dayPeriods = prev[day] || [];
      const updated = dayPeriods.includes(period)
        ? dayPeriods.filter(p => p !== period)
        : [...dayPeriods, period].sort((a, b) => a - b);
      return { ...prev, [day]: updated };
    });
  };

  const selectAllDay = (day) => {
    setAvailability(prev => {
      const allSelected = PERIODS.every(p => (prev[day] || []).includes(p));
      return { ...prev, [day]: allSelected ? [] : [...PERIODS] };
    });
  };

  const handleSaveAvailability = async () => {
    try {
      await teacherService.update(availabilityTeacher.id, { availability });
      setTeachers(prev => prev.map(t =>
        t.id === availabilityTeacher.id ? { ...t, availability } : t
      ));
      toast.success('Availability updated');
      setShowAvailability(false);
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, formData);
        setTeachers(prev => prev.map(t =>
          t.id === editingTeacher.id ? { ...t, ...formData } : t
        ));
        toast.success('Teacher updated');
      } else {
        const defaultAvail = {};
        DAYS.forEach(d => defaultAvail[d] = [...PERIODS]);
        const newTeacher = await teacherService.create({ ...formData, availability: defaultAvail });
        setTeachers(prev => [newTeacher, ...prev]);
        toast.success('Teacher added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save teacher');
    }
  };

  const handleDelete = async () => {
    try {
      await teacherService.delete(deleteConfirm.id);
      setTeachers(prev => prev.filter(t => t.id !== deleteConfirm.id));
      toast.success('Teacher deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete teacher');
    }
  };

  const toggleSubject = (subjectId) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(s => s !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  };

  const getSubjectNames = (subjectIds) => {
    return (subjectIds || [])
      .map(id => subjects.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ') || '—';
  };

  if (loading) return <Loader text="Loading teachers..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Teachers</h1>
          <p className="page-subtitle">Manage teachers, their subjects, and availability</p>
        </div>
        <button id="add-teacher-btn" onClick={() => openForm()} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Add Teacher
        </button>
      </div>

      {/* Teachers List */}
      {teachers.length === 0 ? (
        <EmptyState
          icon={HiOutlineUserGroup}
          title="No teachers yet"
          description="Add your first teacher to get started with timetable generation."
          action={
            <button onClick={() => openForm()} className="btn-primary">Add Teacher</button>
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-50/50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Subjects</th>
                <th className="table-header">Availability</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-dark-50/30 transition-colors">
                  <td className="table-cell font-semibold text-dark-900">{teacher.name}</td>
                  <td className="table-cell">{teacher.phone || '—'}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(teacher.subjects || []).map(subId => {
                        const sub = subjects.find(s => s.id === subId);
                        return sub ? (
                          <span key={subId} className="badge-primary">{sub.name}</span>
                        ) : null;
                      })}
                      {(!teacher.subjects || teacher.subjects.length === 0) && (
                        <span className="text-dark-400 text-sm">None assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => openAvailability(teacher)}
                      className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <HiOutlineClock className="w-4 h-4" />
                      Set Hours
                    </button>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openForm(teacher)}
                        className="p-2 rounded-lg hover:bg-primary-50 text-dark-400 hover:text-primary-600 transition-colors"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(teacher)}
                        className="p-2 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Full Name *</label>
            <input
              id="teacher-name"
              type="text"
              className="input-field"
              placeholder="Enter teacher name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Phone Number</label>
            <input
              id="teacher-phone"
              type="text"
              className="input-field"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Subjects</label>
            {subjects.length === 0 ? (
              <p className="text-sm text-dark-400">No subjects created yet. Add subjects first.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      formData.subjects.includes(sub.id)
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-white border-dark-200 text-dark-500 hover:border-dark-300'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">
              {editingTeacher ? 'Update' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Availability Modal */}
      <Modal
        isOpen={showAvailability}
        onClose={() => setShowAvailability(false)}
        title={`Availability — ${availabilityTeacher?.name}`}
        size="xl"
      >
        <p className="text-sm text-dark-500 mb-4">
          Click on cells to toggle availability. Green = available, Gray = unavailable.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="timetable-header">Day</th>
                {PERIODS.map(p => (
                  <th key={p} className="timetable-header">
                    <div>P{p}</div>
                    <div className="text-[10px] font-normal opacity-70">{PERIOD_LABELS[p]}</div>
                  </th>
                ))}
                <th className="timetable-header">All</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="timetable-header text-left">{day}</td>
                  {PERIODS.map(period => {
                    const isAvailable = (availability[day] || []).includes(period);
                    return (
                      <td
                        key={period}
                        onClick={() => togglePeriod(day, period)}
                        className={`timetable-cell cursor-pointer transition-all duration-150 hover:scale-105 ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-dark-100 text-dark-400 hover:bg-dark-200'
                        }`}
                      >
                        {isAvailable ? '✓' : '✗'}
                      </td>
                    );
                  })}
                  <td className="timetable-cell">
                    <button
                      onClick={() => selectAllDay(day)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowAvailability(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSaveAvailability} className="btn-primary flex-1">Save Availability</button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Teachers;
