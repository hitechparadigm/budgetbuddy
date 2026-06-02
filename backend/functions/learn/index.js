/**
 * BudgetBuddy Educational Content Lambda Function
 *
 * Provides financial education courses, lessons, quizzes, and gamification
 * features like badges and streaks to encourage learning.
 *
 * Version: 1.0.0
 */

const {
  successResponse,
  errorResponse,
  getUserFromEvent,
  dynamoHelpers,
  logger,
} = require("/opt/nodejs/utils");

const { checkPermission } = require("/opt/nodejs/shared");

// Course content library
const COURSES = {
  "budgeting-101": {
    id: "budgeting-101",
    title: "Budgeting 101",
    description: "Learn the fundamentals of creating and maintaining a budget",
    difficulty: "beginner",
    estimatedMinutes: 30,
    lessons: [
      {
        id: "b101-l1",
        title: "Why Budget?",
        content:
          "A budget is a plan for your money. It helps you understand where your money goes and ensures you have enough for the things that matter most. Without a budget, it's easy to overspend and end up in debt.",
        order: 1,
      },
      {
        id: "b101-l2",
        title: "Income vs Expenses",
        content:
          "Your income is all the money coming in (salary, side jobs, investments). Your expenses are all the money going out (rent, food, entertainment). The goal is to have income greater than expenses.",
        order: 2,
      },
      {
        id: "b101-l3",
        title: "The 50/30/20 Rule",
        content:
          "A simple budgeting framework: 50% of income goes to needs (housing, food, utilities), 30% to wants (entertainment, dining out), and 20% to savings and debt repayment.",
        order: 3,
      },
      {
        id: "b101-l4",
        title: "Zero-Based Budgeting",
        content:
          "Give every dollar a job. Your income minus all expenses (including savings) should equal zero. This ensures you're intentional with every dollar.",
        order: 4,
      },
    ],
    quiz: {
      id: "b101-quiz",
      questions: [
        {
          id: "q1",
          question: "What percentage should go to needs in the 50/30/20 rule?",
          options: ["30%", "50%", "20%", "40%"],
          correctAnswer: 1,
        },
        {
          id: "q2",
          question:
            "In zero-based budgeting, income minus expenses should equal:",
          options: [
            "Your savings",
            "Zero",
            "20% of income",
            "Whatever is left",
          ],
          correctAnswer: 1,
        },
        {
          id: "q3",
          question: "Which is NOT typically considered a 'need'?",
          options: ["Housing", "Food", "Streaming subscriptions", "Utilities"],
          correctAnswer: 2,
        },
      ],
      passingScore: 2,
    },
  },
  "debt-freedom": {
    id: "debt-freedom",
    title: "Debt Freedom",
    description: "Strategies to pay off debt and achieve financial freedom",
    difficulty: "intermediate",
    estimatedMinutes: 45,
    lessons: [
      {
        id: "df-l1",
        title: "Understanding Debt",
        content:
          "Not all debt is equal. High-interest debt (credit cards) should be prioritized. Low-interest debt (mortgage) can be managed over time. Know your interest rates!",
        order: 1,
      },
      {
        id: "df-l2",
        title: "Debt Snowball Method",
        content:
          "Pay minimum on all debts, then put extra money toward the smallest balance. When it's paid off, roll that payment to the next smallest. Quick wins build momentum!",
        order: 2,
      },
      {
        id: "df-l3",
        title: "Debt Avalanche Method",
        content:
          "Pay minimum on all debts, then put extra money toward the highest interest rate. Mathematically optimal - saves the most money over time.",
        order: 3,
      },
      {
        id: "df-l4",
        title: "Avoiding New Debt",
        content:
          "Cut up credit cards or freeze them. Use cash or debit only. Build an emergency fund so unexpected expenses don't require borrowing.",
        order: 4,
      },
    ],
    quiz: {
      id: "df-quiz",
      questions: [
        {
          id: "q1",
          question:
            "Which debt payoff method focuses on the smallest balance first?",
          options: [
            "Avalanche",
            "Snowball",
            "Minimum payment",
            "Consolidation",
          ],
          correctAnswer: 1,
        },
        {
          id: "q2",
          question: "Which method saves the most money mathematically?",
          options: ["Snowball", "Avalanche", "Both are equal", "Neither"],
          correctAnswer: 1,
        },
      ],
      passingScore: 2,
    },
  },
  "emergency-fund": {
    id: "emergency-fund",
    title: "Emergency Fund Basics",
    description: "Build your financial safety net",
    difficulty: "beginner",
    estimatedMinutes: 20,
    lessons: [
      {
        id: "ef-l1",
        title: "Why Emergency Funds Matter",
        content:
          "Life happens - car repairs, medical bills, job loss. An emergency fund prevents you from going into debt when unexpected expenses arise.",
        order: 1,
      },
      {
        id: "ef-l2",
        title: "How Much to Save",
        content:
          "Start with $1,000 as a starter fund. Then build to 3-6 months of expenses. If your income is variable, aim for 6-12 months.",
        order: 2,
      },
      {
        id: "ef-l3",
        title: "Where to Keep It",
        content:
          "Keep your emergency fund in a high-yield savings account. It should be accessible but not too easy to spend. Don't invest it - you need it liquid.",
        order: 3,
      },
    ],
    quiz: {
      id: "ef-quiz",
      questions: [
        {
          id: "q1",
          question: "What's a good starter emergency fund amount?",
          options: ["$100", "$500", "$1,000", "$10,000"],
          correctAnswer: 2,
        },
        {
          id: "q2",
          question: "Where should you keep your emergency fund?",
          options: [
            "Under your mattress",
            "In stocks",
            "High-yield savings account",
            "Checking account",
          ],
          correctAnswer: 2,
        },
      ],
      passingScore: 2,
    },
  },
};

