import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, numeric, pgEnum, index, uniqueIndex, jsonb, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["student", "tutor", "coordinator"]);
export const skillLevelEnum = pgEnum("skill_level", ["beginner", "intermediate", "advanced"]);
export const classStatusEnum = pgEnum("class_status", ["active", "completed", "cancelled"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled", "no-show"]);
export const notificationTypeEnum = pgEnum("notification_type", ["booking", "message", "reminder", "review", "system"]);
export const courseTypeEnum = pgEnum("course_type", ["on-demand", "live", "upcoming", "recorded"]);
export const reportTypeEnum = pgEnum("report_type", ["harassment", "inappropriate_content", "safety_concern", "other"]);
export const reportTargetEnum = pgEnum("report_target", ["user", "class", "message"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "investigating", "resolved", "dismissed"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("student"),
  avatar: text("avatar"),
  bio: text("bio"),
  orphanage: text("orphanage"),
  organization: text("organization"),
  skillsTaught: text("skills_taught").array(),
  skillsLearning: text("skills_learning").array(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("total_reviews").default(0),
  isVerified: boolean("is_verified").default(false),
  isBlocked: boolean("is_blocked").default(false),
  isPendingApproval: boolean("is_pending_approval").default(false),
  // Security fields (Phase 3)
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  tokenVersion: integer("token_version").default(1).notNull(),
  lastLoginIp: text("last_login_ip"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // #32: index on role for "get all tutors/students" queries
  usersRoleIdx: index("users_role_idx").on(table.role),
  // #33: indexes for admin dashboard blocked/pending queries
  usersIsBlockedIdx: index("users_is_blocked_idx").on(table.isBlocked),
  usersIsPendingApprovalIdx: index("users_is_pending_approval_idx").on(table.isPendingApproval),
  // #47: coordinator filtering by orphanage/organization
  usersOrphanageIdx: index("users_orphanage_idx").on(table.orphanage),
  usersOrganizationIdx: index("users_organization_idx").on(table.organization),
  // #39: rating must be 0–5
  usersRatingCheck: check("users_rating_check", sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
}));

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  skillLevel: skillLevelEnum("skill_level").notNull().default("beginner"),
  duration: integer("duration").notNull().default(60),
  maxStudents: integer("max_students").default(10),
  status: classStatusEnum("status").notNull().default("active"),
  courseType: courseTypeEnum("course_type").notNull().default("live"),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  recordingUrl: text("recording_url"),
  recordingAvailableUntil: timestamp("recording_available_until"),
  isRecordingAvailable: boolean("is_recording_available").default(false),
  totalLectures: integer("total_lectures").default(1),
  completedLectures: integer("completed_lectures").default(0),
  viewCount: integer("view_count").default(0),
  language: text("language").default("English"),
  isFree: boolean("is_free").default(true),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  scheduleType: text("schedule_type").default("one-time"),
  scheduleDate: timestamp("schedule_date"),
  scheduleTime: text("schedule_time"),
  recurringDays: text("recurring_days").array(),
  enrolledCount: integer("enrolled_count").default(0),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomMeetingUrl: text("zoom_meeting_url"),
  zoomHostUrl: text("zoom_host_url"),
  certificateCriteria: jsonb("certificate_criteria"), // #169: [{type: 'quiz_pass'|'attendance'|'assignment', threshold: number}]
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // #34: indexes for browse-classes category/courseType filtering
  classesCategoryIdx: index("classes_category_idx").on(table.category),
  classesCourseTypeIdx: index("classes_course_type_idx").on(table.courseType),
  // #48: createdAt index for time-based queries
  classesCreatedAtIdx: index("classes_created_at_idx").on(table.createdAt),
  // #41: enrolledCount cannot go negative
  classesEnrolledCountCheck: check("classes_enrolled_count_check", sql`${table.enrolledCount} >= 0`),
  // #42: price cannot be negative
  classesPriceCheck: check("classes_price_check", sql`${table.price} >= 0`),
}));

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"),
  duration: integer("duration").default(60),
  status: bookingStatusEnum("status").notNull().default("pending"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingsStudentIdIdx: index("bookings_student_id_idx").on(table.studentId),
  bookingsTutorIdIdx: index("bookings_tutor_id_idx").on(table.tutorId),
  bookingsClassIdIdx: index("bookings_class_id_idx").on(table.classId),
  // #35: index on status for pending/confirmed queries
  bookingsStatusIdx: index("bookings_status_idx").on(table.status),
  // Prevent duplicate active bookings for the same student+class
  bookingsStudentClassUniqueIdx: uniqueIndex("bookings_student_class_unique_idx")
    .on(table.studentId, table.classId)
    .where(sql`status NOT IN ('cancelled', 'no-show')`),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  conversationId: text("conversation_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  messagesSenderIdIdx: index("messages_sender_id_idx").on(table.senderId),
  messagesReceiverIdIdx: index("messages_receiver_id_idx").on(table.receiverId),
  messagesConversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
  // #36: compound index for conversation fetch (both directions)
  messagesSenderReceiverIdx: index("messages_sender_receiver_idx").on(table.senderId, table.receiverId),
}));

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  revieweeId: integer("reviewee_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  reviewsRevieweeIdIdx: index("reviews_reviewee_id_idx").on(table.revieweeId),
  reviewsClassIdIdx: index("reviews_class_id_idx").on(table.classId),
  // One review per reviewer per reviewee per class
  reviewsReviewerRevieweeClassUniqueIdx: uniqueIndex("reviews_reviewer_reviewee_class_idx").on(table.reviewerId, table.revieweeId, table.classId),
  // #38: rating must be 1–5
  reviewsRatingCheck: check("reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  notificationsUserIdIdx: index("notifications_user_id_idx").on(table.userId),
  notificationsUserIdIsReadIdx: index("notifications_user_id_is_read_idx").on(table.userId, table.isRead),
}));

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  favoritesUserIdIdx: index("favorites_user_id_idx").on(table.userId),
  // #31: prevent duplicate favorites for same (userId, classId)
  favoritesUserClassUniqueIdx: uniqueIndex("favorites_user_class_unique_idx").on(table.userId, table.classId),
}));

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  bookingReminders: boolean("booking_reminders").default(true),
  messageAlerts: boolean("message_alerts").default(true),
  reviewNotifications: boolean("review_notifications").default(true),
  marketingEmails: boolean("marketing_emails").default(false),
  messagingPreference: text("messaging_preference").default("everyone"),
  showProfilePublicly: boolean("show_profile_publicly").default(true),
  sessionTimeout: integer("session_timeout").default(30),
  theme: text("theme").default("light"),
  language: text("language").default("English"),
  timezone: text("timezone").default("UTC"),
  autoplayVideos: boolean("autoplay_videos").default(true),
  learningGoals: text("learning_goals"),
  preferredSubjects: text("preferred_subjects").array(),
  studyReminders: boolean("study_reminders").default(true),
  teachingPreferences: text("teaching_preferences"),
  availabilitySchedule: jsonb("availability_schedule"),
  platformAlerts: boolean("platform_alerts").default(true),
  weeklyGoal: integer("weekly_goal").default(2),
  recentlyViewedClasses: jsonb("recently_viewed_classes").$type<number[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseProgress = pgTable("course_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  lectureNumber: integer("lecture_number").notNull().default(1),
  completed: boolean("completed").default(false),
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
  watchTimeSeconds: integer("watch_time_seconds").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  courseProgressUserIdClassIdIdx: index("course_progress_user_id_class_id_idx").on(table.userId, table.classId),
  courseProgressUniqueIdx: uniqueIndex("course_progress_unique_idx").on(table.userId, table.classId, table.lectureNumber),
}));

