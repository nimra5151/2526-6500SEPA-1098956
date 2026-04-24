import { db } from "./db";
import { eq, and, or, ilike, desc, asc, sql, ne, gte, lte, inArray, count, isNull } from "drizzle-orm";
import {
  users, classes, bookings, messages, reviews, notifications, favorites, userSettings, courseProgress,
  safeguardingReports, contactSubmissions, lessons, notes, discussions, discussionReplies, loginHistory,
  quizzes, quizResults, assignments, assignmentSubmissions, certificates,
  peerHelpers, peerHelpRequests, peerSessions,
  type InsertUser, type User,
  type InsertClass, type Class,
  type InsertBooking, type Booking,
  type InsertMessage, type Message,
  type InsertReview, type Review,
  type InsertNotification, type Notification,
  type InsertFavorite, type Favorite,
  type InsertUserSettings, type UserSettings,
  type InsertCourseProgress, type CourseProgress,
  type InsertSafeguardingReport, type SafeguardingReport,
  type InsertContactSubmission, type ContactSubmission,
} from "@shared/schema";

export interface ClassFilters {
  search?: string;
  category?: string;
  level?: string;
  courseType?: string;
  sort?: string;
  minDuration?: number;
  maxDuration?: number;
  minRating?: number;
  language?: string;
  isFree?: string;
  orphanage?: string;
  limit?: number;
}

export interface IStorage {
  // ── User Management ──────────────────────────────────────────────────────────

  /** Retrieve a user by primary key. Excludes soft-deleted users. */
  getUser(id: number): Promise<User | undefined>;
  /** Retrieve a user by email address. Excludes soft-deleted users. */
  getUserByEmail(email: string): Promise<User | undefined>;
  /** Create a new user record and return the created row. */
  createUser(user: InsertUser): Promise<User>;
  /** Partially update a user record by id. Returns the updated row. */
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  /** Return all non-deleted users. */
  getAllUsers(): Promise<User[]>;
  /** Count all non-deleted users. */
  getUserCount(): Promise<number>;
  /** Count all non-deleted tutors. */
  getTutorCount(): Promise<number>;
  /** Count all non-deleted students. */
  getStudentCount(): Promise<number>;

  // ── Class Management ─────────────────────────────────────────────────────────

  /** Retrieve active classes with optional search, category, level, and sort filters. Joins tutor info. */
  getClasses(filters?: ClassFilters): Promise<any[]>;
  /** Get a single class by id with full tutor profile attached. */
  getClass(id: number): Promise<any>;
  /** Get all classes owned by a specific tutor, ordered newest first. */
  getClassesByTutor(tutorId: number): Promise<any[]>;
  /** Get raw class rows for a user (tutor), ordered newest first. */
  getClassesByUser(userId: number): Promise<Class[]>;
  /** Get classes a student is enrolled in (via non-cancelled bookings). Joins tutor + booking info. */
  getEnrolledClasses(userId: number): Promise<any[]>;
  /** Create a new class and return the created row. */
  createClass(cls: InsertClass): Promise<Class>;
  /** Partially update a class by id. Returns the updated row. */
  updateClass(id: number, data: Partial<Class>): Promise<Class | undefined>;
  /** Count all active classes. */
  getClassCount(): Promise<number>;
  /** Get the top N classes sorted by enrolled count. Default limit = 5. */
  getPopularClasses(limit?: number): Promise<any[]>;

  // ── Booking Management ───────────────────────────────────────────────────────

  /** Get bookings for a user (as student or tutor). Batch-fetches user names to avoid N+1. */
  getBookings(userId: number): Promise<any[]>;
  /** Get a single booking by id. */
  getBooking(id: number): Promise<Booking | undefined>;
  /** Get all bookings across the platform (coordinator view). */
  getAllBookings(): Promise<any[]>;
  /** Create a booking. Note: enrolledCount is handled by the route transaction, not here. */
  createBooking(booking: InsertBooking): Promise<Booking>;
  /** Update a booking. Auto-decrements enrolledCount on cancel/no-show. */
  updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined>;
  /** Count all bookings. */
  getBookingCount(): Promise<number>;

  // ── Messaging ────────────────────────────────────────────────────────────────

  /** Get conversation list for a user, with last message, unread counts, and other user info. */
  getConversations(userId: number): Promise<any[]>;
  /** Get message history between two users. Marks received messages as read. */
  getMessagesBetween(userId: number, otherUserId: number): Promise<Message[]>;
  /** Send a new message. */
  createMessage(msg: InsertMessage): Promise<Message>;

  // ── Reviews ──────────────────────────────────────────────────────────────────

  /** Get all reviews for a class, with reviewer name and avatar. */
  getReviewsByClass(classId: number): Promise<any[]>;
  /** Get all reviews received by a user (tutor), with reviewer info and class title. */
  getReviewsByUser(userId: number): Promise<any[]>;
  /** Create a review inside a transaction that also recalculates the tutor's average rating. */
  createReview(review: InsertReview): Promise<Review>;

  // ── Notifications ────────────────────────────────────────────────────────────

  /** Get the latest notifications for a user. Default limit = 10. */
  getNotifications(userId: number, limit?: number): Promise<Notification[]>;
  /** Create a notification for a user. */
  createNotification(notification: InsertNotification): Promise<Notification>;
  /** Mark a single notification as read. */
  markNotificationRead(id: number): Promise<void>;

  // ── Favorites ────────────────────────────────────────────────────────────────

  /** Get a user's favorited classes with class + tutor info. */
  getFavorites(userId: number): Promise<any[]>;
  /** Add a class to a user's favorites. */
  addFavorite(fav: InsertFavorite): Promise<Favorite>;
  /** Remove a class from a user's favorites. */
  removeFavorite(userId: number, classId: number): Promise<void>;
  /** Check if a user has favorited a specific class. */
  isFavorite(userId: number, classId: number): Promise<boolean>;

  // ── User Settings ────────────────────────────────────────────────────────────

  /** Get a user's settings row (may be undefined for new users). */
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  /** Insert or update user settings (upsert pattern). */
  upsertUserSettings(userId: number, data: Partial<InsertUserSettings>): Promise<UserSettings>;

  // ── Course Progress ──────────────────────────────────────────────────────────