// Badge definitions
const BADGES = {
  "first-lesson": {
    id: "first-lesson",
    name: "First Steps",
    description: "Complete your first lesson",
    icon: "🎓",
    condition: { type: "lessons_completed", count: 1 },
  },
  "course-complete": {
    id: "course-complete",
    name: "Course Graduate",
    description: "Complete an entire course",
    icon: "🏆",
    condition: { type: "courses_completed", count: 1 },
  },
  "quiz-master": {
    id: "quiz-master",
    name: "Quiz Master",
    description: "Pass 3 quizzes",
    icon: "📝",
    condition: { type: "quizzes_passed", count: 3 },
  },
  "streak-3": {
    id: "streak-3",
    name: "On a Roll",
    description: "Maintain a 3-day learning streak",
    icon: "🔥",
    condition: { type: "streak", count: 3 },
  },
  "streak-7": {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    icon: "⚡",
    condition: { type: "streak", count: 7 },
  },
  "all-courses": {
    id: "all-courses",
    name: "Financial Scholar",
    description: "Complete all available courses",
    icon: "👑",
    condition: {
      type: "courses_completed",
      count: Object.keys(COURSES).length,
    },
  },
};

/**
 * Main Lambda handler for learn operations
 */
exports.handler = async (event, context) => {
  logger.info("Learn request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint (public)
    if (httpMethod === "GET" && path === "/learn/health") {
      return successResponse(
        { status: "healthy", service: "learn", version: "1.0.0" },
        "Learn service is healthy",
      );
    }

    // CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: "",
      };
    }

    // All other endpoints require authentication
    const user = getUserFromEvent(event);
    const hasPermission = await checkPermission(user, "viewer");
    if (!hasPermission) {
      return errorResponse.forbidden("Insufficient permissions");
    }

    // Route handling
    if (httpMethod === "GET" && path === "/learn/courses") {
      return await getCourses(event, user);
    }

    if (
      httpMethod === "GET" &&
      pathParameters?.courseId &&
      path.match(/\/learn\/courses\/[^/]+$/)
    ) {
      return await getCourse(event, user, pathParameters.courseId);
    }

    // GET /learn/lessons — list all lessons across all courses
    if (httpMethod === "GET" && path === "/learn/lessons") {
      return await getLessons(event, user);
    }

    if (
      httpMethod === "GET" &&
      pathParameters?.lessonId &&
      path.includes("/lessons/") &&
      !path.includes("/complete")
    ) {
      return await getLesson(event, user, pathParameters.lessonId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.lessonId &&
      path.includes("/complete")
    ) {
      return await completeLesson(event, user, pathParameters.lessonId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.quizId &&
      path.includes("/submit")
    ) {
      return await submitQuiz(event, user, pathParameters.quizId);
    }

    if (httpMethod === "GET" && path === "/learn/progress") {
      return await getProgress(event, user);
    }

    if (httpMethod === "GET" && path === "/learn/badges") {
      return await getBadges(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Learn function error", error, {
      requestId: context.awsRequestId,
    });

    if (error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }
    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * Get all courses with user progress
 * GET /learn/courses
 */
async function getCourses(event, user) {
  const progress = await getUserProgress(user.userId);

  const courses = Object.values(COURSES).map((course) => {
    const courseProgress = progress.courses?.[course.id] || {};
    const completedLessons = courseProgress.completedLessons || [];
    const totalLessons = course.lessons.length;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty,
      estimatedMinutes: course.estimatedMinutes,
      totalLessons,
      completedLessons: completedLessons.length,
      progressPercent: Math.round(
        (completedLessons.length / totalLessons) * 100,
      ),
      isComplete:
        completedLessons.length === totalLessons && courseProgress.quizPassed,
    };
  });

  return successResponse(
    { courses, total: courses.length },
    "Courses retrieved",
  );
}

/**
 * Get single course with lessons
 * GET /learn/courses/:courseId
 */
async function getCourse(event, user, courseId) {
  const course = COURSES[courseId];
  if (!course) {
    return errorResponse.notFound("Course not found");
  }

  const progress = await getUserProgress(user.userId);
  const courseProgress = progress.courses?.[courseId] || {};
  const completedLessons = new Set(courseProgress.completedLessons || []);

  const lessons = course.lessons.map((lesson) => ({
    ...lesson,
    isComplete: completedLessons.has(lesson.id),
  }));

  return successResponse(
    {
      ...course,
      lessons,
      quizPassed: courseProgress.quizPassed || false,
      quizScore: courseProgress.quizScore,
    },
    "Course retrieved",
  );
}

/**
 * Get all lessons across all courses
 * GET /learn/lessons
 */
async function getLessons(event, user) {
  const progress = await getUserProgress(user.userId);
  const courseFilter = event.queryStringParameters?.courseId;

  const lessons = [];
  for (const course of Object.values(COURSES)) {
    if (courseFilter && course.id !== courseFilter) continue;
    const courseProgress = progress.courses?.[course.id] || {};
    const completedLessons = new Set(courseProgress.completedLessons || []);

    for (const lesson of course.lessons) {
      lessons.push({
        ...lesson,
        courseId: course.id,
        courseTitle: course.title,
        isComplete: completedLessons.has(lesson.id),
      });
    }
  }

  // Sort by course then lesson order
  lessons.sort((a, b) => {
    if (a.courseId !== b.courseId) return a.courseId.localeCompare(b.courseId);
    return (a.order || 0) - (b.order || 0);
  });

  return successResponse(
    { lessons, total: lessons.length },
    "Lessons retrieved",
  );
}

/**
 * Get single lesson
 * GET /learn/lessons/:lessonId
 */
async function getLesson(event, user, lessonId) {
  // Find lesson in courses
  for (const course of Object.values(COURSES)) {
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      const progress = await getUserProgress(user.userId);
      const courseProgress = progress.courses?.[course.id] || {};
      const isComplete = (courseProgress.completedLessons || []).includes(
        lessonId,
      );

      return successResponse(
        {
          ...lesson,
          courseId: course.id,
          courseTitle: course.title,
          isComplete,
        },
        "Lesson retrieved",
      );
    }
  }

  return errorResponse.notFound("Lesson not found");
}