export const safeguardingReports = pgTable("safeguarding_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id),
  reportType: reportTypeEnum("report_type").notNull(),
  targetType: reportTargetEnum("target_type").notNull(),
  targetId: integer("target_id"),
  description: text("description").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // #37: index on status for admin reports tab
  safeguardingStatusIdx: index("safeguarding_status_idx").on(table.status),
}));

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  videoUrl: text("video_url"),
  duration: integer("duration").default(30),
  difficulty: text("difficulty").default("beginner"),
  sections: jsonb("sections"),
  attachments: jsonb("attachments"), // #166: [{name, url, mimeType}]
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  lessonsClassIdIdx: index("lessons_class_id_idx").on(table.classId),
}));

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id),
  tutorId: integer("tutor_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  timeLimit: integer("time_limit"),
  passingScore: integer("passing_score").default(70),
  maxAttempts: integer("max_attempts"),  // null = unlimited retakes
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  quizzesClassIdIdx: index("quizzes_class_id_idx").on(table.classId),
  // #40: passingScore must be 0–100
  quizzesPassingScoreCheck: check("quizzes_passing_score_check", sql`${table.passingScore} >= 0 AND ${table.passingScore} <= 100`),
}));

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id),
  score: integer("score"),
  answers: text("answers"),
  passed: boolean("passed").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => ({
  quizResultsQuizIdIdx: index("quiz_results_quiz_id_idx").on(table.quizId),
  quizResultsQuizIdStudentIdIdx: index("quiz_results_quiz_id_student_id_idx").on(table.quizId, table.studentId),
}));

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id),
  tutorId: integer("tutor_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  dueDate: timestamp("due_date"),
  maxScore: integer("max_score").default(100),
  allowLateSubmission: boolean("allow_late_submission").default(true),
  rubric: jsonb("rubric"), // #173: [{criterion, maxPoints, description}]
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  assignmentsClassIdIdx: index("assignments_class_id_idx").on(table.classId),
  // #43: maxScore must be > 0
  assignmentsMaxScoreCheck: check("assignments_max_score_check", sql`${table.maxScore} > 0`),
}));

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id),
  content: text("content"),
  fileUrl: text("file_url"),
  grade: integer("grade"),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => ({
  assignmentSubmissionsAssignmentIdIdx: index("assignment_submissions_assignment_id_idx").on(table.assignmentId),
  assignmentSubmissionsStudentIdIdx: index("assignment_submissions_student_id_idx").on(table.studentId),
  assignmentSubmissionsUniqueIdx: uniqueIndex("assignment_submissions_unique_idx").on(table.assignmentId, table.studentId),
}));

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classId: integer("class_id").references(() => classes.id),
  topic: text("topic"),
  content: text("content").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  notesUserIdIdx: index("notes_user_id_idx").on(table.userId),
}));

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  classId: integer("class_id").references(() => classes.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  studentName: text("student_name").notNull(),
  courseName: text("course_name").notNull(),
  tutorName: text("tutor_name"),
  verificationCode: text("verification_code").notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow(),
}, (table) => ({
  certificatesStudentIdIdx: index("certificates_student_id_idx").on(table.studentId),
  certificatesStudentClassUniqueIdx: uniqueIndex("certificates_student_class_idx").on(table.studentId, table.classId),
}));

