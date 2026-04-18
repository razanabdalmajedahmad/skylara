'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';
import {
  BookOpen, Edit, Archive, Plus, X, ChevronDown, ChevronRight,
  Video, FileText, Award, Eye, Shield, Users,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  contentType: string;
  durationSeconds: number | null;
  isFree: boolean;
  sortOrder: number;
  moduleId: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: Lesson[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passScore: number;
  questionCount: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  level: string;
  accessType: string;
  visibility: string;
  status: string;
  coverImageUrl: string | null;
  estimatedDuration: number | null;
  isFeatured: boolean;
  createdAt: string;
  modules: Module[];
  lessons: Lesson[];
  quizzes: Quiz[];
  _count?: { enrollments: number };
  enrollmentCount?: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const CONTENT_TYPE_ICONS: Record<string, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  QUIZ: Award,
  PDF: FileText,
};

const CONTENT_TYPES = ['VIDEO', 'TEXT', 'PDF', 'QUIZ', 'INTERACTIVE', 'ASSIGNMENT'];
const VIDEO_PROVIDERS = ['EXTERNAL_URL', 'YOUTUBE', 'VIMEO', 'BUNNY', 'CLOUDFLARE'];

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Module form
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });

  // Lesson form
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    contentType: 'VIDEO',
    videoProvider: 'EXTERNAL_URL',
    externalVideoUrl: '',
    durationSeconds: '' as number | '',
    sortOrder: 0,
    isFree: false,
    moduleId: '',
  });

  // Quiz form
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    passScore: 70,
    questions: '[]',
  });

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ success: boolean; data: Course }>(`/learning/courses/${courseId}`);
      if (res.success && res.data) {
        setCourse(res.data);
        // Expand all modules by default
        const moduleIds = new Set((res.data.modules || []).map((m) => m.id));
        setExpandedModules(moduleIds);
      }
    } catch {
      setError('Failed to load course details.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusAction = async (action: 'publish' | 'archive') => {
    try {
      await apiPost(`/learning/courses/${courseId}/${action}`);
      await fetchCourse();
    } catch {
      setError(`Failed to ${action} course.`);
    }
  };

  const handleAddModule = async () => {
    if (!moduleForm.title.trim()) return;
    setModalSubmitting(true);
    setModalError('');
    try {
      await apiPost(`/learning/courses/${courseId}/modules`, moduleForm);
      setModuleForm({ title: '', description: '' });
      setShowModuleModal(false);
      await fetchCourse();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add module.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonForm.title.trim()) return;
    setModalSubmitting(true);
    setModalError('');
    try {
      const payload = {
        ...lessonForm,
        durationSeconds: lessonForm.durationSeconds === '' ? null : Number(lessonForm.durationSeconds),
        moduleId: lessonForm.moduleId || null,
      };
      await apiPost(`/learning/courses/${courseId}/lessons`, payload);
      setLessonForm({
        title: '', description: '', contentType: 'VIDEO', videoProvider: 'EXTERNAL_URL',
        externalVideoUrl: '', durationSeconds: '', sortOrder: 0, isFree: false, moduleId: '',
      });
      setShowLessonModal(false);
      await fetchCourse();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add lesson.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleAddQuiz = async () => {
    if (!quizForm.title.trim()) return;
    setModalSubmitting(true);
    setModalError('');
    try {
      let parsedQuestions: any[] = [];
      try {
        parsedQuestions = JSON.parse(quizForm.questions);
      } catch {
        setModalError('Questions must be valid JSON.');
        setModalSubmitting(false);
        return;
      }
      await apiPost(`/learning/courses/${courseId}/quizzes`, {
        title: quizForm.title,
        description: quizForm.description,
        passScore: quizForm.passScore,
        questions: parsedQuestions,
      });
      setQuizForm({ title: '', description: '', passScore: 70, questions: '[]' });
      setShowQuizModal(false);
      await fetchCourse();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add quiz.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
        {error}
      </div>
    );
  }

  if (!course) return null;

  const enrollments = course._count?.enrollments ?? course.enrollmentCount ?? 0;
  const unassignedLessons = (course.lessons || []).filter((l) => !l.moduleId);

  const ContentIcon = ({ type }: { type: string }) => {
    const Icon = CONTENT_TYPE_ICONS[type] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/learning/courses"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              Courses
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[course.status] || 'bg-gray-100 text-gray-700'}`}>
              {course.status}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {course.category}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created {new Date(course.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/learning/courses/${courseId}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          {course.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusAction('publish')}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Publish
            </button>
          )}
          {course.status === 'PUBLISHED' && (
            <button
              onClick={() => handleStatusAction('archive')}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          )}
          <button
            onClick={() => { setModalError(''); setShowModuleModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Module
          </button>
          <button
            onClick={() => { setModalError(''); setShowLessonModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Lesson
          </button>
          <button
            onClick={() => { setModalError(''); setShowQuizModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Enrollments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollments}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Modules</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(course.modules || []).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Lessons</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(course.lessons || []).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Quizzes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(course.quizzes || []).length}</p>
        </div>
      </div>

      {/* Course details */}
      {(course.description || course.shortDescription) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About This Course</h2>
          {course.shortDescription && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{course.shortDescription}</p>
          )}
          {course.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{course.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            <DetailItem label="Level" value={course.level?.replace('_', ' ')} />
            <DetailItem label="Access" value={course.accessType} />
            <DetailItem label="Visibility" value={course.visibility} />
            {course.estimatedDuration && (
              <DetailItem label="Duration" value={`${course.estimatedDuration} min`} />
            )}
            <DetailItem label="Featured" value={course.isFeatured ? 'Yes' : 'No'} />
          </div>
        </div>
      )}

      {/* Modules & Lessons */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Content</h2>

        {(course.modules || []).length === 0 && unassignedLessons.length === 0 && (course.quizzes || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <BookOpen className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No content yet. Add modules, lessons, or quizzes to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(course.modules || [])
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((mod) => (
                <div key={mod.id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedModules.has(mod.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <Shield className="w-4 h-4 text-[#1B4F72]" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{mod.title}</span>
                      <span className="text-xs text-gray-400">({(mod.lessons || []).length} lessons)</span>
                    </div>
                  </button>
                  {expandedModules.has(mod.id) && (
                    <div className="divide-y divide-gray-100">
                      {mod.description && (
                        <div className="px-4 py-2 bg-gray-50/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
                        </div>
                      )}
                      {(mod.lessons || []).length === 0 ? (
                        <div className="px-4 py-3">
                          <p className="text-xs text-gray-400">No lessons in this module yet.</p>
                        </div>
                      ) : (
                        (mod.lessons || [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 pl-10">
                              <ContentIcon type={lesson.contentType} />
                              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{lesson.title}</span>
                              {lesson.durationSeconds && (
                                <span className="text-xs text-gray-400">
                                  {Math.floor(lesson.durationSeconds / 60)}m {lesson.durationSeconds % 60}s
                                </span>
                              )}
                              {lesson.isFree && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">
                                  FREE
                                </span>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              ))}

            {/* Unassigned lessons */}
            {unassignedLessons.length > 0 && (
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unassigned Lessons</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {unassignedLessons
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((lesson) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                        <ContentIcon type={lesson.contentType} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{lesson.title}</span>
                        {lesson.durationSeconds && (
                          <span className="text-xs text-gray-400">
                            {Math.floor(lesson.durationSeconds / 60)}m {lesson.durationSeconds % 60}s
                          </span>
                        )}
                        {lesson.isFree && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">
                            FREE
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Quizzes */}
            {(course.quizzes || []).length > 0 && (
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quizzes</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {course.quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{quiz.title}</span>
                      <span className="text-xs text-gray-400">Pass: {quiz.passScore}%</span>
                      <span className="text-xs text-gray-400">{quiz.questionCount || 0} questions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Module Modal */}
      {showModuleModal && (
        <Modal title="Add Module" onClose={() => setShowModuleModal(false)}>
          <div className="space-y-4">
            {modalError && <ModalError message={modalError} />}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={moduleForm.title}
                onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="Module title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
                placeholder="Module description (optional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModuleModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModule}
                disabled={modalSubmitting || !moduleForm.title.trim()}
                className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {modalSubmitting ? 'Adding...' : 'Add Module'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <Modal title="Add Lesson" onClose={() => setShowLessonModal(false)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {modalError && <ModalError message={modalError} />}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="Lesson title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
                <select
                  value={lessonForm.contentType}
                  onChange={(e) => setLessonForm((f) => ({ ...f, contentType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video Provider</label>
                <select
                  value={lessonForm.videoProvider}
                  onChange={(e) => setLessonForm((f) => ({ ...f, videoProvider: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {VIDEO_PROVIDERS.map((vp) => (
                    <option key={vp} value={vp}>{vp.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Video URL</label>
              <input
                type="text"
                value={lessonForm.externalVideoUrl}
                onChange={(e) => setLessonForm((f) => ({ ...f, externalVideoUrl: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  value={lessonForm.durationSeconds}
                  onChange={(e) => setLessonForm((f) => ({ ...f, durationSeconds: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={lessonForm.sortOrder}
                  onChange={(e) => setLessonForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
              <select
                value={lessonForm.moduleId}
                onChange={(e) => setLessonForm((f) => ({ ...f, moduleId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
              >
                <option value="">No module (standalone)</option>
                {(course.modules || []).map((mod) => (
                  <option key={mod.id} value={mod.id}>{mod.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="lessonFree"
                checked={lessonForm.isFree}
                onChange={(e) => setLessonForm((f) => ({ ...f, isFree: e.target.checked }))}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 dark:border-slate-600 rounded focus:ring-[#1B4F72]"
              />
              <label htmlFor="lessonFree" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                This lesson is free (preview)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLesson}
                disabled={modalSubmitting || !lessonForm.title.trim()}
                className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {modalSubmitting ? 'Adding...' : 'Add Lesson'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Quiz Modal */}
      {showQuizModal && (
        <Modal title="Add Quiz" onClose={() => setShowQuizModal(false)}>
          <div className="space-y-4">
            {modalError && <ModalError message={modalError} />}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={quizForm.title}
                onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="Quiz title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={quizForm.description}
                onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pass Score (%)</label>
              <input
                type="number"
                value={quizForm.passScore}
                onChange={(e) => setQuizForm((f) => ({ ...f, passScore: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Questions (JSON)
              </label>
              <textarea
                value={quizForm.questions}
                onChange={(e) => setQuizForm((f) => ({ ...f, questions: e.target.value }))}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
                placeholder='[{"question": "...", "options": [...], "answer": 0}]'
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter questions as a JSON array. Each question should have &quot;question&quot;, &quot;options&quot;, and &quot;answer&quot; fields.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowQuizModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuiz}
                disabled={modalSubmitting || !quizForm.title.trim()}
                className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {modalSubmitting ? 'Adding...' : 'Add Quiz'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}: </span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
      {message}
    </div>
  );
}
