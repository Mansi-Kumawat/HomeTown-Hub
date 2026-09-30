"use client";
// ============================================================================
// API CLIENT — the ONE place the frontend talks to the backend.
//
// 👉 CONCEPT: a "service layer". Instead of writing fetch() in every page, we
//    centralize: attach the JWT header, send/receive JSON, unwrap the
//    { success, message, data } envelope, and throw friendly Errors.
// ============================================================================

// --- Shared TypeScript types (mirror of the API responses) ------------------
export interface User {
  id: number; name: string; email: string;
  role: "admin" | "moderator" | "member";
  bio: string; hometown: string; currentCity: string;
  avatarUrl: string; isActive: boolean; createdAt: string;
}
export interface Category { id: number; name: string; description: string; communityCount?: number }
export interface Community {
  id: number; name: string; city: string; description: string; rules: string;
  imageUrl: string; status: "pending" | "approved" | "rejected";
  categoryId: number | null; createdById: number; memberCount: number; createdAt: string;
  category?: Category | null; creator?: { id: number; name: string } | null;
}
export interface Membership {
  id: number; communityId: number; userId: number;
  status: "pending" | "approved" | "rejected";
  communityRole: "creator" | "moderator" | "member"; createdAt: string;
  user?: Pick<User, "id" | "name" | "hometown" | "currentCity" | "avatarUrl" | "bio">;
}
export interface Post {
  id: number; communityId: number; authorId: number;
  type: "normal" | "announcement"; content: string; imageUrl: string;
  isPinned: boolean; likeCount: number; commentCount: number; createdAt: string;
  author?: { id: number; name: string; avatarUrl: string; hometown?: string };
  likedByMe?: boolean;
}
export interface CommentItem {
  id: number; postId: number; authorId: number; content: string; createdAt: string;
  author?: { id: number; name: string; avatarUrl: string };
}
export interface EventItem {
  id: number; communityId: number; creatorId: number; title: string; description: string;
  location: string; eventDate: string; imageUrl: string; attendeeCount: number; createdAt: string;
  creator?: { id: number; name: string; avatarUrl: string }; joinedByMe?: boolean;
}
export interface NotificationItem { id: number; type: string; message: string; link: string; isRead: boolean; createdAt: string }
export interface JoinRequest extends Membership {}
export interface ModApplication {
  id: number; communityId: number; applicantId: number; reason: string;
  status: "pending" | "approved" | "rejected"; createdAt: string;
  applicant?: { id: number; name: string; hometown: string; currentCity: string; avatarUrl: string };
}
export interface ReportItem {
  id: number; reason: string; status: "pending" | "dismissed" | "resolved"; createdAt: string;
  reporter?: { id: number; name: string } | null;
  post?: (Post & { community?: { id: number; name: string } | null }) | null;
  comment?: (CommentItem) | null;
}
export interface AdminStats {
  totalUsers: number; activeCommunities: number; pendingCommunities: number;
  totalPosts: number; postsToday: number; totalEvents: number; openReports: number;
}
export interface ChartPoint { day: string; value: number }

// --- Token storage ----------------------------------------------------------
// 👉 CONCEPT: we keep the JWT in localStorage so it survives page refreshes.
//    (Trade-off vs cookies: simpler to understand; fine for a learning app.)
const TOKEN_KEY = "hh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// --- The single fetch wrapper ------------------------------------------------
interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;          // plain object → sent as JSON
  formData?: FormData;     // for file uploads
}

/** Call the API. Resolves with { data, message }. Throws Error(message) on failure. */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<{ data: T; message: string }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // browser sets the multipart boundary itself
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, { method: options.method ?? "GET", headers, body });
  } catch {
    throw new Error("Can't reach the server. Check your internet connection.");
  }

  const json = (await response.json().catch(() => null)) as
    | { success: boolean; message: string; data: unknown }
    | null;

  if (!json) throw new Error("The server returned an unexpected response.");
  if (!json.success) throw new Error(json.message || "Something went wrong.");
  return { data: json.data as T, message: json.message };
}

/** Upload one image file → returns its URL. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api<{ url: string }>("/api/upload", { method: "POST", formData });
  return data.url;
}

/** Build initials (e.g. "Priya Sharma" → "PS") for the CSS avatar fallback. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