export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  replyCount: integer("reply_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  discussionsClassIdIdx: index("discussions_class_id_idx").on(table.classId),
}));

export const discussionReplies = pgTable("discussion_replies", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id").notNull().references(() => discussions.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  discussionRepliesDiscussionIdIdx: index("discussion_replies_discussion_id_idx").on(table.discussionId),
}));

// ── Login history (Phase 3 security hardening) ────────────────────────────────
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  loginHistoryUserIdIdx: index("login_history_user_id_idx").on(table.userId),
}));

export type LoginHistory = typeof loginHistory.$inferSelect;

// ── Auth tokens (DB-persisted, survive server restarts) ───────────────────────
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // #45: compound unique index on (userId, token)
  emailTokenUserTokenIdx: uniqueIndex("email_token_user_token_idx").on(table.userId, table.token),
}));

// #174: Class waitlist — students join when class is at maxStudents
export const classWaitlist = pgTable("class_waitlist", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  notified: boolean("notified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  classWaitlistClassIdx: index("class_waitlist_class_idx").on(table.classId),
  classWaitlistUnique: uniqueIndex("class_waitlist_unique_idx").on(table.classId, table.studentId),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // #46: index on userId for finding/revoking tokens by user
  passwordResetUserIdIdx: index("password_reset_user_id_idx").on(table.userId),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  totalReviews: true,
  isVerified: true,
  isBlocked: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  enrolledCount: true,
  viewCount: true,
  completedLectures: true,
  isRecordingAvailable: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  reminderSent: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
});

export const insertCourseProgressSchema = createInsertSchema(courseProgress).omit({
  id: true,
  createdAt: true,
});

