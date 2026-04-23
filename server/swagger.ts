import type { Express } from "express";

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "TutorBridge API",
    version: "1.0.0",
    description:
      "REST API for TutorBridge — a peer-to-peer tutoring platform connecting orphanage students with volunteer tutors.",
    contact: { name: "TutorBridge Team" },
  },
  servers: [{ url: "/", description: "Current server" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "boolean" },
          message: { type: "string" },
          code: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["student", "tutor", "coordinator"] },
          avatar: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          isVerified: { type: "boolean" },
          isBlocked: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Class: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          skillLevel: { type: "string" },
          maxStudents: { type: "integer" },
          enrolledCount: { type: "integer" },
          status: { type: "string" },
          tutorId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "integer" },
          studentId: { type: "integer" },
          tutorId: { type: "integer" },
          classId: { type: "integer" },
          scheduledDate: { type: "string", format: "date" },
          scheduledTime: { type: "string" },
          status: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          title: { type: "string" },
          message: { type: "string" },
          type: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "integer" },
          classId: { type: "integer" },
          userId: { type: "integer" },
          rating: { type: "integer" },
          comment: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "Health check" },
    { name: "Auth", description: "Authentication & account management" },
    { name: "Users", description: "User profiles" },
    { name: "Classes", description: "Class CRUD & enrollment" },
    { name: "Bookings", description: "Session bookings" },
    { name: "Messages", description: "Direct messaging" },
    { name: "Reviews", description: "Class & tutor reviews" },
    { name: "Notifications", description: "User notifications" },
    { name: "Favorites", description: "Favorited classes" },
    { name: "Progress", description: "Course progress tracking" },
    { name: "Quizzes", description: "Quizzes & quiz results" },
    { name: "Assignments", description: "Assignments & submissions" },
    { name: "Lessons", description: "Lesson management" },
    { name: "Certificates", description: "Course certificates" },
    { name: "Discussions", description: "Class discussion threads" },
    { name: "Peer Help", description: "Peer help board & sessions" },
    { name: "Admin", description: "Coordinator/admin endpoints" },
    { name: "AI", description: "AI-powered features" },
    { name: "Live Class", description: "Zoom live class integration" },
    { name: "Settings", description: "User settings" },
    { name: "Reports", description: "Safeguarding reports" },
    { name: "Contact", description: "Contact forms" },
    { name: "Upload", description: "File uploads" },
    { name: "Export", description: "CSV data export" },
  ],
  paths: {
    // ── Health ────────────────────────────────────────────────
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/public/stats": {
      get: {
        tags: ["Health"],
        summary: "Public platform statistics",
        responses: {
          200: {
            description: "Student, tutor & class counts",
            content: { "application/json": { schema: { type: "object", properties: { students: { type: "integer" }, tutors: { type: "integer" }, classes: { type: "integer" } } } } },
          },
        },
      },
    },

    // ── Auth ──────────────────────────────────────────────────
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["name", "email", "password", "role"], properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" }, role: { type: "string", enum: ["student", "tutor"] }, orphanage: { type: "string" }, organization: { type: "string" }, bio: { type: "string" } } } } },
        },
        responses: { 201: { description: "Account created" }, 400: { description: "Validation error" }, 409: { description: "Email already registered" } },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email & password",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } },
        },
        responses: { 200: { description: "JWT token + user object" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "User object" }, 401: { description: "Not authenticated" } },
      },
    },
    "/api/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: { type: "string" }, newPassword: { type: "string" } } } } } },
        responses: { 200: { description: "Password changed" }, 400: { description: "Current password incorrect" } },
      },
    },
    "/api/auth/verify-email": {
      get: {
        tags: ["Auth"],
        summary: "Verify email address with token",
        parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Email verified" }, 400: { description: "Invalid/expired token" } },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string" } } } } } },
        responses: { 200: { description: "Reset email sent (if account exists)" } },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using token",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["token", "newPassword"], properties: { token: { type: "string" }, newPassword: { type: "string" } } } } } },
        responses: { 200: { description: "Password reset" }, 400: { description: "Invalid/expired token" } },
      },
    },
    "/api/auth/resend-verification": {
      post: {
        tags: ["Auth"],
        summary: "Resend email verification link",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string" } } } } } },
        responses: { 200: { description: "Verification email resent" } },
      },
    },

    // ── Users ─────────────────────────────────────────────────
    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user profile by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "User profile" }, 404: { description: "Not found" } },
      },
    },
    "/api/users/{id}/avatar": {
      post: {
        tags: ["Users"],
        summary: "Upload user avatar",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { avatar: { type: "string", format: "binary" } } } } } },
        responses: { 200: { description: "Avatar updated" } },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Users"],
        summary: "Dashboard statistics for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Role-specific dashboard stats" } },
      },
    },
    "/api/dashboard/activity": {
      get: {
        tags: ["Users"],
        summary: "Recent platform activity feed",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 10 } }],
        responses: { 200: { description: "Activity items" } },
      },
    },
    "/api/students/me/deadlines": {
      get: {
        tags: ["Users"],
        summary: "Upcoming assignment/quiz deadlines for the current student",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Deadline list" } },
      },
    },
    "/api/students/me/tutors": {
      get: {
        tags: ["Users"],
        summary: "Tutors associated with the current student's enrolled classes",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Tutor list" } },
      },
    },
    "/api/leaderboard": {
      get: {
        tags: ["Users"],
        summary: "Student leaderboard",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Ranked student list" } },
      },
    },

    // ── Classes ───────────────────────────────────────────────
    "/api/classes": {
      get: {
        tags: ["Classes"],
        summary: "List all published classes",
        responses: { 200: { description: "Array of classes" } },
      },
      post: {
        tags: ["Classes"],
        summary: "Create a new class (tutor only)",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "description", "category", "skillLevel"], properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, skillLevel: { type: "string" }, maxStudents: { type: "integer" }, schedule: { type: "string" } } } } } },
        responses: { 201: { description: "Class created" }, 403: { description: "Not a tutor" } },
      },
    },
    "/api/classes/{id}": {
      get: {
        tags: ["Classes"],
        summary: "Get class detail by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Class detail with lessons, quizzes, etc." }, 404: { description: "Not found" } },
      },
      patch: {
        tags: ["Classes"],
        summary: "Update a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Class updated" } },
      },
    },
    "/api/classes/my/enrolled": {
      get: {
        tags: ["Classes"],
        summary: "Classes the current student is enrolled in",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Enrolled class list" } },
      },
    },
    "/api/classes/recommended": {
      get: {
        tags: ["Classes"],
        summary: "Recommended classes for the current student",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Array of recommended classes" } },
      },
    },
    "/api/classes/{id}/enroll": {
      post: {
        tags: ["Classes"],
        summary: "Enroll in a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Enrolled" }, 400: { description: "Already enrolled or class full" } },
      },
    },
    "/api/classes/{id}/unenroll": {
      delete: {
        tags: ["Classes"],
        summary: "Unenroll from a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Unenrolled" } },
      },
    },

    // ── Bookings ──────────────────────────────────────────────
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List bookings for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Booking list" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a new booking/session",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["classId", "scheduledDate"], properties: { classId: { type: "integer" }, scheduledDate: { type: "string" }, scheduledTime: { type: "string" }, notes: { type: "string" } } } } } },
        responses: { 201: { description: "Booking created" } },
      },
    },
    "/api/bookings/{id}/cancel": {
      patch: {
        tags: ["Bookings"],
        summary: "Cancel a booking",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Booking cancelled" } },
      },
    },
    "/api/bookings/{id}/status": {
      patch: {
        tags: ["Bookings"],
        summary: "Update booking status (tutor/coordinator)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["confirmed", "completed", "cancelled", "no-show"] } } } } } },
        responses: { 200: { description: "Status updated" } },
      },
    },

    // ── Messages ──────────────────────────────────────────────
    "/api/messages/conversations": {
      get: {
        tags: ["Messages"],
        summary: "List message conversations",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Conversation list" } },
      },
    },
    "/api/messages/{otherUserId}": {
      get: {
        tags: ["Messages"],
        summary: "Get messages with a specific user",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "otherUserId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Message list" } },
      },
    },
    "/api/messages": {
      post: {
        tags: ["Messages"],
        summary: "Send a direct message",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["receiverId", "content"], properties: { receiverId: { type: "integer" }, content: { type: "string" } } } } } },
        responses: { 201: { description: "Message sent" } },
      },
    },

    // ── Reviews ───────────────────────────────────────────────
    "/api/reviews/class/{classId}": {
      get: {
        tags: ["Reviews"],
        summary: "Reviews for a class",
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Review list" } },
      },
    },
    "/api/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Submit a review",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["classId", "rating"], properties: { classId: { type: "integer" }, rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string" } } } } } },
        responses: { 201: { description: "Review submitted" } },
      },
    },

    // ── Notifications ─────────────────────────────────────────
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Notification list" } },
      },
    },
    "/api/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Unread notification count",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Count object" } },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "All marked read" } },
      },
    },

    // ── Favorites ─────────────────────────────────────────────
    "/api/favorites": {
      get: {
        tags: ["Favorites"],
        summary: "List favorited classes",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Favorite class list" } },
      },
      post: {
        tags: ["Favorites"],
        summary: "Add a class to favorites",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["classId"], properties: { classId: { type: "integer" } } } } } },
        responses: { 201: { description: "Added" } },
      },
    },
    "/api/favorites/{classId}": {
      delete: {
        tags: ["Favorites"],
        summary: "Remove a class from favorites",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Removed" } },
      },
    },

    // ── Progress ──────────────────────────────────────────────
    "/api/progress": {
      get: {
        tags: ["Progress"],
        summary: "Get progress for all enrolled classes",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Progress list" } },
      },
      post: {
        tags: ["Progress"],
        summary: "Update course progress (mark lesson completed, etc.)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Progress updated" } },
      },
    },

    // ── Settings ──────────────────────────────────────────────
    "/api/settings": {
      get: {
        tags: ["Settings"],
        summary: "Get user settings",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Settings object" } },
      },
      put: {
        tags: ["Settings"],
        summary: "Update user settings",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Settings updated" } },
      },
    },

    // ── Quizzes ───────────────────────────────────────────────
    "/api/quizzes/{classId}": {
      get: {
        tags: ["Quizzes"],
        summary: "List quizzes for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Quiz list" } },
      },
    },
    "/api/quizzes": {
      post: {
        tags: ["Quizzes"],
        summary: "Create a quiz (tutor only)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Quiz created" } },
      },
    },
    "/api/quiz-results": {
      post: {
        tags: ["Quizzes"],
        summary: "Submit quiz answers",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Result saved" } },
      },
    },
    "/api/quiz-results/my": {
      get: {
        tags: ["Quizzes"],
        summary: "Get quiz results for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Quiz result list" } },
      },
    },

    // ── Assignments ───────────────────────────────────────────
    "/api/assignments/{classId}": {
      get: {
        tags: ["Assignments"],
        summary: "List assignments for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Assignment list" } },
      },
    },
    "/api/assignments": {
      post: {
        tags: ["Assignments"],
        summary: "Create an assignment (tutor only)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Assignment created" } },
      },
    },
    "/api/assignment-submissions": {
      post: {
        tags: ["Assignments"],
        summary: "Submit an assignment",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Submission saved" } },
      },
    },
    "/api/assignment-submissions/my": {
      get: {
        tags: ["Assignments"],
        summary: "Get submissions for the current student",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Submission list" } },
      },
    },

    // ── Lessons ───────────────────────────────────────────────
    "/api/lessons/{classId}": {
      get: {
        tags: ["Lessons"],
        summary: "List lessons for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Lesson list" } },
      },
    },
    "/api/lessons": {
      post: {
        tags: ["Lessons"],
        summary: "Create a lesson (tutor only)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Lesson created" } },
      },
    },

    // ── Certificates ──────────────────────────────────────────
    "/api/certificates": {
      post: {
        tags: ["Certificates"],
        summary: "Issue a certificate",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Certificate issued" } },
      },
    },
    "/api/certificates/my": {
      get: {
        tags: ["Certificates"],
        summary: "Get certificates for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Certificate list" } },
      },
    },
    "/api/certificates/verify/{code}": {
      get: {
        tags: ["Certificates"],
        summary: "Verify a certificate by code",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Certificate details" }, 404: { description: "Not found" } },
      },
    },

    // ── Discussions ───────────────────────────────────────────
    "/api/classes/{classId}/discussions": {
      get: {
        tags: ["Discussions"],
        summary: "List discussion threads for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Discussion list" } },
      },
      post: {
        tags: ["Discussions"],
        summary: "Start a new discussion thread",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 201: { description: "Thread created" } },
      },
    },
    "/api/discussions/{id}/replies": {
      get: {
        tags: ["Discussions"],
        summary: "Get replies for a discussion",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Reply list" } },
      },
      post: {
        tags: ["Discussions"],
        summary: "Reply to a discussion",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 201: { description: "Reply added" } },
      },
    },

    // ── Peer Help ─────────────────────────────────────────────
    "/api/peer-helpers": {
      get: {
        tags: ["Peer Help"],
        summary: "List peer helpers for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Helper list" } },
      },
      post: {
        tags: ["Peer Help"],
        summary: "Register as a peer helper",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Registered" } },
      },
    },
    "/api/peer-help-requests": {
      get: {
        tags: ["Peer Help"],
        summary: "List peer help requests",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Request list" } },
      },
      post: {
        tags: ["Peer Help"],
        summary: "Create a peer help request",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Request created" } },
      },
    },
    "/api/peer-sessions": {
      post: {
        tags: ["Peer Help"],
        summary: "Schedule a peer tutoring session",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Session created" } },
      },
    },
    "/api/peer-sessions/mine": {
      get: {
        tags: ["Peer Help"],
        summary: "Get peer sessions for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Session list" } },
      },
    },

    // ── Reports ───────────────────────────────────────────────
    "/api/report": {
      post: {
        tags: ["Reports"],
        summary: "Submit a safeguarding report",
        responses: { 201: { description: "Report submitted" } },
      },
    },
    "/api/contact": {
      post: {
        tags: ["Contact"],
        summary: "Submit the public contact form",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "subject", "message"], properties: { name: { type: "string" }, email: { type: "string" }, subject: { type: "string" }, message: { type: "string" } } } } } },
        responses: { 201: { description: "Submitted" } },
      },
    },
    "/api/contact-admin": {
      post: {
        tags: ["Contact"],
        summary: "Contact the admin (authenticated users)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Message sent" } },
      },
    },

    // ── Upload ────────────────────────────────────────────────
    "/api/upload/assignment": {
      post: {
        tags: ["Upload"],
        summary: "Upload an assignment file",
        security: [{ BearerAuth: [] }],
        requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
        responses: { 200: { description: "File URL returned" } },
      },
    },

    // ── Admin ─────────────────────────────────────────────────
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List all users (coordinator only)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Full user list with stats" } },
      },
    },
    "/api/admin/users/{id}/verify": {
      patch: {
        tags: ["Admin"],
        summary: "Toggle user verification",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Updated" } },
      },
    },
    "/api/admin/users/{id}/block": {
      patch: {
        tags: ["Admin"],
        summary: "Toggle user block status",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Updated" } },
      },
    },
    "/api/admin/users/{id}/approve": {
      patch: {
        tags: ["Admin"],
        summary: "Approve a pending tutor application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Approved" } },
      },
    },
    "/api/admin/users/{id}/reject": {
      patch: {
        tags: ["Admin"],
        summary: "Reject a pending tutor application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Rejected" } },
      },
    },
    "/api/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Change a user's role",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["role"], properties: { role: { type: "string", enum: ["student", "tutor", "coordinator"] } } } } } },
        responses: { 200: { description: "Role changed" } },
      },
    },
    "/api/admin/users/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a user account",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/admin/classes": {
      get: {
        tags: ["Admin"],
        summary: "List all classes with admin details",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Class list" } },
      },
    },
    "/api/admin/classes/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/admin/reports": {
      get: {
        tags: ["Admin"],
        summary: "List safeguarding reports",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Report list" } },
      },
    },
    "/api/admin/reports/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update report status",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Updated" } },
      },
    },
    "/api/admin/bookings": {
      get: {
        tags: ["Admin"],
        summary: "List all bookings",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Booking list" } },
      },
    },
    "/api/admin/quizzes": {
      get: {
        tags: ["Admin"],
        summary: "List all quizzes",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Quiz list" } },
      },
    },
    "/api/admin/notifications": {
      get: {
        tags: ["Admin"],
        summary: "List platform notifications (admin view)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Notification list" } },
      },
    },
    "/api/admin/contact-submissions": {
      get: {
        tags: ["Admin"],
        summary: "List contact form submissions",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Submission list" } },
      },
    },
    "/api/admin/notify": {
      post: {
        tags: ["Admin"],
        summary: "Send a platform notification to users",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Notifications sent" } },
      },
    },

    // ── Export ─────────────────────────────────────────────────
    "/api/admin/export/{type}": {
      get: {
        tags: ["Export"],
        summary: "Export admin data as CSV",
        description: "Valid types: users, students, teachers, classes, bookings, reports, quizzes, contact-submissions",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "type", in: "path", required: true, schema: { type: "string", enum: ["users", "students", "teachers", "classes", "bookings", "reports", "quizzes", "contact-submissions"] } }],
        responses: {
          200: { description: "CSV file download", content: { "text/csv": { schema: { type: "string" } } } },
          400: { description: "Invalid export type" },
        },
      },
    },

    // ── Live Class ────────────────────────────────────────────
    "/api/live-class/{classId}/zoom": {
      get: {
        tags: ["Live Class"],
        summary: "Get Zoom meeting details for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Zoom meeting info" } },
      },
      post: {
        tags: ["Live Class"],
        summary: "Create a Zoom meeting for a class",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 201: { description: "Meeting created" } },
      },
      delete: {
        tags: ["Live Class"],
        summary: "Delete a Zoom meeting",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "classId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Meeting deleted" } },
      },
    },

    // ── AI ────────────────────────────────────────────────────
    "/api/ai/study-buddy": {
      post: {
        tags: ["AI"],
        summary: "AI Study Buddy — ask a study question",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["message"], properties: { message: { type: "string" }, classId: { type: "integer" } } } } } },
        responses: { 200: { description: "AI response" } },
      },
    },
    "/api/ai/lesson-plan": {
      post: {
        tags: ["AI"],
        summary: "AI Lesson Planner — generate a lesson plan",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Generated plan" } },
      },
    },
    "/api/ai/skill-gap": {
      post: {
        tags: ["AI"],
        summary: "AI Skill Gap Detector",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Skill gap analysis" } },
      },
    },
    "/api/ai/auto-summary": {
      post: {
        tags: ["AI"],
        summary: "AI Auto-Summary for lesson content",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Generated summary" } },
      },
    },
  },
};

export function registerSwagger(app: Express) {
  // Serve the OpenAPI JSON spec
  app.get("/api/docs/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  // Serve Swagger UI via CDN (no extra npm packages required)
  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TutorBridge API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`);
  });
}