  /** Get lecture-level progress for a user in a specific class. */
  getCourseProgress(userId: number, classId: number): Promise<CourseProgress[]>;
  /** Upsert a course progress row (on conflict: update watch time). */
  upsertCourseProgress(data: InsertCourseProgress): Promise<CourseProgress>;
  /** Get all course progress for a user with class metadata (title, thumbnail, totalLectures). */
  getUserCourseProgress(userId: number): Promise<any[]>;

  // ── Dashboard Analytics ──────────────────────────────────────────────────────

  /** Get role-specific dashboard stats (delegates to coordinator/tutor/student logic). */
  getDashboardStats(userId: number, role: string): Promise<any>;
  /** Get full platform analytics for the coordinator dashboard. */
  getCoordinatorStats(): Promise<any>;
  /** Get recent platform activity (bookings, reviews, signups, class creations). */
  getRecentActivity(limit?: number): Promise<any[]>;

  // ── Safeguarding ─────────────────────────────────────────────────────────────

  /** Create a new safeguarding report. */
  createSafeguardingReport(report: InsertSafeguardingReport): Promise<SafeguardingReport>;
  /** Get all safeguarding reports, newest first. */
  getSafeguardingReports(): Promise<SafeguardingReport[]>;
  /** Update a report's status, optionally recording who resolved it and admin notes. */
  updateReportStatus(id: number, status: string, resolvedBy?: number, adminNotes?: string): Promise<SafeguardingReport | undefined>;

  // ── Contact ──────────────────────────────────────────────────────────────────

  /** Create a contact form submission. */
  createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission>;

  // ── Deletion ─────────────────────────────────────────────────────────────────

  /** Hard-delete a class and all dependent records (lessons, quizzes, assignments, bookings, etc.) in a transaction. */
  deleteClass(id: number): Promise<void>;
  /** Hard-delete a user and all owned data in a transaction (irreversible). */
  deleteUser(id: number): Promise<void>;
  /** Soft-delete a user: cancel active bookings/classes, remove messages, set deletedAt. */
  softDeleteUser(id: number): Promise<void>;
  /** Delete a discussion and its replies. */
  deleteDiscussion(id: number): Promise<void>;
  /** Get all notifications platform-wide, excluding soft-deleted users. Default limit = 50. */
  getAllNotifications(limit?: number): Promise<any[]>;
  /** Mark all of a user's unread notifications as read. */
  markAllNotificationsRead(userId: number): Promise<void>;
  /** Get the count of unread notifications for a user. */
  getUnreadNotificationCount(userId: number): Promise<number>;

  // ── Phase 3 Security ─────────────────────────────────────────────────────────

  /** Record a login event in the login_history table for audit purposes. */
  recordLoginHistory(userId: number, ip: string | undefined, userAgent: string | undefined): Promise<void>;
  /** Get a user's recent login history. Default limit = 10. */
  getLoginHistory(userId: number, limit?: number): Promise<any[]>;
  /** Increment a user's JWT token version (invalidates all existing tokens). */
  incrementTokenVersion(userId: number): Promise<number>;

  // ── Peer Help Board ──────────────────────────────────────────────────────────

  /** Register a student as a peer helper for a class topic. Upserts on conflict. */
  createPeerHelper(data: { userId: number; classId: number; topic: string; quizScore?: number }): Promise<any>;
  /** Remove a peer helper registration (only the owner can delete). */
  deletePeerHelper(id: number, userId: number): Promise<void>;
  /** Get all peer helpers for a class with helper name and avatar. */
  getPeerHelpersByClass(classId: number): Promise<any[]>;
  /** Check if a user is already a helper for a specific class + topic. */
  getPeerHelperByUser(userId: number, classId: number, topic: string): Promise<any | undefined>;
  /** Create a peer help request from a student. */
  createPeerHelpRequest(data: { studentId: number; classId: number; topic: string; description: string }): Promise<any>;
  /** Get peer help requests for a class, optionally filtered by status. */
  getPeerHelpRequests(classId: number, status?: string): Promise<any[]>;
  /** Get all help requests submitted by a specific student. */
  getPeerHelpRequestsByStudent(studentId: number): Promise<any[]>;
  /** Get a single peer help request by id. */
  getPeerHelpRequest(id: number): Promise<any | undefined>;
  /** Update a help request's status or assign a helper. */
  updatePeerHelpRequest(id: number, data: { status?: string; helperId?: number }): Promise<any>;

