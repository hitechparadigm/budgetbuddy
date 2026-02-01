/**
 * BudgetBuddy Educational Content Lambda Tests
 */

const { handler } = require("./index");
const { getUserFromEvent, dynamoHelpers } = require("/opt/nodejs/utils");
const { checkPermission } = require("/opt/nodejs/shared");

describe("Learn Lambda", () => {
  const mockContext = { awsRequestId: "test-request-id" };

  beforeEach(() => {
    jest.clearAllMocks();
    checkPermission.mockResolvedValue(true);
    getUserFromEvent.mockReturnValue({
      userId: "user-123",
      email: "test@example.com",
    });
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/learn/health",
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("learn");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/learn/courses",
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("GET /learn/courses", () => {
    it("should return all courses with progress", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: {
          "budgeting-101": { completedLessons: ["b101-l1", "b101-l2"] },
        },
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/courses",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.courses).toBeDefined();
      expect(body.data.courses.length).toBeGreaterThan(0);

      const budgetCourse = body.data.courses.find(
        (c) => c.id === "budgeting-101",
      );
      expect(budgetCourse.completedLessons).toBe(2);
    });
  });

  describe("GET /learn/courses/:courseId", () => {
    it("should return course with lessons", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: { "budgeting-101": { completedLessons: ["b101-l1"] } },
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/courses/budgeting-101",
        pathParameters: { courseId: "budgeting-101" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.id).toBe("budgeting-101");
      expect(body.data.lessons).toBeDefined();
      expect(body.data.lessons.length).toBe(4);
    });

    it("should return 404 for non-existent course", async () => {
      const event = {
        httpMethod: "GET",
        path: "/learn/courses/invalid-course",
        pathParameters: { courseId: "invalid-course" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /learn/lessons/:lessonId", () => {
    it("should return lesson details", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: { "budgeting-101": { completedLessons: [] } },
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/lessons/b101-l1",
        pathParameters: { lessonId: "b101-l1" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.id).toBe("b101-l1");
      expect(body.data.courseId).toBe("budgeting-101");
    });

    it("should return 404 for non-existent lesson", async () => {
      const event = {
        httpMethod: "GET",
        path: "/learn/lessons/invalid-lesson",
        pathParameters: { lessonId: "invalid-lesson" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /learn/lessons/:lessonId/complete", () => {
    it("should mark lesson as complete", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: { "budgeting-101": { completedLessons: [] } },
        badges: [],
        streak: 0,
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/learn/lessons/b101-l1/complete",
        pathParameters: { lessonId: "b101-l1" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.lessonId).toBe("b101-l1");
      expect(body.data.courseId).toBe("budgeting-101");
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should award first-lesson badge", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: {},
        badges: [],
        totalLessonsCompleted: 0,
        streak: 0,
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/learn/lessons/b101-l1/complete",
        pathParameters: { lessonId: "b101-l1" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.newBadges).toBeDefined();
      expect(body.data.newBadges.some((b) => b.id === "first-lesson")).toBe(
        true,
      );
    });
  });

  describe("POST /learn/quiz/:quizId/submit", () => {
    it("should grade quiz and return results", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: {
          "budgeting-101": {
            completedLessons: ["b101-l1", "b101-l2", "b101-l3", "b101-l4"],
          },
        },
        badges: [],
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/learn/quiz/b101-quiz/submit",
        pathParameters: { quizId: "b101-quiz" },
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ answers: [1, 1, 2] }), // All correct
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.passed).toBe(true);
      expect(body.data.score).toBe(100);
      expect(body.data.correctCount).toBe(3);
    });

    it("should fail quiz with wrong answers", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        courses: { "budgeting-101": { completedLessons: [] } },
        badges: [],
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/learn/quiz/b101-quiz/submit",
        pathParameters: { quizId: "b101-quiz" },
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ answers: [0, 0, 0] }), // All wrong
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.passed).toBe(false);
      expect(body.data.correctCount).toBe(0);
    });

    it("should return 400 if answers not provided", async () => {
      const event = {
        httpMethod: "POST",
        path: "/learn/quiz/b101-quiz/submit",
        pathParameters: { quizId: "b101-quiz" },
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({}),
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /learn/progress", () => {
    it("should return user progress", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        streak: 5,
        totalLessonsCompleted: 8,
        coursesCompleted: 2,
        quizzesPassed: 2,
        badges: ["first-lesson", "course-complete"],
        lastActivityDate: "2026-02-01",
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/progress",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.streak).toBe(5);
      expect(body.data.totalLessonsCompleted).toBe(8);
      expect(body.data.coursesCompleted).toBe(2);
      expect(body.data.badgesEarned).toBe(2);
    });
  });

  describe("GET /learn/badges", () => {
    it("should return all badges with earned status", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        badges: ["first-lesson", "streak-3"],
        badgeEarnedDates: {
          "first-lesson": "2026-01-15T00:00:00.000Z",
          "streak-3": "2026-01-18T00:00:00.000Z",
        },
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/badges",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.badges).toBeDefined();
      expect(body.data.earned).toBe(2);
      expect(body.data.total).toBeGreaterThan(0);

      const firstLessonBadge = body.data.badges.find(
        (b) => b.id === "first-lesson",
      );
      expect(firstLessonBadge.earned).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("should require authentication", async () => {
      getUserFromEvent.mockImplementation(() => {
        throw new Error("No user claims found");
      });

      const event = {
        httpMethod: "GET",
        path: "/learn/courses",
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(401);
    });

    it("should check permissions", async () => {
      checkPermission.mockResolvedValue(false);

      const event = {
        httpMethod: "GET",
        path: "/learn/courses",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Route Not Found", () => {
    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/learn/unknown",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);
    });
  });
});
