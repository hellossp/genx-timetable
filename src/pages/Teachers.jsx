import { useState, useEffect } from 'react';
import { HiOutlineUserGroup, HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import { teacherService } from '../services/teacherService';
import { subjectService } from '../services/subjectService';
import { classService } from '../services/classService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', subjects: [], classIds: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, s, c] = await Promise.all([
        teacherService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
      ]);
      setTeachers(t);
      setSubjects(s);
      setClasses(c);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({ name: teacher.name, phone: teacher.phone || '', subjects: teacher.subjects || [], classIds: teacher.classIds || [] });
    } else {
      setEditingTeacher(null);
      setFormData({ name: '', phone: '', subjects: [], classIds: [] });
    }
    setShowForm(true);
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
        const newTeacher = await teacherService.create(formData);
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

  const toggleClass = (classId) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(c => c !== classId)
        : [...prev.classIds, classId],
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
                <th className="table-header">Classes</th>
                <th className="table-header">Subjects</th>
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
                      {(teacher.classIds || []).map(clsId => {
                        const cls = classes.find(c => c.id === clsId);
                        return cls ? (
                          <span key={clsId} className="badge-success">{cls.name}</span>
                        ) : null;
                      })}
                      {(!teacher.classIds || teacher.classIds.length === 0) && (
                        <span className="text-dark-400 text-sm">None assigned</span>
                      )}
                    </div>
                  </td>
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
            <label className="label-text">Assigned Classes *</label>
            <p className="text-xs text-dark-400 mb-2">Select which classes this teacher teaches</p>
            {classes.length === 0 ? (
              <p className="text-sm text-dark-400">No classes created yet. Add classes first.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      formData.classIds.includes(cls.id)
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-white border-dark-200 text-dark-500 hover:border-dark-300'
                    }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
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
