import { useState, useEffect } from 'react';
import { HiOutlineAcademicCap, HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', classId: '', sectionId: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, c] = await Promise.all([studentService.getAll(), classService.getAll()]);
      setStudents(s);
      setClasses(c);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        phone: student.phone || '',
        classId: student.classId || '',
        sectionId: student.sectionId || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({ name: '', phone: '', classId: '', sectionId: '' });
    }
    setShowForm(true);
  };

  const getSelectedClass = () => classes.find(c => c.id === formData.classId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Name is required'); return; }

    try {
      const cls = classes.find(c => c.id === formData.classId);
      const section = cls?.sections?.find(s => s.id === formData.sectionId);
      const saveData = {
        ...formData,
        className: cls?.name || '',
        sectionName: section?.name || '',
      };

      if (editingStudent) {
        await studentService.update(editingStudent.id, saveData);
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...saveData } : s));
        toast.success('Student updated');
      } else {
        const newStudent = await studentService.create(saveData);
        setStudents(prev => [newStudent, ...prev]);
        toast.success('Student added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save student');
    }
  };

  const handleDelete = async () => {
    try {
      await studentService.delete(deleteConfirm.id);
      setStudents(prev => prev.filter(s => s.id !== deleteConfirm.id));
      toast.success('Student deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete student');
    }
  };

  if (loading) return <Loader text="Loading students..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Students</h1>
          <p className="page-subtitle">Manage students and their class assignments</p>
        </div>
        <button id="add-student-btn" onClick={() => openForm()} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={HiOutlineAcademicCap}
          title="No students yet"
          description="Add students and assign them to classes and sections."
          action={<button onClick={() => openForm()} className="btn-primary">Add Student</button>}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-50/50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Class</th>
                <th className="table-header">Section</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-dark-50/30 transition-colors">
                  <td className="table-cell font-semibold text-dark-900">{student.name}</td>
                  <td className="table-cell">{student.phone || '—'}</td>
                  <td className="table-cell">
                    <span className="badge-primary">{student.className || '—'}</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge-success">{student.sectionName || '—'}</span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openForm(student)} className="p-2 rounded-lg hover:bg-primary-50 text-dark-400 hover:text-primary-600 transition-colors">
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(student)} className="p-2 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors">
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingStudent ? 'Edit Student' : 'Add Student'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Full Name *</label>
            <input id="student-name" type="text" className="input-field" placeholder="Enter student name"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Phone Number</label>
            <input id="student-phone" type="text" className="input-field" placeholder="Enter phone number"
              value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Class</label>
            <select id="student-class" className="select-field"
              value={formData.classId} onChange={e => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {formData.classId && getSelectedClass()?.sections?.length > 0 && (
            <div>
              <label className="label-text">Section</label>
              <select id="student-section" className="select-field"
                value={formData.sectionId} onChange={e => setFormData({ ...formData, sectionId: e.target.value })}>
                <option value="">Select Section</option>
                {getSelectedClass().sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editingStudent ? 'Update' : 'Add Student'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete}
        title="Delete Student" message={`Are you sure you want to delete "${deleteConfirm?.name}"?`} />
    </div>
  );
};

export default Students;
