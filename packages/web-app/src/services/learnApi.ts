/**
 * Learn API Service
 *
 * Handles educational content API calls for courses, lessons, quizzes, and badges.
 */

const API_BASE = import.meta.env.VITE_FEATURES_API_URL || 'https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('budgetbuddy_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  isComplete: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
  isCompleted?: boolean;
}

export interface CourseDetail extends Course {
  lessons: Lesson[];
  quiz?: {
    id: string;
    passed: boolean;
    score?: number;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface Progress {
  totalLessonsCompleted: number;
  totalCoursesCompleted: number;
  totalQuizzesPassed: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  badges: Badge[];
}

export const learnApi = {
  async getCourses(): Promise<{ courses: Course[]; total: number }> {
    const response = await fetch(`${API_BASE}/learn/courses`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch courses');
    const data = await response.json();
    return data.data;
  },

  async getCourse(courseId: string): Promise<CourseDetail> {
    const response = await fetch(`${API_BASE}/learn/courses/${courseId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch course');
    const data = await response.json();
    return data.data.course;
  },

  async getLesson(lessonId: string): Promise<Lesson> {
    const response = await fetch(`${API_BASE}/learn/lessons/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lesson');
    const data = await response.json();
    return data.data.lesson;
  },

  async completeLesson(lessonId: string): Promise<{ badgesEarned: Badge[] }> {
    const response = await fetch(`${API_BASE}/learn/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to complete lesson');
    const data = await response.json();
    return data.data;
  },

  async submitQuiz(quizId: string, answers: Record<string, number>): Promise<{
    passed: boolean;
    score: number;
    totalQuestions: number;
    passingScore: number;
    badgesEarned: Badge[];
  }> {
    const response = await fetch(`${API_BASE}/learn/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) throw new Error('Failed to submit quiz');
    const data = await response.json();
    return data.data;
  },

  async getProgress(): Promise<Progress> {
    const response = await fetch(`${API_BASE}/learn/progress`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch progress');
    const data = await response.json();
    return data.data;
  },

  async getBadges(): Promise<{ badges: Badge[]; total: number; earned: number }> {
    const response = await fetch(`${API_BASE}/learn/badges`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch badges');
    const data = await response.json();
    return data.data;
  },
};