/**
 * Mark lesson as complete
 * POST /learn/lessons/:lessonId/complete
 */
async function completeLesson(event, user, lessonId) {
  // Find lesson and course
  let foundCourse = null;
  let foundLesson = null;

  for (const course of Object.values(COURSES)) {
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      foundCourse = course;
      foundLesson = lesson;
      break;
    }
  }

  if (!foundLesson) {
    return errorResponse.notFound("Lesson not found");
  }

  // Update progress
  const progress = await getUserProgress(user.userId);
  const courseProgress = progress.courses?.[foundCourse.id] || {
    completedLessons: [],
  };

  if (!courseProgress.completedLessons.includes(lessonId)) {
    courseProgress.completedLessons.push(lessonId);
  }

  progress.courses = progress.courses || {};
  progress.courses[foundCourse.id] = courseProgress;
  progress.totalLessonsCompleted = (progress.totalLessonsCompleted || 0) + 1;

  // Update streak
  await updateStreak(user.userId, progress);

  // Check for new badges
  const newBadges = await checkAndAwardBadges(user.userId, progress);

  await saveUserProgress(user.userId, progress);

  logger.info("Lesson completed", {
    userId: user.userId,
    lessonId,
    courseId: foundCourse.id,
  });

  return successResponse(
    {
      lessonId,
      courseId: foundCourse.id,
      courseProgress: {
        completedLessons: courseProgress.completedLessons.length,
        totalLessons: foundCourse.lessons.length,
      },
      newBadges,
    },
    "Lesson completed",
  );
}

