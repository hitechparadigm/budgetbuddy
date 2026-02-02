/**
 * Learn Page
 *
 * Educational content hub with courses, lessons, quizzes, and gamification.
 * Features progress tracking, badges, and learning streaks.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  learnApi,
  Course,
  CourseDetail,
  Badge,
  Progress,
  Lesson,
} from "../services/learnApi";

type ViewMode = "courses" | "course" | "lesson" | "quiz";

export const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("courses");
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(
    null,
  );
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{
    passed: boolean;
    score: number;
    totalQuestions: number;
  } | null>(null);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, progressRes, badgesRes] = await Promise.all([
        learnApi.getCourses(),
        learnApi.getProgress(),
        learnApi.getBadges(),
      ]);
      setCourses(coursesRes.courses);
      setProgress(progressRes);
      setBadges(badgesRes.badges);
    } catch (error) {
      console.error("Error loading learn data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCourse = async (courseId: string) => {
    try {
      setLoading(true);
      const course = await learnApi.getCourse(courseId);
      setSelectedCourse(course);
      setViewMode("course");
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  const openLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      const lesson = await learnApi.getLesson(lessonId);
      setSelectedLesson(lesson);
      setViewMode("lesson");
    } catch (error) {
      console.error("Error loading lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeLesson = async () => {
    if (!selectedLesson) return;
    try {
      setCompletingLesson(true);
      const result = await learnApi.completeLesson(selectedLesson.id);
      if (result.badgesEarned?.length > 0) {
        setNewBadges(result.badgesEarned);
      }
      // Refresh course data
      if (selectedCourse) {
        const course = await learnApi.getCourse(selectedCourse.id);
        setSelectedCourse(course);
      }
      // Go back to course view
      setViewMode("course");
      setSelectedLesson(null);
    } catch (error) {
      console.error("Error completing lesson:", error);
    } finally {
      setCompletingLesson(false);
    }
  };

  const startQuiz = () => {
    setQuizAnswers({});
    setQuizResult(null);
    setViewMode("quiz");
  };

  const submitQuiz = async () => {
    if (!selectedCourse?.quiz) return;
    try {
      setSubmittingQuiz(true);
      const result = await learnApi.submitQuiz(
        selectedCourse.quiz.id,
        quizAnswers,
      );
      setQuizResult({
        passed: result.passed,
        score: result.score,
        totalQuestions: result.totalQuestions,
      });
      if (result.badgesEarned?.length > 0) {
        setNewBadges((prev) => [...prev, ...result.badgesEarned]);
      }
      // Refresh data
      await loadData();
      if (selectedCourse) {
        const course = await learnApi.getCourse(selectedCourse.id);
        setSelectedCourse(course);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const goBack = () => {
    if (viewMode === "lesson" || viewMode === "quiz") {
      setViewMode("course");
      setSelectedLesson(null);
      setQuizResult(null);
    } else if (viewMode === "course") {
      setViewMode("courses");
      setSelectedCourse(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && viewMode === "courses") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  // Badge earned modal
  const BadgeModal = () => {
    if (newBadges.length === 0) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div className="text-6xl mb-4">{newBadges[0].icon}</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Badge Earned!
          </h3>
          <p className="text-lg font-medium text-gray-800">
            {newBadges[0].name}
          </p>
          <p className="text-gray-600 mt-1">{newBadges[0].description}</p>
          <button
            onClick={() => setNewBadges((prev) => prev.slice(1))}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Awesome!
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <BadgeModal />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {viewMode !== "courses" && (
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => navigate("/budget")}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Budget
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📚 Financial Education
          </h1>
        </div>

        {/* Progress Stats */}
        {viewMode === "courses" && progress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {progress.totalLessonsCompleted}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Lessons Completed
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {progress.totalCoursesCompleted}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Courses Completed
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-3xl font-bold text-purple-600">
                {progress.totalQuizzesPassed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Quizzes Passed
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-3xl font-bold text-orange-600">
                🔥 {progress.currentStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Day Streak
              </div>
            </div>
          </div>
        )}

        {/* Badges Section */}
        {viewMode === "courses" && badges.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🏆 Your Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    badge.earned
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                      : "bg-gray-100 dark:bg-gray-700 opacity-50"
                  }`}
                  title={badge.description}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span
                    className={`text-sm font-medium ${badge.earned ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
                  >
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses List */}
        {viewMode === "courses" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Courses
            </h2>
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => openCourse(course.id)}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {course.title}
                      </h3>
                      {course.isComplete && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded ${getDifficultyColor(course.difficulty)}`}
                      >
                        {course.difficulty}
                      </span>
                      <span className="text-gray-500">
                        ⏱️ {course.estimatedMinutes} min
                      </span>
                      <span className="text-gray-500">
                        📖 {course.completedLessons}/{course.totalLessons}{" "}
                        lessons
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {course.progressPercent}%
                    </div>
                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Course Detail View */}
        {viewMode === "course" && selectedCourse && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedCourse.title}
                </h2>
                {selectedCourse.isComplete && (
                  <span className="text-green-600 text-xl">✓</span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedCourse.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded ${getDifficultyColor(selectedCourse.difficulty)}`}
                >
                  {selectedCourse.difficulty}
                </span>
                <span className="text-gray-500">
                  ⏱️ {selectedCourse.estimatedMinutes} min
                </span>
                <span className="text-gray-500">
                  Progress: {selectedCourse.progressPercent}%
                </span>
              </div>
            </div>

            {/* Lessons List */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Lessons
              </h3>
              <div className="space-y-2">
                {selectedCourse.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    onClick={() => openLesson(lesson.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      lesson.isCompleted
                        ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        lesson.isCompleted
                          ? "bg-green-600 text-white"
                          : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {lesson.isCompleted ? "✓" : index + 1}
                    </div>
                    <span
                      className={`flex-1 ${lesson.isCompleted ? "text-green-800 dark:text-green-300" : "text-gray-900 dark:text-white"}`}
                    >
                      {lesson.title}
                    </span>
                    <span className="text-gray-400">→</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz Section */}
            {selectedCourse.quiz && (
              <div className="p-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      📝 Course Quiz
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedCourse.quiz.passed
                        ? `Passed with score: ${selectedCourse.quiz.score}`
                        : "Complete all lessons to unlock the quiz"}
                    </p>
                  </div>
                  <button
                    onClick={startQuiz}
                    disabled={
                      selectedCourse.completedLessons <
                      selectedCourse.totalLessons
                    }
                    className={`px-4 py-2 rounded-lg font-medium ${
                      selectedCourse.completedLessons >=
                      selectedCourse.totalLessons
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {selectedCourse.quiz.passed ? "Retake Quiz" : "Take Quiz"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lesson View */}
        {viewMode === "lesson" && selectedLesson && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedLesson.title}
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedLesson.content}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={completeLesson}
                disabled={completingLesson || selectedLesson.isCompleted}
                className={`px-6 py-2 rounded-lg font-medium ${
                  selectedLesson.isCompleted
                    ? "bg-green-100 text-green-800 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {completingLesson
                  ? "Saving..."
                  : selectedLesson.isCompleted
                    ? "✓ Completed"
                    : "Mark as Complete"}
              </button>
            </div>
          </div>
        )}

        {/* Quiz View */}
        {viewMode === "quiz" && selectedCourse && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              📝 {selectedCourse.title} - Quiz
            </h2>

            {quizResult ? (
              <div className="text-center py-8">
                <div className={`text-6xl mb-4 ${quizResult.passed ? "" : ""}`}>
                  {quizResult.passed ? "🎉" : "😔"}
                </div>
                <h3
                  className={`text-2xl font-bold mb-2 ${quizResult.passed ? "text-green-600" : "text-red-600"}`}
                >
                  {quizResult.passed ? "Congratulations!" : "Not quite..."}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You scored {quizResult.score} out of{" "}
                  {quizResult.totalQuestions}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={goBack}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Back to Course
                  </button>
                  {!quizResult.passed && (
                    <button
                      onClick={() => {
                        setQuizResult(null);
                        setQuizAnswers({});
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Answer the following questions to complete the course.
                </p>
                {/* Quiz questions would be loaded from the course detail */}
                <div className="text-center py-8 text-gray-500">
                  Quiz questions loading...
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={submitQuiz}
                    disabled={submittingQuiz}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingQuiz ? "Submitting..." : "Submit Quiz"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
