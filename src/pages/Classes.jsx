import { useState, useEffect } from 'react';
import { HiOutlineBookOpen, HiPlus, HiPencil, HiTrash, HiOutlinePlusSm, HiOutlineX } from 'react-icons/hi';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', sections: [], subjects: [] });
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, s] = await Promise.all([classService.getAll(), subjectService.getAll()]);
      setClasses(c);
      setSubjects(s);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({ name: cls.name, sections: cls.sections || [], subjects: cls.subjects || [] });
    } else {
      setEditingClass(null);
      setFormData({ name: '', sections: [], subjects: [] });
    }
    setNewSectionName('');
    setShowForm(true);
  };

  const addSection = () => {
    if (!newSectionName.trim()) return;
    const id = newSectionName.trim().toLowerCase().replace(/\s+/g, '-');
    if (formData.sections.some(s => s.id === id)) {
      toast.error('Section already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { id, name: newSectionName.trim() }],
    }));
    setNewSectionName('');
  };

  const removeSection = (id) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id),
    }));
  };

  const toggleSubject = (subjectId) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(s => s !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Class name is required'); return; }

    try {
      if (editingClass) {
        await classService.update(editingClass.id, formData);
        setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, ...formData } : c));
        toast.success('Class updated');
      } else {
        const newClass = await classService.create(formData);
        setClasses(prev => [newClass, ...prev]);
        toast.success('Class added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save class');
    }
  };

  const handleDelete = async () => {
    try {
      await classService.delete(deleteConfirm.id);
      setClasses(prev => prev.filter(c => c.id !== deleteConfirm.id));
      toast.success('Class deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete class');
    }
  };

  if (loading) return <Loader text="Loading classes..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Classes</h1>
          <p className="page-subtitle">Manage classes, sections, and their subject assignments</p>
        </div>
        <button id="add-class-btn" onClick={() => openForm()} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Add Class
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={HiOutlineBookOpen}
          title="No classes yet"
          description="Create classes with sections to organize your tuition center."
          action={<button onClick={() => openForm()} className="btn-primary">Add Class</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="glass-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-dark-900">{cls.name}</h3>
                  <p className="text-sm text-dark-500 mt-0.5">{(cls.sections || []).length} sections</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openForm(cls)} className="p-2 rounded-lg hover:bg-primary-50 text-dark-400 hover:text-primary-600 transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(cls)} className="p-2 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div className="mb-4">
                <p className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-2">Sections</p>
                <div className="flex flex-wrap gap-2">
                  {(cls.sections || []).map(section => (
                    <span key={section.id} className="badge-success">{section.name}</span>
                  ))}
                  {(!cls.sections || cls.sections.length === 0) && (
                    <span className="text-sm text-dark-400">No sections</span>
                  )}
                </div>
              </div>

              {/* Subjects */}
              <div>
                <p className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-2">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {(cls.subjects || []).map(subId => {
                    const sub = subjects.find(s => s.id === subId);
                    return sub ? <span key={subId} className="badge-primary">{sub.name}</span> : null;
                  })}
                  {(!cls.subjects || cls.subjects.length === 0) && (
                    <span className="text-sm text-dark-400">No subjects</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingClass ? 'Edit Class' : 'Add Class'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Class Name *</label>
            <input id="class-name" type="text" className="input-field" placeholder="e.g. Class 10"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          {/* Sections */}
          <div>
            <label className="label-text">Sections</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className="input-field" placeholder="e.g. Section A"
                value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }} />
              <button type="button" onClick={addSection} className="btn-secondary px-4 flex-shrink-0">
                <HiOutlinePlusSm className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.sections.map(section => (
                <span key={section.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                  {section.name}
                  <button type="button" onClick={() => removeSection(section.id)}
                    className="hover:text-emerald-900 transition-colors">
                    <HiOutlineX className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="label-text">Subjects taught in this class</label>
            {subjects.length === 0 ? (
              <p className="text-sm text-dark-400">No subjects created yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {subjects.map(sub => (
                  <button key={sub.id} type="button" onClick={() => toggleSubject(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      formData.subjects.includes(sub.id)
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-white border-dark-200 text-dark-500 hover:border-dark-300'
                    }`}>
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editingClass ? 'Update' : 'Add Class'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete}
        title="Delete Class" message={`Are you sure you want to delete "${deleteConfirm?.name}" and all its sections?`} />
    </div>
  );
};

export default Classes;