/**
 * Submit quiz answers
 * POST /learn/quiz/:quizId/submit
 */
async function submitQuiz(event, user, quizId) {
  // Find quiz in courses
  let foundCourse = null;
  let foundQuiz = null;

  for (const course of Object.values(COURSES)) {
    if (course.quiz?.id === quizId) {
      foundCourse = course;
      foundQuiz = course.quiz;
      break;
    }
  }

  if (!foundQuiz) {
    return errorResponse.notFound("Quiz not found");
  }

  const body = JSON.parse(event.body || "{}");
  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    return errorResponse.badRequest("Answers array required");
  }

  // Grade quiz
  let correctCount = 0;
  const results = foundQuiz.questions.map((q, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;
    return {
      questionId: q.id,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  const passed = correctCount >= foundQuiz.passingScore;
  const score = Math.round((correctCount / foundQuiz.questions.length) * 100);

  // Update progress
  const progress = await getUserProgress(user.userId);
  const courseProgress = progress.courses?.[foundCourse.id] || {
    completedLessons: [],
  };

  courseProgress.quizPassed = passed;
  courseProgress.quizScore = score;
  courseProgress.quizAttempts = (courseProgress.quizAttempts || 0) + 1;

  progress.courses = progress.courses || {};
  progress.courses[foundCourse.id] = courseProgress;

  if (passed) {
    progress.quizzesPassed = (progress.quizzesPassed || 0) + 1;

    // Check if course is now complete
    const allLessonsComplete =
      courseProgress.completedLessons.length === foundCourse.lessons.length;
    if (allLessonsComplete) {
      progress.coursesCompleted = (progress.coursesCompleted || 0) + 1;
    }
  }

  // Check for new badges
  const newBadges = await checkAndAwardBadges(user.userId, progress);

  await saveUserProgress(user.userId, progress);

  logger.info("Quiz submitted", {
    userId: user.userId,
    quizId,
    score,
    passed,
  });

  return successResponse(
    {
      quizId,
      courseId: foundCourse.id,
      score,
      passed,
      correctCount,
      totalQuestions: foundQuiz.questions.length,
      passingScore: foundQuiz.passingScore,
      results,
      newBadges,
    },
    passed ? "Quiz passed!" : "Quiz not passed",
  );
}

/**
 * Get user's learning progress
 * GET /learn/progress
 */
async function getProgress(event, user) {
  const progress = await getUserProgress(user.userId);

  const totalCourses = Object.keys(COURSES).length;
  const totalLessons = Object.values(COURSES).reduce(
    (sum, c) => sum + c.lessons.length,
    0,
  );

  return successResponse(
    {
      streak: progress.streak || 0,
      lastActivityDate: progress.lastActivityDate,
      totalLessonsCompleted: progress.totalLessonsCompleted || 0,
      totalLessons,
      coursesCompleted: progress.coursesCompleted || 0,
      totalCourses,
      quizzesPassed: progress.quizzesPassed || 0,
      badgesEarned: (progress.badges || []).length,
      totalBadges: Object.keys(BADGES).length,
    },
    "Progress retrieved",
  );
}

/**
 * Get user's badges
 * GET /learn/badges
 */
async function getBadges(event, user) {
  const progress = await getUserProgress(user.userId);
  const earnedBadgeIds = new Set(progress.badges || []);

  const badges = Object.values(BADGES).map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.has(badge.id),
    earnedAt: progress.badgeEarnedDates?.[badge.id],
  }));

  return successResponse(
    {
      badges,
      earned: badges.filter((b) => b.earned).length,
      total: badges.length,
    },
    "Badges retrieved",
  );
}

