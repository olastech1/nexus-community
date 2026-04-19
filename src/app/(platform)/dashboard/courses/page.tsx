'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function CourseBuilderPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Forms
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonForm, setLessonForm] = useState({ moduleId: '', title: '', content: '', videoUrl: '' });

  useEffect(() => {
    fetch('/api/dashboard/stats').then(r => r.json()).then(d => {
      const c = d.communities || [];
      setCommunities(c);
      if (c.length > 0) setSelectedCommunity(c[0].id);
      setLoading(false);
    });
  }, []);

  const fetchCourses = useCallback(async () => {
    if (!selectedCommunity) return;
    const data = await fetch(`/api/courses?communityId=${selectedCommunity}`).then(r => r.json());
    setCourses(data || []);
  }, [selectedCommunity]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const createCourse = async () => {
    if (!courseTitle.trim()) return;
    const res = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId: selectedCommunity, title: courseTitle, description: courseDesc }) });
    if (res.ok) { addToast('success', 'Course created!'); setShowCourseForm(false); setCourseTitle(''); setCourseDesc(''); fetchCourses(); }
  };

  const togglePublish = async (course: any) => {
    await fetch('/api/courses', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: course.id, published: !course.published }) });
    fetchCourses();
  };

  const deleteCourse = async (id: string) => {
    await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
    addToast('success', 'Course deleted');
    fetchCourses();
  };

  const addModule = async (courseId: string) => {
    if (!moduleTitle.trim()) return;
    await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title: moduleTitle }) });
    setModuleTitle('');
    fetchCourses();
  };

  const deleteModule = async (id: string) => {
    await fetch(`/api/modules?id=${id}`, { method: 'DELETE' });
    fetchCourses();
  };

  const addLesson = async () => {
    if (!lessonForm.moduleId || !lessonForm.title.trim()) return;
    await fetch('/api/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lessonForm) });
    setLessonForm({ moduleId: '', title: '', content: '', videoUrl: '' });
    fetchCourses();
  };

  const deleteLesson = async (id: string) => {
    await fetch(`/api/lessons?id=${id}`, { method: 'DELETE' });
    fetchCourses();
  };

  if (loading) return <div><div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} /></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>📚 Course Builder</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create and manage your courses.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {communities.length > 1 && (
            <select className="input" value={selectedCommunity} onChange={e => setSelectedCommunity(e.target.value)}
              style={{ width: '200px' }}>
              {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn btn-gradient" onClick={() => setShowCourseForm(true)}>+ New Course</button>
        </div>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📚</div>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>No courses yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Create your first course to start teaching.</p>
          <button className="btn btn-gradient" onClick={() => setShowCourseForm(true)}>+ New Course</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {courses.map(course => (
            <div key={course.id} className="card">
              {/* Course Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: '20px' }}>{expandedCourse === course.id ? '📖' : '📕'}</span>
                  <div>
                    <h3 style={{ fontWeight: 700 }}>{course.title}</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <span>{course.totalLessons} lessons</span>
                      <span>{course.modules?.length || 0} modules</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className={`badge ${course.published ? 'badge-success' : 'badge-warning'}`}>
                    {course.published ? 'Published' : 'Draft'}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); togglePublish(course); }}>
                    {course.published ? '📴' : '📡'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); deleteCourse(course.id); }}
                    style={{ color: 'var(--error)' }}>🗑️</button>
                </div>
              </div>

              {/* Expanded: Modules & Lessons */}
              {expandedCourse === course.id && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
                  {course.modules?.map((mod: any) => (
                    <div key={mod.id} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>📁 {mod.title}</h4>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteModule(mod.id)} style={{ color: 'var(--error)', fontSize: 'var(--text-xs)' }}>✕</button>
                      </div>
                      {mod.lessons?.map((lesson: any, li: number) => (
                        <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)',
                          borderBottom: li < mod.lessons.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{li + 1}.</span>
                            <span style={{ fontSize: 'var(--text-sm)' }}>{lesson.title}</span>
                            {lesson.videoUrl && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)' }}>🎬</span>}
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => deleteLesson(lesson.id)} style={{ color: 'var(--error)', fontSize: 'var(--text-xs)' }}>✕</button>
                        </div>
                      ))}
                      {/* Add Lesson inline */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        <input className="input" placeholder="Lesson title..." value={lessonForm.moduleId === mod.id ? lessonForm.title : ''}
                          onChange={e => setLessonForm({ ...lessonForm, moduleId: mod.id, title: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addLesson(); }}
                          style={{ flex: 1, fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }} />
                        <input className="input" placeholder="Video URL (optional)" value={lessonForm.moduleId === mod.id ? lessonForm.videoUrl : ''}
                          onChange={e => setLessonForm({ ...lessonForm, moduleId: mod.id, videoUrl: e.target.value })}
                          style={{ flex: 1, fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }} />
                        <button className="btn btn-primary btn-sm" onClick={addLesson} style={{ fontSize: 'var(--text-xs)' }}>+ Lesson</button>
                      </div>
                    </div>
                  ))}

                  {/* Add Module */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <input className="input" placeholder="New module title..." value={moduleTitle}
                      onChange={e => setModuleTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addModule(course.id); }}
                      style={{ flex: 1, fontSize: 'var(--text-sm)' }} />
                    <button className="btn btn-secondary btn-sm" onClick={() => addModule(course.id)}>+ Module</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseForm && (<>
        <div className="modal-backdrop" onClick={() => setShowCourseForm(false)} />
        <div className="modal">
          <div className="modal-header"><h2>New Course</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowCourseForm(false)}>✕</button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group"><label>Title</label><input className="input" placeholder="Course title" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} /></div>
            <div className="input-group"><label>Description</label><textarea className="input" placeholder="What will students learn?" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} rows={3} /></div>
            <button className="btn btn-gradient" onClick={createCourse} style={{ width: '100%' }} disabled={!courseTitle.trim()}>Create Course</button>
          </div>
        </div>
      </>)}
    </div>
  );
}
