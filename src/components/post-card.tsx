"use client";
// ============================================================================
// POST CARD — one post in the community feed: author header, content, image,
// like / comment / share buttons, and (for moderators) pin & delete.
// Comments load lazily the first time you open the thread ("lazy loading":
// only fetch data when it's actually needed → faster pages).
// ============================================================================

import { useState } from "react";
import {
  Heart, MessageCircle, Share2, Pin, PinOff, Trash2, Flag, Megaphone, SendHorizonal, Loader2,
} from "lucide-react";
import Avatar from "@/components/avatar";
import { useToast } from "@/components/toaster";
import { useAuth } from "@/components/auth-provider";
import { api, type Post, type CommentItem } from "@/lib/client";
import { timeAgo } from "@/lib/format";

interface Props {
  post: Post;
  communityId: number;
  canModerate: boolean;          // show pin/delete controls
  onChanged: (post: Post) => void;  // parent updates its list
  onDeleted: (postId: number) => void;
}

export default function PostCard({ post, communityId, canModerate, onChanged, onDeleted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null); // null = not loaded yet
  const [commentText, setCommentText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // --- Like / unlike --------------------------------------------------------
  const toggleLike = async () => {
    if (!user) return toast("Log in to like posts.", "error");
    // Optimistic update: change the UI instantly, then reconcile with server.
    const optimistic: Post = {
      ...post,
      likedByMe: !post.likedByMe,
      likeCount: post.likeCount + (post.likedByMe ? -1 : 1),
    };
    onChanged(optimistic);
    try {
      const { data } = await api<{ liked: boolean; likeCount?: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      onChanged({ ...optimistic, likedByMe: data.liked, likeCount: data.likeCount ?? optimistic.likeCount });
    } catch (error) {
      onChanged(post); // rollback
      toast((error as Error).message, "error");
    }
  };

  // --- Comments ---------------------------------------------------------------
  const openComments = async () => {
    const opening = !showComments;
    setShowComments(opening);
    if (opening && comments === null) {
      try {
        const { data } = await api<{ comments: CommentItem[] }>(`/api/posts/${post.id}/comments`);
        setComments(data.comments);
      } catch (error) {
        toast((error as Error).message, "error");
      }
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const { data } = await api<{ comment: CommentItem }>(`/api/posts/${post.id}/comments`, {
        method: "POST", body: { content: commentText.trim() },
      });
      setComments((list) => [...(list ?? []), data.comment]);
      setCommentText("");
      onChanged({ ...post, commentCount: post.commentCount + 1 });
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      await api(`/api/comments/${commentId}`, { method: "DELETE" });
      setComments((list) => (list ?? []).filter((c) => c.id !== commentId));
      onChanged({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
      toast("Comment deleted.");
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  // --- Share (copy link) -------------------------------------------------------
  const share = async () => {
    const url = `${window.location.origin}/communities/${communityId}#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied — paste it anywhere to share this post.");
    } catch {
      toast(url); // clipboard blocked → show the link so it can be copied manually
    }
  };

  // --- Report ------------------------------------------------------------------
  const sendReport = async () => {
    if (!reportReason.trim()) return toast("Please write a short reason.", "error");
    setBusy(true);
    try {
      const { message } = await api("/api/reports", {
        method: "POST", body: { postId: post.id, reason: reportReason.trim() },
      });
      toast(message);
      setShowReport(false);
      setReportReason("");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  // --- Moderation ----------------------------------------------------------------
  const togglePin = async () => {
    try {
      const { data, message } = await api<{ post: Post }>(`/api/posts/${post.id}`, {
        method: "PATCH", body: { action: "pin" },
      });
      onChanged({ ...post, isPinned: data.post.isPinned });
      toast(message);
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onDeleted(post.id);
      toast("Post deleted.");
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  const canDelete = canModerate || user?.id === post.authorId;

  return (
    <article
      id={`post-${post.id}`}
      className={`animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-warm transition-shadow hover:shadow-warm-lg ${
        post.isPinned ? "border-ember/30 ring-1 ring-ember/20" : "border-ink/10"
      }`}
    >
      {/* Header: author + badges + actions */}
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <Avatar name={post.author?.name ?? "?"} url={post.author?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{post.author?.name}</p>
          <p className="text-xs text-ink/50">
            {post.author?.hometown ? `${post.author.hometown} • ` : ""}{timeAgo(post.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {post.type === "announcement" && (
            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold-deep">
              <Megaphone className="h-3 w-3" /> Announcement
            </span>
          )}
          {post.isPinned && (
            <span className="flex items-center gap-1 rounded-full bg-ember/10 px-2.5 py-1 text-[11px] font-semibold text-ember">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          {canModerate && (
            <button onClick={togglePin} title={post.isPinned ? "Unpin" : "Pin to top"} className="rounded-full p-2 text-ink/40 hover:bg-ink/5 hover:text-ember">
              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
          {canDelete && (
            <button onClick={deletePost} title="Delete post" className="rounded-full p-2 text-ink/40 hover:bg-ink/5 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="whitespace-pre-line px-4 pb-1 pt-3 text-[15px] leading-relaxed text-ink/90 sm:px-5">
          {post.content}
        </p>
      )}
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="Post image" loading="lazy" className="mt-3 max-h-105 w-full object-cover" />
      )}

      {/* Action bar */}
      <div className="mt-2 flex items-center gap-1 border-t border-ink/5 px-2 py-1.5 sm:px-3">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            post.likedByMe ? "text-ember" : "text-ink/55 hover:bg-ember/5 hover:text-ember"
          }`}
        >
          <Heart className={`h-4.5 w-4.5 ${post.likedByMe ? "fill-ember" : ""}`} />
          {post.likeCount > 0 && post.likeCount} Like{post.likeCount === 1 ? "" : "s"}
        </button>
        <button
          onClick={openComments}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <MessageCircle className="h-4.5 w-4.5" />
          {post.commentCount > 0 && post.commentCount} Comment{post.commentCount === 1 ? "" : "s"}
        </button>
        <button
          onClick={share}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Share2 className="h-4.5 w-4.5" /> Share
        </button>
        <button
          onClick={() => setShowReport((v) => !v)}
          title="Report this post"
          className="ml-auto rounded-full p-2 text-ink/35 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {/* Inline report box */}
      {showReport && (
        <div className="border-t border-ink/5 bg-red-50/50 px-4 py-3 sm:px-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Report to platform admins</p>
          <div className="flex gap-2">
            <input
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What's wrong with this post?"
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
            />
            <button
              onClick={sendReport}
              disabled={busy}
              className="shrink-0 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Comments thread */}
      {showComments && (
        <div className="border-t border-ink/5 bg-paper/60 px-4 py-4 sm:px-5">
          {comments === null ? (
            <div className="flex items-center gap-2 py-2 text-sm text-ink/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <p className="py-1 text-sm text-ink/50">No comments yet — start the conversation.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-2.5">
                  <Avatar name={comment.author?.name ?? "?"} url={comment.author?.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 shadow-warm">
                    <p className="flex items-baseline gap-2 text-xs">
                      <span className="font-semibold text-ink">{comment.author?.name}</span>
                      <span className="text-ink/40">{timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-sm text-ink/85">{comment.content}</p>
                  </div>
                  {(comment.authorId === user?.id || canModerate) && (
                    <button onClick={() => deleteComment(comment.id)} title="Delete comment" className="mt-1.5 rounded-full p-1.5 text-ink/30 hover:bg-white hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {user && (
            <div className="mt-3 flex items-center gap-2">
              <Avatar name={user.name} url={user.avatarUrl} size="sm" />
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Write a comment…"
                className="w-full rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-ember"
              />
              <button
                onClick={addComment}
                disabled={busy || !commentText.trim()}
                className="shrink-0 rounded-full bg-ink p-2 text-paper transition-colors hover:bg-ember disabled:opacity-40"
                aria-label="Send comment"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
