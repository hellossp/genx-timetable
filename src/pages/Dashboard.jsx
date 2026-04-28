import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { teacherService } from '../services/teacherService';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { timetableService } from '../services/timetableService';
import Loader from '../components/ui/Loader';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentTimetables, setRecentTimetables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teachers, students, classes, subjects, timetables] = await Promise.all([
        teacherService.getAll(),
        studentService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
        timetableService.getAll(),
      ]);

      setStats({
        teachers: teachers.length,
        students: students.length,
        classes: classes.length,
        subjects: subjects.length,
      });
      setRecentTimetables(timetables.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setStats({ teachers: 0, students: 0, classes: 0, subjects: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Loading dashboard..." />;

  const statCards = [
    { label: 'Teachers', value: stats.teachers, icon: HiOutlineUserGroup, color: 'from-blue-500 to-blue-600', link: '/teachers' },
    { label: 'Students', value: stats.students, icon: HiOutlineAcademicCap, color: 'from-emerald-500 to-emerald-600', link: '/students' },
    { label: 'Classes', value: stats.classes, icon: HiOutlineBookOpen, color: 'from-purple-500 to-purple-600', link: '/classes' },
    { label: 'Subjects', value: stats.subjects, icon: HiOutlineClipboardList, color: 'from-amber-500 to-orange-500', link: '/subjects' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-900">
          Welcome to <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">GenX</span>
        </h1>
        <p className="page-subtitle">Manage your tuition classes and generate timetables effortlessly</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Link
            key={card.label}
            to={card.link}
            className="stat-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-dark-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-4xl font-bold text-dark-900 mt-2">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
              View all <HiOutlineArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/generate"
          className="glass-card p-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
              <HiOutlineCalendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark-900">Generate Timetable</h3>
              <p className="text-sm text-dark-500 mt-0.5">Create weekly or daily schedules based on teacher availability</p>
            </div>
          </div>
        </Link>

        <Link
          to="/timetables"
          className="glass-card p-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <HiOutlineBookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark-900">View Timetables</h3>
              <p className="text-sm text-dark-500 mt-0.5">Browse and print saved schedules</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Timetables */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-dark-100">
          <h2 className="text-lg font-bold text-dark-900">Recent Timetables</h2>
        </div>
        {recentTimetables.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            <HiOutlineCalendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No timetables generated yet</p>
            <p className="text-xs mt-1">Set up subjects, teachers & classes first, then generate!</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-100">
            {recentTimetables.map(tt => (
              <div key={tt.id} className="px-6 py-4 flex items-center justify-between hover:bg-dark-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`badge ${tt.type === 'weekly' ? 'badge-primary' : 'badge-success'}`}>
                    {tt.type}
                  </div>
                  <div>
                    <p className="font-semibold text-dark-800 text-sm">
                      {tt.className || 'Class'} — {tt.sectionName || 'Section'}
                    </p>
                    <p className="text-xs text-dark-400">{tt.date || tt.weekStartDate}</p>
                  </div>
                </div>
                <span className="text-xs text-dark-400">{tt.createdAt ? new Date(tt.createdAt).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-dark-900 mb-4">📋 Quick Setup Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Add Subjects', desc: 'Math, Physics, etc.', link: '/subjects', done: stats.subjects > 0 },
            { step: '2', title: 'Add Teachers', desc: 'With subject & availability', link: '/teachers', done: stats.teachers > 0 },
            { step: '3', title: 'Add Classes', desc: 'With sections & subjects', link: '/classes', done: stats.classes > 0 },
            { step: '4', title: 'Generate!', desc: 'Create timetable', link: '/generate', done: recentTimetables.length > 0 },
          ].map(item => (
            <Link key={item.step} to={item.link}
              className={`p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5 ${
                item.done
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-dark-200 bg-white hover:border-amber-300'
              }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                item.done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-dark-200 text-dark-600'
              }`}>
                {item.done ? '✓' : item.step}
              </div>
              <p className="font-semibold text-dark-800 text-sm">{item.title}</p>
              <p className="text-xs text-dark-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
