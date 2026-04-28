import { useState, useEffect } from 'react';
import { HiOutlineClipboardList, HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import { subjectService } from '../services/subjectService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', periodsPerWeek: 3 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const s = await subjectService.getAll();
      setSubjects(s);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({ name: subject.name, periodsPerWeek: subject.periodsPerWeek || 3 });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', periodsPerWeek: 3 });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Subject name is required'); return; }

    try {
      const saveData = { ...formData, periodsPerWeek: parseInt(formData.periodsPerWeek) || 3 };
      if (editingSubject) {
        await subjectService.update(editingSubject.id, saveData);
        setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...saveData } : s));
        toast.success('Subject updated');
      } else {
        const newSubject = await subjectService.create(saveData);
        setSubjects(prev => [newSubject, ...prev]);
        toast.success('Subject added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save subject');
    }
  };

  const handleDelete = async () => {
    try {
      await subjectService.delete(deleteConfirm.id);
      setSubjects(prev => prev.filter(s => s.id !== deleteConfirm.id));
      toast.success('Subject deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete subject');
    }
  };

  if (loading) return <Loader text="Loading subjects..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Subjects</h1>
          <p className="page-subtitle">Manage subjects and their weekly period allocation</p>
        </div>
        <button id="add-subject-btn" onClick={() => openForm()} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={HiOutlineClipboardList}
          title="No subjects yet"
          description="Add subjects that will be taught at your tuition center."
          action={<button onClick={() => openForm()} className="btn-primary">Add Subject</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, index) => {
            const colors = [
              'from-blue-500 to-blue-600',
              'from-emerald-500 to-emerald-600',
              'from-purple-500 to-purple-600',
              'from-amber-500 to-amber-600',
              'from-rose-500 to-rose-600',
              'from-cyan-500 to-cyan-600',
            ];
            const color = colors[index % colors.length];

            return (
              <div key={subject.id} className="glass-card overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-dark-900">{subject.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => openForm(subject)} className="p-2 rounded-lg hover:bg-primary-50 text-dark-400 hover:text-primary-600 transition-colors">
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(subject)} className="p-2 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors">
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r ${color} text-white`}>
                      {subject.periodsPerWeek || 3}
                    </span>
                    <span className="text-sm text-dark-500">periods per week</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingSubject ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Subject Name *</label>
            <input id="subject-name" type="text" className="input-field" placeholder="e.g. Mathematics"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Periods Per Week</label>
            <input id="subject-periods" type="number" className="input-field" min="1" max="36"
              value={formData.periodsPerWeek} onChange={e => setFormData({ ...formData, periodsPerWeek: e.target.value })} />
            <p className="text-xs text-dark-400 mt-1">How many periods this subject needs per week (across 6 days, 6 periods/day)</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editingSubject ? 'Update' : 'Add Subject'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete}
        title="Delete Subject" message={`Are you sure you want to delete "${deleteConfirm?.name}"?`} />
    </div>
  );
};

export default Subjects;