/**
 * Get user's learning progress from DynamoDB
 */
async function getUserProgress(userId) {
  const progress = await dynamoHelpers.getItem(
    `USER#${userId}`,
    "LEARN_PROGRESS",
  );
  return (
    progress || {
      courses: {},
      badges: [],
      badgeEarnedDates: {},
      streak: 0,
      totalLessonsCompleted: 0,
      coursesCompleted: 0,
      quizzesPassed: 0,
    }
  );
}

/**
 * Save user's learning progress
 */
async function saveUserProgress(userId, progress) {
  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: "LEARN_PROGRESS",
    entityType: "LEARN_PROGRESS",
    userId,
    ...progress,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update learning streak
 */
async function updateStreak(userId, progress) {
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = progress.lastActivityDate;

  if (lastActivity === today) {
    // Already active today, no change
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastActivity === yesterdayStr) {
    // Consecutive day, increment streak
    progress.streak = (progress.streak || 0) + 1;
  } else {
    // Streak broken, reset to 1
    progress.streak = 1;
  }

  progress.lastActivityDate = today;
}

/**
 * Check and award badges based on progress
 */
async function checkAndAwardBadges(userId, progress) {
  const newBadges = [];
  const earnedBadges = new Set(progress.badges || []);

  for (const badge of Object.values(BADGES)) {
    if (earnedBadges.has(badge.id)) continue;

    let earned = false;
    const condition = badge.condition;

    switch (condition.type) {
      case "lessons_completed":
        earned = (progress.totalLessonsCompleted || 0) >= condition.count;
        break;
      case "courses_completed":
        earned = (progress.coursesCompleted || 0) >= condition.count;
        break;
      case "quizzes_passed":
        earned = (progress.quizzesPassed || 0) >= condition.count;
        break;
      case "streak":
        earned = (progress.streak || 0) >= condition.count;
        break;
      default:
        break;
    }

    if (earned) {
      earnedBadges.add(badge.id);
      progress.badgeEarnedDates = progress.badgeEarnedDates || {};
      progress.badgeEarnedDates[badge.id] = new Date().toISOString();
      newBadges.push(badge);
      logger.info("Badge earned", { userId, badgeId: badge.id });
    }
  }

  progress.badges = Array.from(earnedBadges);
  return newBadges;
}