export const insertSafeguardingReportSchema = createInsertSchema(safeguardingReports).omit({
  id: true,
  status: true,
  resolvedBy: true,
  resolvedAt: true,
  createdAt: true,
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  duration: z.number().int().min(1).max(480).optional(),
  classId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  questions: z.union([
    z.string().min(1),
    z.array(z.object({
      question: z.string().min(1),
      options: z.array(z.string()).min(2),
      correctAnswer: z.number().int().min(0),
    })).min(1, "At least one question required"),
  ]),
  passingScore: z.number().int().min(0).max(100).optional(),
  classId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  maxScore: z.number().int().min(1).max(1000).optional(),
  classId: z.number().int().positive().optional().nullable(),
  tutorId: z.number().int().positive(),
  dueDate: z.union([z.date(), z.string().transform(s => s ? new Date(s) : null), z.null()]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "tutor", "coordinator"]),
  orphanage: z.string().optional(),
  organization: z.string().optional(),
  bio: z.string().optional(),
  skillsTaught: z.array(z.string()).optional(),
  skillsLearning: z.array(z.string()).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertCourseProgress = z.infer<typeof insertCourseProgressSchema>;
export type CourseProgress = typeof courseProgress.$inferSelect;
export type InsertSafeguardingReport = z.infer<typeof insertSafeguardingReportSchema>;
export type SafeguardingReport = typeof safeguardingReports.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type QuizResult = typeof quizResults.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type Discussion = typeof discussions.$inferSelect;
export type DiscussionReply = typeof discussionReplies.$inferSelect;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;

export const insertClassWaitlistSchema = createInsertSchema(classWaitlist).omit({
  id: true,
  notified: true,
  createdAt: true,
});

// ── PEER HELP BOARD ────────────────────────────────────────────────────────────

export const peerHelpRequestStatusEnum = pgEnum("peer_help_request_status", [
  "open", "matched", "resolved", "cancelled"
]);

// Students who volunteer to help peers on a topic (after scoring >80% on a quiz)
export const peerHelpers = pgTable("peer_helpers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  quizScore: integer("quiz_score"),          // score that qualified them (0–100)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  peerHelpersUserIdx: index("peer_helpers_user_idx").on(table.userId),
  peerHelpersClassIdx: index("peer_helpers_class_idx").on(table.classId),
  peerHelpersUnique: uniqueIndex("peer_helpers_unique_idx").on(table.userId, table.classId, table.topic),
}));

// Help requests posted by students
export const peerHelpRequests = pgTable("peer_help_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  status: peerHelpRequestStatusEnum("status").notNull().default("open"),
  helperId: integer("helper_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  peerHelpRequestsStudentIdx: index("peer_help_requests_student_idx").on(table.studentId),
  peerHelpRequestsClassIdx: index("peer_help_requests_class_idx").on(table.classId),
  peerHelpRequestsStatusIdx: index("peer_help_requests_status_idx").on(table.status),
}));

export const insertPeerHelperSchema = createInsertSchema(peerHelpers).omit({
  id: true,
  createdAt: true,
});

export const insertPeerHelpRequestSchema = createInsertSchema(peerHelpRequests).omit({
  id: true,
  status: true,
  helperId: true,
  createdAt: true,
}).extend({
  topic: z.string().min(1).max(200),
  description: z.string().min(10).max(1000),
  classId: z.number().int().positive(),
});

export type PeerHelper = typeof peerHelpers.$inferSelect;
export type InsertPeerHelper = z.infer<typeof insertPeerHelperSchema>;
export type PeerHelpRequest = typeof peerHelpRequests.$inferSelect;
export type InsertPeerHelpRequest = z.infer<typeof insertPeerHelpRequestSchema>;

// ── PEER SESSIONS (coordinator-approved bookings between students) ─────────────

export const peerSessionStatusEnum = pgEnum("peer_session_status", [
  "pending_approval", "approved", "rejected", "completed", "cancelled"
]);

export const peerSessions = pgTable("peer_sessions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => peerHelpRequests.id, { onDelete: "cascade" }),
  requesterId: integer("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  helperId: integer("helper_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  proposedDate: text("proposed_date"),
  proposedTime: text("proposed_time"),
  status: peerSessionStatusEnum("status").notNull().default("pending_approval"),
  coordinatorNotes: text("coordinator_notes"),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  peerSessionsRequesterIdx: index("peer_sessions_requester_idx").on(table.requesterId),
  peerSessionsHelperIdx: index("peer_sessions_helper_idx").on(table.helperId),
  peerSessionsStatusIdx: index("peer_sessions_status_idx").on(table.status),
}));

export type PeerSession = typeof peerSessions.$inferSelect;
