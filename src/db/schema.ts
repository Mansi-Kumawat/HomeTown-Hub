// ============================================================================
// DATABASE SCHEMA — the single source of truth for every table in Postgres.
//
// 👉 CONCEPT: "Schema" = the blueprint of your database. Each `pgTable(...)`
//    call describes one table (like a Mongoose Model in MERN). Columns are
//    typed, and `references()` draws the relationship arrows between tables
//    (a "foreign key": e.g. every post row stores the id of its author).
//
// Indexes: columns we search or sort by often (city, communityId, userId…)
// get an `index()` so lookups stay fast with thousands of rows.
// ============================================================================

import {
  pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// USERS — one row per account. `role` is the PLATFORM-wide role.
// ("moderator" is set globally when someone moderates any community;
//  per-community powers live in communityMembers.communityRole.)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),          // login identifier
  passwordHash: text("password_hash").notNull(),   // bcrypt hash — never the real password
  role: text("role", { enum: ["admin", "moderator", "member"] }).notNull().default("member"),
  bio: text("bio").notNull().default(""),
  hometown: text("hometown").notNull().default(""),     // the city/village they are FROM
  currentCity: text("current_city").notNull().default(""), // where they live now
  avatarUrl: text("avatar_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true), // admins can deactivate accounts
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("users_email_idx").on(t.email),
]);

// ---------------------------------------------------------------------------
// CATEGORIES — admin-managed tags that describe what a community is about.
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// COMMUNITIES — one per city/village hub. Created "pending" until a
// Platform Admin approves it. memberCount is a cached counter (fast reads).
// ---------------------------------------------------------------------------
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),                 // city or village name (searchable → index)
  description: text("description").notNull().default(""),
  rules: text("rules").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("communities_city_idx").on(t.city),
  index("communities_status_idx").on(t.status),
]);

// ---------------------------------------------------------------------------
// COMMUNITY MEMBERS — the "join table" between users and communities.
// status: pending → approved/rejected (moderator decides).
// communityRole: creator (made the community), moderator, or plain member.
// ---------------------------------------------------------------------------
export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  communityRole: text("community_role", { enum: ["creator", "moderator", "member"] }).notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("membership_unique_idx").on(t.communityId, t.userId),
  index("membership_community_idx").on(t.communityId),
]);

// ---------------------------------------------------------------------------
// POSTS — feed entries inside ONE community. type "announcement" is
// moderator-only; isPinned floats it to the top of the feed.
// ---------------------------------------------------------------------------
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id),
  type: text("type", { enum: ["normal", "announcement"] }).notNull().default("normal"),
  content: text("content").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  isPinned: boolean("is_pinned").notNull().default(false),
  likeCount: integer("like_count").notNull().default(0),     // cached counters
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("posts_community_idx").on(t.communityId, t.createdAt),
]);

// POST LIKES — one row per (post, user) like; unique pair prevents double-likes.
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("likes_unique_idx").on(t.postId, t.userId),
]);

// COMMENTS — belong to one post, written by one user.
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("comments_post_idx").on(t.postId),
]);

// EVENTS — community gatherings. attendeeCount is a cached counter.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  eventDate: timestamp("event_date").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  attendeeCount: integer("attendee_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("events_community_idx").on(t.communityId, t.eventDate),
]);

// EVENT ATTENDEES — who joined which event (unique pair).
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("attendees_unique_idx").on(t.eventId, t.userId),
]);

// NOTIFICATIONS — in-app bell. `link` tells the UI where to jump on click.
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),       // e.g. "new_post", "join_approved"
  message: text("message").notNull(),
  link: text("link").notNull().default(""),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("notifications_user_idx").on(t.userId, t.isRead),
]);

// REPORTS — members flag a post OR a comment; admins dismiss or delete it.
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "dismissed", "resolved"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// MODERATOR APPLICATIONS — a member applies to moderate; the community
// creator (or an admin) approves/rejects.
export const moderatorApplications = pgTable("moderator_applications", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  applicantId: integer("applicant_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// RELATIONS — teach Drizzle how tables connect so we can use `with:` queries
// (like Mongoose `.populate()`).
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  memberships: many(communityMembers),
  notifications: many(notifications),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, { fields: [communities.createdById], references: [users.id] }),
  category: one(categories, { fields: [communities.categoryId], references: [categories.id] }),
  posts: many(posts),
  events: many(events),
  members: many(communityMembers),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, { fields: [communityMembers.communityId], references: [communities.id] }),
  user: one(users, { fields: [communityMembers.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
  likes: many(postLikes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  community: one(communities, { fields: [events.communityId], references: [communities.id] }),
  creator: one(users, { fields: [events.creatorId], references: [users.id] }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, { fields: [eventAttendees.eventId], references: [events.id] }),
  user: one(users, { fields: [eventAttendees.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  post: one(posts, { fields: [reports.postId], references: [posts.id] }),
  comment: one(comments, { fields: [reports.commentId], references: [comments.id] }),
}));

export const moderatorApplicationsRelations = relations(moderatorApplications, ({ one }) => ({
  community: one(communities, { fields: [moderatorApplications.communityId], references: [communities.id] }),
  applicant: one(users, { fields: [moderatorApplications.applicantId], references: [users.id] }),
}));