  /** Create a peer tutoring session (coordinator must approve). */
  createPeerSession(data: { requestId?: number; requesterId: number; helperId: number; classId: number; proposedDate?: string; proposedTime?: string }): Promise<any>;
  /** Get all peer sessions involving a user (as requester or helper). */
  getPeerSessionsByUser(userId: number): Promise<any[]>;
  /** Get all pending peer sessions (coordinator approval queue). */
  getPeerSessionsPending(): Promise<any[]>;
  /** Get a single peer session by id. */
  getPeerSession(id: number): Promise<any | undefined>;
  /** Update a peer session's status, coordinator notes, or approval. */
  updatePeerSession(id: number, data: { status?: string; coordinatorNotes?: string; approvedBy?: number }): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), sql`${users.deletedAt} IS NULL`));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), sql`${users.deletedAt} IS NULL`));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(sql`${users.deletedAt} IS NULL`);
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users).where(sql`${users.deletedAt} IS NULL`);
    return result.count;
  }

  async getTutorCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users).where(and(eq(users.role, "tutor"), sql`${users.deletedAt} IS NULL`));
    return result.count;
  }

  async getStudentCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users).where(and(eq(users.role, "student"), sql`${users.deletedAt} IS NULL`));
    return result.count;
  }

  async getClasses(filters?: ClassFilters): Promise<any[]> {
    // Build SQL WHERE conditions directly instead of in-memory filtering
    // #15: exclude classes belonging to soft-deleted tutors
    const conditions: any[] = [eq(classes.status, "active"), isNull(users.deletedAt)];

    if (filters?.category) {
      conditions.push(eq(classes.category, filters.category));
    }
    if (filters?.level) {
      conditions.push(eq(classes.skillLevel, filters.level as any));
    }
    if (filters?.courseType) {
      const types = filters.courseType.split(",");
      if (types.length === 1) {
        conditions.push(eq(classes.courseType, types[0] as any));
      } else {
        conditions.push(inArray(classes.courseType, types as any[]));
      }
    }
    if (filters?.minDuration) {
      conditions.push(gte(classes.duration, filters.minDuration));
    }
    if (filters?.maxDuration) {
      conditions.push(lte(classes.duration, filters.maxDuration));
    }
    if (filters?.language) {
      conditions.push(eq(classes.language, filters.language));
    }
    if (filters?.isFree === "true") {
      conditions.push(eq(classes.isFree, true));
    }
    if (filters?.orphanage) {
      conditions.push(ilike(users.organization, `%${filters.orphanage}%`));
    }
    if (filters?.minRating) {
      conditions.push(sql`CAST(${users.rating} AS numeric) >= ${filters.minRating}`);
    }
    if (filters?.search) {
      // Search in title, description, and category (lesson search handled in JS below)
      conditions.push(
        or(
          ilike(classes.title, `%${filters.search}%`),
          ilike(classes.description, `%${filters.search}%`),
          ilike(classes.category, `%${filters.search}%`)
        )
      );
    }

    // Determine ORDER BY based on sort param (default newest)
    let orderBy: any = desc(classes.createdAt);
    if (filters?.sort === "popular") orderBy = desc(classes.enrolledCount);
    else if (filters?.sort === "rating") orderBy = desc(users.rating);
    else if (filters?.sort === "duration-asc") orderBy = asc(classes.duration);
    else if (filters?.sort === "duration-desc") orderBy = desc(classes.duration);

    const baseQuery = db
      .select({
        id: classes.id,
        tutorId: classes.tutorId,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        skillLevel: classes.skillLevel,
        duration: classes.duration,
        maxStudents: classes.maxStudents,
        status: classes.status,
        courseType: classes.courseType,
        thumbnailUrl: classes.thumbnailUrl,
        videoUrl: classes.videoUrl,
        recordingUrl: classes.recordingUrl,
        recordingAvailableUntil: classes.recordingAvailableUntil,
        isRecordingAvailable: classes.isRecordingAvailable,
        totalLectures: classes.totalLectures,
        viewCount: classes.viewCount,
        language: classes.language,
        isFree: classes.isFree,
        price: classes.price,
        scheduleDate: classes.scheduleDate,
        scheduleTime: classes.scheduleTime,
        enrolledCount: classes.enrolledCount,
        createdAt: classes.createdAt,
        tutorName: users.name,
        tutorRating: users.rating,
        tutorAvatar: users.avatar,
        tutorOrganization: users.organization,
      })
      .from(classes)
      .leftJoin(users, eq(classes.tutorId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy);
    
    const results = await (filters?.limit ? baseQuery.limit(Math.min(Number(filters.limit), 200)) : baseQuery);

    // For lesson-content search, also include classes whose lessons match
    if (filters?.search) {
      const matchingLessons = await db.select({ classId: lessons.classId })
        .from(lessons)
        .where(or(ilike(lessons.title, `%${filters.search}%`), ilike(lessons.description, `%${filters.search}%`)));
      const lessonClassIds = new Set(matchingLessons.map((l) => l.classId).filter(Boolean));
      // Fetch those extra classes not already in results
      if (lessonClassIds.size > 0) {
        const existingIds = new Set(results.map((r) => r.id));
        const extraIds = Array.from(lessonClassIds).filter((id) => !existingIds.has(id!)) as number[];
        if (extraIds.length > 0) {
          const extraClasses = await db
            .select({
              id: classes.id,
              tutorId: classes.tutorId,
              title: classes.title,
              description: classes.description,
              category: classes.category,
              skillLevel: classes.skillLevel,
              duration: classes.duration,
              maxStudents: classes.maxStudents,
              status: classes.status,
              courseType: classes.courseType,
              thumbnailUrl: classes.thumbnailUrl,
              videoUrl: classes.videoUrl,
              recordingUrl: classes.recordingUrl,
              recordingAvailableUntil: classes.recordingAvailableUntil,
              isRecordingAvailable: classes.isRecordingAvailable,
              totalLectures: classes.totalLectures,
              viewCount: classes.viewCount,
              language: classes.language,
              isFree: classes.isFree,
              price: classes.price,
              scheduleDate: classes.scheduleDate,
              scheduleTime: classes.scheduleTime,
              enrolledCount: classes.enrolledCount,
              createdAt: classes.createdAt,
              tutorName: users.name,
              tutorRating: users.rating,
              tutorAvatar: users.avatar,
              tutorOrganization: users.organization,
            })
            .from(classes)
            .leftJoin(users, eq(classes.tutorId, users.id))
            .where(and(eq(classes.status, "active"), isNull(users.deletedAt), inArray(classes.id, extraIds)));
          results.push(...extraClasses);
        }
      }
    }

    return results;
  }

  async getClass(id: number): Promise<any> {
    const [cls] = await db
      .select({
        id: classes.id,
        tutorId: classes.tutorId,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        skillLevel: classes.skillLevel,
        duration: classes.duration,
        maxStudents: classes.maxStudents,
        status: classes.status,
        courseType: classes.courseType,
        thumbnailUrl: classes.thumbnailUrl,
        videoUrl: classes.videoUrl,
        recordingUrl: classes.recordingUrl,
        recordingAvailableUntil: classes.recordingAvailableUntil,
        isRecordingAvailable: classes.isRecordingAvailable,
        totalLectures: classes.totalLectures,
        viewCount: classes.viewCount,
        language: classes.language,
        isFree: classes.isFree,
        price: classes.price,
        scheduleDate: classes.scheduleDate,
        scheduleTime: classes.scheduleTime,
        scheduleType: classes.scheduleType,
        enrolledCount: classes.enrolledCount,
        createdAt: classes.createdAt,
        tutorName: users.name,
        tutorRating: users.rating,
        tutorAvatar: users.avatar,
        tutorBio: users.bio,
        tutorTotalReviews: users.totalReviews,
        tutorSkillsTaught: users.skillsTaught,
      })
      .from(classes)
      .leftJoin(users, eq(classes.tutorId, users.id))
      .where(eq(classes.id, id));
    return cls;
  }

  async getClassesByTutor(tutorId: number): Promise<any[]> {
    return db
      .select({
        id: classes.id,
        tutorId: classes.tutorId,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        skillLevel: classes.skillLevel,
        duration: classes.duration,
        maxStudents: classes.maxStudents,
        status: classes.status,
        courseType: classes.courseType,
        thumbnailUrl: classes.thumbnailUrl,
        totalLectures: classes.totalLectures,
        viewCount: classes.viewCount,
        enrolledCount: classes.enrolledCount,
        scheduleDate: classes.scheduleDate,
        scheduleTime: classes.scheduleTime,
        isFree: classes.isFree,
        price: classes.price,
        language: classes.language,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(eq(classes.tutorId, tutorId))
      .orderBy(desc(classes.createdAt));
  }

  async getClassesByUser(userId: number): Promise<Class[]> {
    return db.select().from(classes).where(eq(classes.tutorId, userId)).orderBy(desc(classes.createdAt));
  }

  async getEnrolledClasses(userId: number): Promise<any[]> {
    const userBookings = await db
      .select({
        id: classes.id,
        tutorId: classes.tutorId,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        skillLevel: classes.skillLevel,
        duration: classes.duration,
        maxStudents: classes.maxStudents,
        status: classes.status,
        courseType: classes.courseType,
        thumbnailUrl: classes.thumbnailUrl,
        totalLectures: classes.totalLectures,
        enrolledCount: classes.enrolledCount,
        scheduleDate: classes.scheduleDate,
        scheduleTime: classes.scheduleTime,
        createdAt: classes.createdAt,
        tutorName: users.name,
        tutorAvatar: users.avatar,
        bookingStatus: bookings.status,
        bookingId: bookings.id,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .leftJoin(users, eq(classes.tutorId, users.id))
      .where(
        and(
          eq(bookings.studentId, userId),
          ne(bookings.status, "cancelled"),
          ne(bookings.status, "no-show")
        )
      );
    return userBookings;
  }

  async createClass(cls: InsertClass): Promise<Class> {
    const [created] = await db.insert(classes).values(cls).returning();
    return created;
  }

  async updateClass(id: number, data: Partial<Class>): Promise<Class | undefined> {
    const [updated] = await db.update(classes).set(data).where(eq(classes.id, id)).returning();
    return updated;
  }

  async getClassCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(classes).where(eq(classes.status, "active"));
    return result.count;
  }

  async getPopularClasses(limit = 5): Promise<any[]> {
    return db
      .select({
        id: classes.id,
        title: classes.title,
        category: classes.category,
        enrolledCount: classes.enrolledCount,
        thumbnailUrl: classes.thumbnailUrl,
        tutorName: users.name,
        tutorRating: users.rating,
      })
      .from(classes)
      .leftJoin(users, eq(classes.tutorId, users.id))
      .where(eq(classes.status, "active"))
      .orderBy(desc(classes.enrolledCount))
      .limit(limit);
  }

  async getBookings(userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: bookings.id,
        studentId: bookings.studentId,
        classId: bookings.classId,
        tutorId: bookings.tutorId,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        duration: bookings.duration,
        status: bookings.status,
        createdAt: bookings.createdAt,
        classTitle: classes.title,
      })
      .from(bookings)
      .leftJoin(classes, eq(bookings.classId, classes.id))
      .where(or(eq(bookings.studentId, userId), eq(bookings.tutorId, userId)))
      .orderBy(desc(bookings.createdAt));

    // Batch-fetch all referenced users in one query (avoids N+1)
    const allUserIds = Array.from(new Set([
      ...result.map(b => b.tutorId).filter(Boolean),
      ...result.map(b => b.studentId).filter(Boolean),
    ] as number[]));
    const usersList = allUserIds.length > 0
      ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, allUserIds))
      : [];
    const usersMap = new Map(usersList.map(u => [u.id, u]));

    return result.map(booking => ({
      ...booking,
      tutorName: usersMap.get(booking.tutorId)?.name || "Unknown User",
      studentName: usersMap.get(booking.studentId)?.name || "Unknown User",
    }));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getAllBookings(): Promise<any[]> {
    const result = await db
      .select({
        id: bookings.id,
        studentId: bookings.studentId,
        classId: bookings.classId,
        tutorId: bookings.tutorId,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        duration: bookings.duration,
        status: bookings.status,
        createdAt: bookings.createdAt,
        classTitle: classes.title,
      })
      .from(bookings)
      .leftJoin(classes, eq(bookings.classId, classes.id))
      .orderBy(desc(bookings.createdAt));

    // Batch fetch all user names like getBookings() does
    const allUserIds = Array.from(new Set([
      ...result.map(b => b.tutorId).filter(Boolean),
      ...result.map(b => b.studentId).filter(Boolean),
    ] as number[]));
    const usersList = allUserIds.length > 0
      ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, allUserIds))
      : [];
    const usersMap = new Map(usersList.map(u => [u.id, u]));

    return result.map(booking => ({
      ...booking,
      tutorName: usersMap.get(booking.tutorId)?.name || "Unknown User",
      studentName: usersMap.get(booking.studentId)?.name || "Unknown User",
    }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    // NOTE: enrolledCount is NOT incremented here — the booking route handles it
    // inside its own db.transaction() to prevent race conditions. Do NOT add it
    // here or it will be double-incremented when the route calls this method.
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined> {
    // Decrement enrolledCount when a booking is cancelled or marked no-show
    if (data.status === "cancelled" || data.status === "no-show") {
      const booking = await this.getBooking(id);
      if (booking) {
        await db.update(classes).set({ enrolledCount: sql`${classes.enrolledCount} - 1` }).where(and(eq(classes.id, booking.classId), sql`${classes.enrolledCount} > 0`));
      }
    }
    const [updated] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return updated;
  }

  async getBookingCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(bookings);
    return result.count;
  }

  async getConversations(userId: number): Promise<any[]> {
    const allMessages = await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    const convoMap = new Map<number, { otherUserId: number; lastMessage: string; lastDate: Date; unreadCount: number }>();

    for (const msg of allMessages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convoMap.has(otherUserId)) {
        convoMap.set(otherUserId, {
          otherUserId,
          lastMessage: msg.content,
          lastDate: msg.createdAt!,
          unreadCount: 0,
        });
      }
      if (msg.receiverId === userId && !msg.isRead) {
        const entry = convoMap.get(otherUserId)!;
        entry.unreadCount++;
      }
    }

    // Batch-fetch all other-user records in one query (avoids N+1)
    const otherUserIds = Array.from(convoMap.keys());
    const otherUsersList = otherUserIds.length > 0
      ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, otherUserIds))
      : [];
    const otherUsersMap = new Map(otherUsersList.map(u => [u.id, u]));

    const convos = Array.from(convoMap.values()).map(data => ({
      ...data,
      otherUserName: otherUsersMap.get(data.otherUserId)?.name || "Unknown",
      otherUserAvatar: otherUsersMap.get(data.otherUserId)?.avatar || null,
    }));

    return convos.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }

  async getMessagesBetween(userId: number, otherUserId: number): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt);

    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), eq(messages.isRead, false)));

    return result;
  }

  async markConversationRead(userId: number, otherUserId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), eq(messages.isRead, false)));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async getReviewsByClass(classId: number): Promise<any[]> {
    const result = await db
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        classId: reviews.classId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: users.name,
        reviewerAvatar: users.avatar,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.classId, classId))
      .orderBy(desc(reviews.createdAt));
    return result;
  }

  async getReviewsByUser(userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        classId: reviews.classId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: users.name,
        reviewerAvatar: users.avatar,
        classTitle: classes.title,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .leftJoin(classes, eq(reviews.classId, classes.id))
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));
    return result;
  }

  async createReview(review: InsertReview): Promise<Review> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(reviews).values(review).returning();
      const [avgResult] = await tx
        .select({ avg: sql<number>`AVG(${reviews.rating})`, count: count() })
        .from(reviews)
        .where(eq(reviews.revieweeId, review.revieweeId));
      const avg = avgResult?.avg ?? 0;
      await tx
        .update(users)
        .set({ rating: String(avg), totalReviews: avgResult?.count ?? 1 })
        .where(eq(users.id, review.revieweeId));
      return created;
    });
  }

  async getNotifications(userId: number, limit = 10): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async getFavorites(userId: number): Promise<any[]> {
    return db
      .select({
        id: favorites.id,
        classId: favorites.classId,
        createdAt: favorites.createdAt,
        classTitle: classes.title,
        classCategory: classes.category,
        classThumbnail: classes.thumbnailUrl,
        classCourseType: classes.courseType,
        classEnrolledCount: classes.enrolledCount,
        tutorName: users.name,
      })
      .from(favorites)
      .innerJoin(classes, eq(favorites.classId, classes.id))
      .leftJoin(users, eq(classes.tutorId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(fav: InsertFavorite): Promise<Favorite> {
    const [created] = await db.insert(favorites).values(fav).returning();
    return created;
  }

  async removeFavorite(userId: number, classId: number): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.classId, classId)));
  }

  async isFavorite(userId: number, classId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.classId, classId)));
    return !!result;
  }

  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(userId: number, data: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set(data)
        .where(eq(userSettings.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userSettings)
      .values({ ...data, userId })
      .returning();
    return created;
  }

  async getCourseProgress(userId: number, classId: number): Promise<CourseProgress[]> {
    return db
      .select()
      .from(courseProgress)
      .where(and(eq(courseProgress.userId, userId), eq(courseProgress.classId, classId)))
      .orderBy(courseProgress.lectureNumber);
  }

  async upsertCourseProgress(data: InsertCourseProgress): Promise<CourseProgress> {
    const [result] = await db
      .insert(courseProgress)
      .values({ ...data, lectureNumber: data.lectureNumber ?? 1 })
      .onConflictDoUpdate({
        target: [courseProgress.userId, courseProgress.classId, courseProgress.lectureNumber],
        set: { ...data, lastWatchedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getUserCourseProgress(userId: number): Promise<any[]> {
    return db
      .select({
        classId: courseProgress.classId,
        lectureNumber: courseProgress.lectureNumber,
        completed: courseProgress.completed,
        lastWatchedAt: courseProgress.lastWatchedAt,
        watchTimeSeconds: courseProgress.watchTimeSeconds,
        classTitle: classes.title,
        classThumbnail: classes.thumbnailUrl,
        totalLectures: classes.totalLectures,
        courseType: classes.courseType,
      })
      .from(courseProgress)
      .innerJoin(classes, eq(courseProgress.classId, classes.id))
      .where(eq(courseProgress.userId, userId))
      .orderBy(desc(courseProgress.lastWatchedAt));
  }

  async getDashboardStats(userId: number, role: string): Promise<any> {
    if (role === "coordinator") {
      return this.getCoordinatorStats();
    }

    if (role === "tutor") {
      const classList = await db.select().from(classes).where(eq(classes.tutorId, userId));
      const bookingsList = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.tutorId, userId), eq(bookings.status, "confirmed")));
      const completedList = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.tutorId, userId), eq(bookings.status, "completed")));
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const totalStudents = await db
        .select({ studentId: bookings.studentId })
        .from(bookings)
        .where(eq(bookings.tutorId, userId));
      const uniqueStudents = new Set(totalStudents.map((b) => b.studentId));

      const recentReviews = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          reviewerName: users.name,
          classId: reviews.classId,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.revieweeId, userId))
        .orderBy(desc(reviews.createdAt))
        .limit(5);

      return {
        classCount: classList.length,
        upcomingCount: bookingsList.length,
        completedCount: completedList.length,
        totalHours: completedList.reduce((sum, b) => sum + (b.duration != null ? b.duration : 60), 0) / 60,
        avgRating: Number(user?.rating || 0),
        totalStudents: uniqueStudents.size,
        recentReviews,
        classes: classList,
      };
    }

    const enrolledBookings = await db.select().from(bookings).where(eq(bookings.studentId, userId));
    const upcoming = enrolledBookings.filter((b) => ["pending", "confirmed"].includes(b.status));
    const completed = enrolledBookings.filter((b) => b.status === "completed");
    const classIds = Array.from(new Set(enrolledBookings.map((b) => b.classId)));

    const progress = await this.getUserCourseProgress(userId);

    return {
      classCount: classIds.length,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      totalHours: completed.reduce((sum, b) => sum + (b.duration || 60), 0) / 60,
      courseProgress: progress,
    };
  }

  async getCoordinatorStats(): Promise<any> {
    const totalUsers = await this.getUserCount();
    const totalTutors = await this.getTutorCount();
    const totalStudents = await this.getStudentCount();
    const totalClasses = await this.getClassCount();
    const totalBookings = await this.getBookingCount();

    // Use SQL COUNT queries instead of loading all bookings into memory
    const [completedResult] = await db.select({ c: count() }).from(bookings).where(eq(bookings.status, "completed"));
    const [confirmedResult] = await db.select({ c: count() }).from(bookings).where(eq(bookings.status, "confirmed"));
    const [cancelledResult] = await db.select({ c: count() }).from(bookings).where(eq(bookings.status, "cancelled"));
    
    const completedBookings = completedResult.c;
    const confirmedBookings = confirmedResult.c;
    const cancelledBookings = cancelledResult.c;
    const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

    // Use SQL AVG aggregate instead of loading all reviews into memory
    const [ratingStats] = await db.select({ 
      avg: sql<number>`AVG(${reviews.rating})`, 
      total: count() 
    }).from(reviews);
    
    const avgRating = ratingStats.avg ? Number(ratingStats.avg).toFixed(1) : "0";
    const totalReviews = ratingStats.total;

    const popularClasses = await this.getPopularClasses(5);

    const categoryStats = await db
      .select({
        category: classes.category,
        count: count(),
      })
      .from(classes)
      .where(eq(classes.status, "active"))
      .groupBy(classes.category);

    const courseTypeStats = await db
      .select({
        courseType: classes.courseType,
        count: count(),
      })
      .from(classes)
      .where(eq(classes.status, "active"))
      .groupBy(classes.courseType);

    const pendingBookings = await db
      .select({
        id: bookings.id,
        studentId: bookings.studentId,
        classId: bookings.classId,
        createdAt: bookings.createdAt,
        classTitle: classes.title,
      })
      .from(bookings)
      .leftJoin(classes, eq(bookings.classId, classes.id))
      .where(eq(bookings.status, "pending"))
      .orderBy(desc(bookings.createdAt))
      .limit(10);

    const pendingReports = await db
      .select({ count: count() })
      .from(safeguardingReports)
      .where(eq(safeguardingReports.status, "pending"));

    const totalHours = Math.round(
      (await db
        .select({ duration: bookings.duration })
        .from(bookings)
        .where(eq(bookings.status, "completed")))
        .reduce((acc, b) => acc + (b.duration || 60), 0) / 60
    );

    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    return {
      totalUsers,
      totalTutors,
      totalStudents,
      totalClasses,
      totalBookings,
      completedBookings: completedBookings,
      confirmedBookings: confirmedBookings,
      cancelledBookings: cancelledBookings,
      completionRate,
      avgRating,
      totalReviews,
      totalHours: Math.round(totalHours),
      pendingReportsCount: pendingReports[0]?.count || 0,
      popularClasses,
      categoryStats,
      courseTypeStats,
      pendingBookings,
      recentUsers,
    };
  }

  async getRecentActivity(limit = 10): Promise<any[]> {
    const recentBookings = await db
      .select({
        id: bookings.id,
        type: sql<string>`'booking'`,
        userId: bookings.studentId,
        details: classes.title,
        status: bookings.status,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(classes, eq(bookings.classId, classes.id))
      .orderBy(desc(bookings.createdAt))
      .limit(limit);

    const recentReviews = await db
      .select({
        id: reviews.id,
        type: sql<string>`'review'`,
        userId: reviews.reviewerId,
        details: classes.title,
        // rating cast to string for uniform activity item shape; NOT a status value
        rating: sql<string>`CAST(${reviews.rating} AS TEXT)`,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(classes, eq(reviews.classId, classes.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    const recentSignups = await db
      .select({
        id: users.id,
        type: sql<string>`'signup'`,
        userId: users.id,
        details: users.role,
        status: sql<string>`'active'`,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    const recentClasses = await db
      .select({
        id: classes.id,
        type: sql<string>`'class_created'`,
        userId: classes.tutorId,
        details: classes.title,
        status: classes.status,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .orderBy(desc(classes.createdAt))
      .limit(limit);

    const allActivity = [...recentBookings, ...recentReviews, ...recentSignups, ...recentClasses];
    allActivity.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    const trimmed = allActivity.slice(0, limit);

    // Batch-fetch all referenced user names in one query (avoids N+1)
    const activityUserIds = Array.from(new Set(trimmed.map(item => item.userId).filter(Boolean) as number[]));
    const activityUsersList = activityUserIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, activityUserIds))
      : [];
    const activityUsersMap = new Map(activityUsersList.map(u => [u.id, u]));

    return trimmed.map(item => ({
      ...item,
      userName: activityUsersMap.get(item.userId)?.name || "Unknown",
    }));
  }

  async createSafeguardingReport(report: InsertSafeguardingReport): Promise<SafeguardingReport> {
    const [created] = await db.insert(safeguardingReports).values(report).returning();
    return created;
  }

  async getSafeguardingReports(): Promise<SafeguardingReport[]> {
    return db.select().from(safeguardingReports).orderBy(desc(safeguardingReports.createdAt));
  }

  async updateReportStatus(id: number, status: string, resolvedBy?: number, adminNotes?: string): Promise<SafeguardingReport | undefined> {
    const updateData: Partial<SafeguardingReport> = { status: status as SafeguardingReport["status"] };
    if (resolvedBy) {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
    }
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    const [updated] = await db.update(safeguardingReports).set(updateData).where(eq(safeguardingReports.id, id)).returning();
    return updated;
  }

  async createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission> {
    const [created] = await db.insert(contactSubmissions).values(data).returning();
    return created;
  }

  async deleteClass(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related records first to avoid FK constraint violations
      await tx.delete(lessons).where(eq(lessons.classId, id));
      // Delete quiz results before quizzes
      const classQuizIds = await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.classId, id));
      if (classQuizIds.length > 0) {
        await tx.delete(quizResults).where(inArray(quizResults.quizId, classQuizIds.map(q => q.id)));
      }
      await tx.delete(quizzes).where(eq(quizzes.classId, id));
      // Delete assignment submissions before assignments
      const classAssignmentIds = await tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.classId, id));
      if (classAssignmentIds.length > 0) {
        await tx.delete(assignmentSubmissions).where(inArray(assignmentSubmissions.assignmentId, classAssignmentIds.map(a => a.id)));
      }
      await tx.delete(assignments).where(eq(assignments.classId, id));
      // Delete discussion replies before discussions
      const classDiscussionIds = await tx.select({ id: discussions.id }).from(discussions).where(eq(discussions.classId, id));
      if (classDiscussionIds.length > 0) {
        await tx.delete(discussionReplies).where(inArray(discussionReplies.discussionId, classDiscussionIds.map(d => d.id)));
      }
      await tx.delete(discussions).where(eq(discussions.classId, id));
      await tx.delete(favorites).where(eq(favorites.classId, id));
      await tx.delete(courseProgress).where(eq(courseProgress.classId, id));
      await tx.delete(bookings).where(eq(bookings.classId, id));
      await tx.delete(reviews).where(eq(reviews.classId, id));
      await tx.delete(certificates).where(eq(certificates.classId, id));
      // Finally delete the class itself
      await tx.delete(classes).where(eq(classes.id, id));
    });
  }

  async deleteUser(id: number): Promise<void> {
    // Full cascade: remove all user-owned data before deleting user record
    await db.transaction(async (tx) => {
      const userDiscussions = await tx.select({ id: discussions.id }).from(discussions).where(eq(discussions.authorId, id));
      if (userDiscussions.length > 0) {
        await tx.delete(discussionReplies).where(inArray(discussionReplies.discussionId, userDiscussions.map(d => d.id)));
      }
      await tx.delete(discussionReplies).where(eq(discussionReplies.authorId, id));
      await tx.delete(discussions).where(eq(discussions.authorId, id));
      await tx.delete(notes).where(eq(notes.userId, id));
      await tx.delete(certificates).where(eq(certificates.studentId, id));
      await tx.delete(courseProgress).where(eq(courseProgress.userId, id));
      await tx.delete(favorites).where(eq(favorites.userId, id));
      await tx.delete(userSettings).where(eq(userSettings.userId, id));
      await tx.delete(notifications).where(eq(notifications.userId, id));
      await tx.delete(assignmentSubmissions).where(eq(assignmentSubmissions.studentId, id));
      await tx.delete(quizResults).where(eq(quizResults.studentId, id));
      await tx.delete(reviews).where(eq(reviews.reviewerId, id));
      await tx.delete(reviews).where(eq(reviews.revieweeId, id));
      await tx.delete(messages).where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
      await tx.delete(bookings).where(or(eq(bookings.studentId, id), eq(bookings.tutorId, id)));
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async deleteDiscussion(id: number): Promise<void> {
    // Cascade: delete all replies before deleting the discussion
    await db.delete(discussionReplies).where(eq(discussionReplies.discussionId, id));
    await db.delete(discussions).where(eq(discussions.id, id));
  }

  async getAllNotifications(limit: number = 50): Promise<any[]> {
    // Exclude notifications belonging to soft-deleted users
    return db
      .select({ notification: notifications })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .where(isNull(sql`${users.deletedAt}`))
      .orderBy(desc(notifications.id))
      .limit(limit)
      .then(rows => rows.map(r => r.notification));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.count;
  }

  async softDeleteUser(id: number): Promise<void> {
    // Cancel active bookings where user is student or tutor
    const activeStatuses = or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed"));
    await db.update(bookings).set({ status: "cancelled" })
      .where(and(eq(bookings.studentId, id), activeStatuses));
    await db.update(bookings).set({ status: "cancelled" })
      .where(and(eq(bookings.tutorId, id), activeStatuses));
    // Cancel active classes owned by this user (if tutor)
    await db.update(classes).set({ status: "cancelled" })
      .where(and(eq(classes.tutorId, id), eq(classes.status, "active")));
    // #16: Delete sent/received messages so they don't persist in other users' inboxes
    await db.delete(messages).where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
    // Remove user-owned records that serve no purpose after soft-delete
    const userDiscussions = await db.select({ id: discussions.id }).from(discussions).where(eq(discussions.authorId, id));
    if (userDiscussions.length > 0) {
      await db.delete(discussionReplies).where(inArray(discussionReplies.discussionId, userDiscussions.map(d => d.id)));
    }
    await db.delete(discussions).where(eq(discussions.authorId, id));
    await db.delete(notes).where(eq(notes.userId, id));
    await db.delete(courseProgress).where(eq(courseProgress.userId, id));
    await db.delete(favorites).where(eq(favorites.userId, id));
    await db.delete(userSettings).where(eq(userSettings.userId, id));
    // Soft-delete the user record
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
  }

  async recordLoginHistory(userId: number, ip: string | undefined, userAgent: string | undefined): Promise<void> {
    await db.insert(loginHistory).values({ userId, ip: ip || null, userAgent: userAgent || null });
  }

  async getLoginHistory(userId: number, limit: number = 10): Promise<any[]> {
    return db.select().from(loginHistory).where(eq(loginHistory.userId, userId)).orderBy(desc(loginHistory.createdAt)).limit(limit);
  }

  async incrementTokenVersion(userId: number): Promise<number> {
    const [user] = await db.select({ tokenVersion: users.tokenVersion }).from(users).where(eq(users.id, userId));
    const newVersion = (user?.tokenVersion ?? 1) + 1;
    await db.update(users).set({ tokenVersion: newVersion }).where(eq(users.id, userId));
    return newVersion;
  }

  // ── Peer Help Board ──────────────────────────────────────────────────────────

  async createPeerHelper(data: { userId: number; classId: number; topic: string; quizScore?: number }): Promise<any> {
    const [row] = await db.insert(peerHelpers).values(data).onConflictDoUpdate({
      target: [peerHelpers.userId, peerHelpers.classId, peerHelpers.topic],
      set: { quizScore: data.quizScore },
    }).returning();
    return row;
  }

  async deletePeerHelper(id: number, userId: number): Promise<void> {
    await db.delete(peerHelpers).where(and(eq(peerHelpers.id, id), eq(peerHelpers.userId, userId)));
  }

  async getPeerHelpersByClass(classId: number): Promise<any[]> {
    const rows = await db.select({
      id: peerHelpers.id,
      userId: peerHelpers.userId,
      classId: peerHelpers.classId,
      topic: peerHelpers.topic,
      quizScore: peerHelpers.quizScore,
      createdAt: peerHelpers.createdAt,
      helperName: users.name,
      helperAvatar: users.avatar,
    })
      .from(peerHelpers)
      .innerJoin(users, eq(peerHelpers.userId, users.id))
      .where(eq(peerHelpers.classId, classId))
      .orderBy(desc(peerHelpers.createdAt));
    return rows;
  }

  async getPeerHelperByUser(userId: number, classId: number, topic: string): Promise<any | undefined> {
    const [row] = await db.select().from(peerHelpers).where(
      and(eq(peerHelpers.userId, userId), eq(peerHelpers.classId, classId), eq(peerHelpers.topic, topic))
    );
    return row;
  }

  async createPeerHelpRequest(data: { studentId: number; classId: number; topic: string; description: string }): Promise<any> {
    const [row] = await db.insert(peerHelpRequests).values(data).returning();
    return row;
  }

  async getPeerHelpRequests(classId: number, status?: string): Promise<any[]> {
    const conditions = status
      ? and(eq(peerHelpRequests.classId, classId), eq(peerHelpRequests.status, status as any))
      : eq(peerHelpRequests.classId, classId);
    const rows = await db.select({
      id: peerHelpRequests.id,
      studentId: peerHelpRequests.studentId,
      classId: peerHelpRequests.classId,
      topic: peerHelpRequests.topic,
      description: peerHelpRequests.description,
      status: peerHelpRequests.status,
      helperId: peerHelpRequests.helperId,
      createdAt: peerHelpRequests.createdAt,
      studentName: users.name,
      studentAvatar: users.avatar,
    })
      .from(peerHelpRequests)
      .innerJoin(users, eq(peerHelpRequests.studentId, users.id))
      .where(conditions)
      .orderBy(desc(peerHelpRequests.createdAt));
    return rows;
  }

  async getPeerHelpRequestsByStudent(studentId: number): Promise<any[]> {
    const rows = await db.select({
      id: peerHelpRequests.id,
      studentId: peerHelpRequests.studentId,
      classId: peerHelpRequests.classId,
      topic: peerHelpRequests.topic,
      description: peerHelpRequests.description,
      status: peerHelpRequests.status,
      helperId: peerHelpRequests.helperId,
      createdAt: peerHelpRequests.createdAt,
    })
      .from(peerHelpRequests)
      .where(eq(peerHelpRequests.studentId, studentId))
      .orderBy(desc(peerHelpRequests.createdAt));
    return rows;
  }

  async getPeerHelpRequest(id: number): Promise<any | undefined> {
    const [row] = await db.select().from(peerHelpRequests).where(eq(peerHelpRequests.id, id));
    return row;
  }

  async updatePeerHelpRequest(id: number, data: { status?: string; helperId?: number }): Promise<any> {
    const [updated] = await db.update(peerHelpRequests).set(data as any).where(eq(peerHelpRequests.id, id)).returning();
    return updated;
  }

  async createPeerSession(data: { requestId?: number; requesterId: number; helperId: number; classId: number; proposedDate?: string; proposedTime?: string }): Promise<any> {
    const [row] = await db.insert(peerSessions).values(data as any).returning();
    return row;
  }

  async getPeerSessionsByUser(userId: number): Promise<any[]> {
    const rows = await db.select({
      id: peerSessions.id,
      requestId: peerSessions.requestId,
      requesterId: peerSessions.requesterId,
      helperId: peerSessions.helperId,
      classId: peerSessions.classId,
      proposedDate: peerSessions.proposedDate,
      proposedTime: peerSessions.proposedTime,
      status: peerSessions.status,
      coordinatorNotes: peerSessions.coordinatorNotes,
      createdAt: peerSessions.createdAt,
      requesterName: sql<string>`req_user.name`,
      helperName: sql<string>`hlp_user.name`,
      className: classes.title,
    })
      .from(peerSessions)
      .leftJoin(sql`users AS req_user`, sql`req_user.id = ${peerSessions.requesterId}`)
      .leftJoin(sql`users AS hlp_user`, sql`hlp_user.id = ${peerSessions.helperId}`)
      .leftJoin(classes, eq(peerSessions.classId, classes.id))
      .where(or(eq(peerSessions.requesterId, userId), eq(peerSessions.helperId, userId)))
      .orderBy(desc(peerSessions.createdAt));
    return rows;
  }

  async getPeerSessionsPending(): Promise<any[]> {
    const rows = await db.select({
      id: peerSessions.id,
      requestId: peerSessions.requestId,
      requesterId: peerSessions.requesterId,
      helperId: peerSessions.helperId,
      classId: peerSessions.classId,
      proposedDate: peerSessions.proposedDate,
      proposedTime: peerSessions.proposedTime,
      status: peerSessions.status,
      coordinatorNotes: peerSessions.coordinatorNotes,
      createdAt: peerSessions.createdAt,
      requesterName: sql<string>`req_user.name`,
      helperName: sql<string>`hlp_user.name`,
      className: classes.title,
    })
      .from(peerSessions)
      .leftJoin(sql`users AS req_user`, sql`req_user.id = ${peerSessions.requesterId}`)
      .leftJoin(sql`users AS hlp_user`, sql`hlp_user.id = ${peerSessions.helperId}`)
      .leftJoin(classes, eq(peerSessions.classId, classes.id))
      .orderBy(desc(peerSessions.createdAt));
    return rows;
  }

  async getPeerSession(id: number): Promise<any | undefined> {
    const [row] = await db.select().from(peerSessions).where(eq(peerSessions.id, id));
    return row;
  }

  async updatePeerSession(id: number, data: { status?: string; coordinatorNotes?: string; approvedBy?: number }): Promise<any> {
    const [updated] = await db.update(peerSessions).set(data as any).where(eq(peerSessions.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
