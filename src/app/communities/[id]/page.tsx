"use client";
// ============================================================================
// COMMUNITY PAGE — the hub's home: cover header, join button, and tabs:
//   Feed     → composer + posts (pinned first), like/comment/share
//   Events   → create + RSVP + manage events
//   Members  → approved member list with role badges
//   About    → description, rules, and "become a moderator" application
//   Moderation (leaders only) → join requests + moderator applications
// ============================================================================

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  MapPin, Users, CalendarDays, ShieldCheck, BookOpen, Loader2, ImagePlus, X,
  Megaphone, PlusCircle, CheckCircle2, XCircle, Clock3, Handshake, Landmark,
  MessagesSquare, Trash2, PencilLine, UserCheck,
} from "lucide-react";
import {
  api, uploadImage, type Community, type Membership, type Post, type EventItem,
  type JoinRequest, type ModApplication,
} from "@/lib/client";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { Spinner, EmptyState } from "@/components/ui";
import PostCard from "@/components/post-card";
import Avatar from "@/components/avatar";
import { formatEventDate, isUpcoming, timeAgo } from "@/lib/format";

type Tab = "feed" | "events" | "members" | "about" | "moderation";

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------
function CommunityPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const communityId = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "feed");
  const [busyJoin, setBusyJoin] = useState(false);

  const isMember = membership?.status === "approved" || user?.role === "admin";

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ community: Community; myMembership: Membership | null; canModerate: boolean }>(
        `/api/communities/${communityId}`
      );
      setCommunity(data.community);
      setMembership(data.myMembership);
      setCanModerate(data.canModerate);
    } catch (error) {
      setNotFound((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  // Keep the tab in sync with ?tab= links (e.g. from notifications).
  useEffect(() => {
    const wanted = searchParams.get("tab") as Tab | null;
    if (wanted) setTab(wanted);
  }, [searchParams]);

  // --- Join / Leave ----------------------------------------------------------
  const join = async () => {
    if (!user) return toast("Log in to join this community.", "error");
    setBusyJoin(true);
    try {
      const { message } = await api(`/api/communities/${communityId}/join`, { method: "POST" });
      toast(message);
      setMembership({ id: -1, communityId, userId: user.id, status: "pending", communityRole: "member", createdAt: new Date().toISOString() });
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyJoin(false);
    }
  };

  const leave = async () => {
    if (!window.confirm("Leave this community?")) return;
    try {
      await api(`/api/communities/${communityId}/join`, { method: "DELETE" });
      toast("You left the community.");
      setMembership(null);
      setCommunity((c) => (c ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c));
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  if (loading) return <Spinner label="Opening the hub…" />;
  if (notFound || !community) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState icon={MapPin} title={notFound ?? "Community not found"} hint="It may have been removed, or is still waiting for approval."
          action={<Link href="/communities" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ember">Back to Explore</Link>} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "feed", label: "Feed", icon: MessagesSquare },
    { id: "events", label: "Events", icon: CalendarDays },
    { id: "members", label: "Members", icon: Users },
    { id: "about", label: "About", icon: BookOpen },
  ];
  if (canModerate) tabs.push({ id: "moderation", label: "Moderation", icon: ShieldCheck });

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative h-52 overflow-hidden sm:h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={community.imageUrl || "/images/hero.jpg"} alt={community.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 pb-5 sm:px-6">
          <div className="text-white">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {community.category && <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">{community.category.name}</span>}
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur"><MapPin className="h-3 w-3" /> {community.city}</span>
              {community.status !== "approved" && (
                <span className="rounded-full bg-gold px-2.5 py-1 text-ink">Waiting for admin approval</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{community.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <Users className="h-4 w-4" /> {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
              {community.creator && <> · founded by {community.creator.name}</>}
            </p>
          </div>

          {/* Join state button */}
          <div>
            {!isMember && membership?.status !== "pending" && (
              <button onClick={join} disabled={busyJoin} className="flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white shadow-warm-lg transition-colors hover:bg-ember-deep disabled:opacity-60">
                {busyJoin ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {membership?.status === "rejected" ? "Request again" : "Request to join"}
              </button>
            )}
            {membership?.status === "pending" && (
              <span className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur">
                <Clock3 className="h-4 w-4" /> Request pending
              </span>
            )}
            {isMember && membership?.communityRole !== "creator" && (
              <button onClick={leave} className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Leave community
              </button>
            )}
            {membership?.communityRole === "creator" && (
              <span className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink">
                <Landmark className="h-4 w-4" /> You're the founder
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TABS                                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="sticky top-16 z-30 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TAB CONTENT                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {community.status !== "approved" ? (
          <EmptyState
            icon={Clock3}
            title="This hub is under review"
            hint="A platform admin will approve it soon. Come back in a little while!"
          />
        ) : (
          <>
            {tab === "feed" && (
              <FeedTab community={community} isMember={!!isMember} canModerate={canModerate} />
            )}
            {tab === "events" && (
              <EventsTab communityId={community.id} isMember={!!isMember} canModerate={canModerate} />
            )}
            {tab === "members" && <MembersTab communityId={community.id} />}
            {tab === "about" && (
              <AboutTab community={community} membership={membership} isMember={!!isMember} />
            )}
            {tab === "moderation" && canModerate && (
              <ModerationTab community={community} onMemberCount={(n) => setCommunity((c) => (c ? { ...c, memberCount: n } : c))} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FEED TAB — composer + paginated post list
// ---------------------------------------------------------------------------
function FeedTab({ community, isMember, canModerate }: { community: Community; isMember: boolean; canModerate: boolean }) {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Composer state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async (pageToLoad: number, append: boolean) => {
    if (append) setLoadingMore(true);
    try {
      const { data } = await api<{ posts: Post[]; hasMore: boolean }>(
        `/api/communities/${community.id}/posts?page=${pageToLoad}&limit=8`
      );
      setPosts((list) => (append ? [...(list ?? []), ...data.posts] : data.posts));
      setHasMore(data.hasMore);
      setPage(pageToLoad);
    } catch (error) {
      toast((error as Error).message, "error");
      setPosts([]);
    } finally {
      setLoadingMore(false);
    }
  }, [community.id, toast]);

  useEffect(() => { loadPosts(1, false); }, [loadPosts]);

  const onChanged = (next: Post) => setPosts((list) => (list ?? []).map((p) => (p.id === next.id ? next : p)));
  const onDeleted = (id: number) => setPosts((list) => (list ?? []).filter((p) => p.id !== id));

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const publish = async () => {
    if (!content.trim() && !imageUrl) return toast("Write something or add a photo first.", "error");
    setPosting(true);
    try {
      const { data } = await api<{ post: Post }>(`/api/communities/${community.id}/posts`, {
        method: "POST",
        body: { content: content.trim(), imageUrl, type: isAnnouncement ? "announcement" : "normal" },
      });
      setPosts((list) => [data.post, ...(list ?? [])]);
      setContent(""); setImageUrl(""); setIsAnnouncement(false);
      toast("Posted to the feed!");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Composer (members only) */}
      {isMember ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-warm sm:p-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={`Share something with ${community.city}…`}
            className="w-full resize-none rounded-xl bg-paper/70 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ember/30"
          />
          {imageUrl && (
            <div className="relative mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Attachment" className="max-h-56 w-full rounded-xl object-cover" />
              <button onClick={() => setImageUrl("")} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-white hover:bg-ink" aria-label="Remove image">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-ink/5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
            {canModerate && (
              <label className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isAnnouncement ? "bg-gold/15 text-gold-deep" : "text-ink/60 hover:bg-ink/5"}`}>
                <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} className="hidden" />
                <Megaphone className="h-4 w-4" /> Announcement
              </label>
            )}
            <button
              onClick={publish}
              disabled={posting || uploading}
              className="ml-auto flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ember disabled:opacity-50"
            >
              {posting && <Loader2 className="h-4 w-4 animate-spin" />} Post
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-ink/20 bg-white/60 px-5 py-4 text-center text-sm text-ink/55">
          Join this community to post, like and comment.
        </p>
      )}

      {/* Post list */}
      {posts === null ? (
        <Spinner label="Loading the feed…" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Quiet in here…"
          hint={isMember ? "Be the first to share news, a photo, or a memory from home." : "Nothing posted yet. Join and say hello!"}
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} communityId={community.id} canModerate={canModerate} onChanged={onChanged} onDeleted={onDeleted} />
          ))}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => loadPosts(page + 1, true)}
                disabled={loadingMore}
                className="rounded-full border border-ink/15 bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:border-ink/35 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load older posts"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EVENTS TAB — create + list + RSVP + manage
// ---------------------------------------------------------------------------
function EventsTab({ communityId, isMember, canModerate }: { communityId: number; isMember: boolean; canModerate: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ title: "", description: "", location: "", eventDate: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ events: EventItem[] }>(`/api/communities/${communityId}/events`);
      setEvents(data.events);
    } catch (error) {
      toast((error as Error).message, "error");
      setEvents([]);
    }
  }, [communityId, toast]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", location: "", eventDate: "" });
    setShowForm(true);
  };

  const startEdit = (event: EventItem) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description,
      location: event.location,
      eventDate: new Date(new Date(event.eventDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/events/${editing.id}`, { method: "PATCH", body: { ...form, eventDate: new Date(form.eventDate).toISOString() } });
        toast("Event updated.");
      } else {
        await api(`/api/communities/${communityId}/events`, { method: "POST", body: { ...form, eventDate: new Date(form.eventDate).toISOString() } });
        toast("Event created! The community has been notified.");
      }
      setShowForm(false);
      load();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const rsvp = async (event: EventItem) => {
    // Optimistic toggle
    setEvents((list) => (list ?? []).map((e) => (e.id === event.id
      ? { ...e, joinedByMe: !e.joinedByMe, attendeeCount: e.attendeeCount + (e.joinedByMe ? -1 : 1) }
      : e)));
    try {
      const { data, message } = await api<{ joined: boolean; attendeeCount: number }>(`/api/events/${event.id}/rsvp`, { method: "POST" });
      setEvents((list) => (list ?? []).map((e) => (e.id === event.id ? { ...e, joinedByMe: data.joined, attendeeCount: data.attendeeCount } : e)));
      toast(message);
    } catch (error) {
      load(); // rollback by refetching truth
      toast((error as Error).message, "error");
    }
  };

  const remove = async (event: EventItem) => {
    if (!window.confirm(`Cancel “${event.title}”?`)) return;
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      setEvents((list) => (list ?? []).filter((e) => e.id !== event.id));
      toast("Event cancelled.");
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  const upcoming = (events ?? []).filter((e) => isUpcoming(e.eventDate));
  const past = (events ?? []).filter((e) => !isUpcoming(e.eventDate));

  const inputClass = "w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ember";

  const EventCard = ({ event }: { event: EventItem }) => {
    const canManage = canModerate || event.creatorId === user?.id;
    return (
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-warm">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" loading="lazy" className="h-32 w-full object-cover" />
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ember">
                <CalendarDays className="h-3.5 w-3.5" /> {formatEventDate(event.eventDate)}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold text-ink">{event.title}</h3>
            </div>
            {canManage && (
              <div className="flex gap-1">
                <button onClick={() => startEdit(event)} title="Edit" className="rounded-full p-2 text-ink/40 hover:bg-ink/5 hover:text-ink"><PencilLine className="h-4 w-4" /></button>
                <button onClick={() => remove(event)} title="Cancel event" className="rounded-full p-2 text-ink/40 hover:bg-ink/5 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          {event.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55"><MapPin className="h-3.5 w-3.5" /> {event.location}</p>}
          {event.description && <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{event.description}</p>}
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
              <Users className="h-3.5 w-3.5" /> {event.attendeeCount} going
            </span>
            {isMember && (
              <button
                onClick={() => rsvp(event)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  event.joinedByMe ? "bg-leaf/10 text-leaf hover:bg-leaf/20" : "bg-ink text-paper hover:bg-leaf"
                }`}
              >
                <UserCheck className="h-4 w-4" /> {event.joinedByMe ? "Going — tap to leave" : "Join event"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {isMember && (
        <div className="text-right">
          <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ember">
            <PlusCircle className="h-4 w-4" /> Create an event
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="animate-fade-up space-y-3 rounded-2xl border border-ink/10 bg-white p-5 shadow-warm">
          <h3 className="font-display text-lg font-semibold text-ink">{editing ? "Edit event" : "New event"}</h3>
          <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title — e.g. Onam Sadhya Potluck" className={inputClass} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input required type="datetime-local" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} className={inputClass} />
            <input required value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location — venue or landmark" className={inputClass} />
          </div>
          <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What should people know? What to bring?" className={inputClass} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-full bg-ember px-5 py-2 text-sm font-semibold text-white hover:bg-ember-deep disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Create event"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full px-5 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5">Cancel</button>
          </div>
        </form>
      )}

      {events === null ? (
        <Spinner label="Loading events…" />
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" hint={isMember ? "Organize the first get-together — a cleanup drive, a match screening, a potluck." : "Join the community to see and create events."} />
      ) : (
        <>
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
          {past.length > 0 && (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink/40">Past events</p>
              {past.map((e) => (
                <div key={e.id} className="opacity-60"><EventCard event={e} /></div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MEMBERS TAB
// ---------------------------------------------------------------------------
function MembersTab({ communityId }: { communityId: number }) {
  const [members, setMembers] = useState<Membership[] | null>(null);

  useEffect(() => {
    api<{ members: Membership[] }>(`/api/communities/${communityId}/members`)
      .then(({ data }) => setMembers(data.members))
      .catch(() => setMembers([]));
  }, [communityId]);

  if (members === null) return <Spinner label="Loading members…" />;
  if (members.length === 0) return <EmptyState icon={Users} title="No members yet" />;

  const badge = (role: string) =>
    role === "creator"
      ? <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-deep"><Landmark className="h-3 w-3" /> Founder</span>
      : role === "moderator"
        ? <span className="flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf"><ShieldCheck className="h-3 w-3" /> Moderator</span>
        : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <div key={m.id} className="animate-fade-up flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-warm">
          <Avatar name={m.user?.name ?? "?"} url={m.user?.avatarUrl} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
              <span className="truncate">{m.user?.name}</span> {badge(m.communityRole)}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {m.user?.hometown ? `From ${m.user.hometown}` : ""}
              {m.user?.hometown && m.user?.currentCity ? " · " : ""}
              {m.user?.currentCity ? `Now in ${m.user.currentCity}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-ink/35">Joined {timeAgo(m.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ABOUT TAB — description, rules, and the "become a moderator" form
// ---------------------------------------------------------------------------
function AboutTab({ community, membership, isMember }: { community: Community; membership: Membership | null; isMember: boolean }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  const canApply =
    isMember && membership?.status === "approved" &&
    membership.communityRole === "member" && !applied;

  const apply = async () => {
    if (reason.trim().length < 10) return toast("Please write a sentence or two about why.", "error");
    setBusy(true);
    try {
      const { message } = await api("/api/moderator-applications", {
        method: "POST", body: { communityId: community.id, reason: reason.trim() },
      });
      toast(message);
      setApplied(true);
      setReason("");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-warm">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><BookOpen className="h-5 w-5 text-ember" /> About this hub</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/75">{community.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink/50">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {community.city}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {community.memberCount} members</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Founded {new Date(community.createdAt).toLocaleDateString()}</span>
        </div>
      </section>

      {community.rules && (
        <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-warm">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><ShieldCheck className="h-5 w-5 text-leaf" /> Community rules</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/75">{community.rules}</p>
        </section>
      )}

      {/* Moderator application */}
      <section className="rounded-2xl border border-dashed border-leaf/30 bg-leaf/5 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><Handshake className="h-5 w-5 text-leaf" /> Become a moderator</h2>
        <p className="mt-2 text-sm text-ink/65">
          Moderators welcome new members, pin announcements and keep the feed friendly.
          The community founder reviews every application.
        </p>
        {applied ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-leaf">
            <CheckCircle2 className="h-4 w-4" /> Application sent! You'll get a notification once it's reviewed.
          </p>
        ) : canApply ? (
          <div className="mt-4 space-y-3">
            <textarea
              rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why would you be a good moderator? (a sentence or two)"
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none focus:border-leaf"
            />
            <button onClick={apply} disabled={busy} className="flex items-center gap-2 rounded-full bg-leaf px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-leaf/90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />} Apply to moderate
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink/50">
            {isMember
              ? "You already help lead this community."
              : "Join the community first — then you can apply from here."}
          </p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODERATION TAB — join requests (mods) + moderator applications (founder)
// ---------------------------------------------------------------------------
function ModerationTab({ community, onMemberCount }: { community: Community; onMemberCount: (n: number) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [applications, setApplications] = useState<ModApplication[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const isFounder = user?.id === community.createdById || user?.role === "admin";

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await api<{ requests: JoinRequest[] }>(`/api/communities/${community.id}/requests`);
      setRequests(data.requests);
    } catch (error) {
      toast((error as Error).message, "error");
      setRequests([]);
    }
  }, [community.id, toast]);

  const loadApplications = useCallback(async () => {
    if (!isFounder) return;
    try {
      const { data } = await api<{ applications: ModApplication[] }>(`/api/moderator-applications?communityId=${community.id}`);
      setApplications(data.applications.filter((a) => a.status === "pending"));
    } catch { setApplications([]); }
  }, [community.id, isFounder]);

  useEffect(() => { loadRequests(); loadApplications(); }, [loadRequests, loadApplications]);

  const decideRequest = async (membershipId: number, action: "approve" | "reject") => {
    setBusyId(membershipId);
    try {
      const { message } = await api(`/api/communities/${community.id}/requests`, {
        method: "PATCH", body: { membershipId, action },
      });
      toast(message);
      setRequests((list) => (list ?? []).filter((r) => r.id !== membershipId));
      if (action === "approve") onMemberCount(community.memberCount + 1);
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const decideApplication = async (applicationId: number, action: "approve" | "reject") => {
    setBusyId(applicationId);
    try {
      const { message } = await api(`/api/moderator-applications/${applicationId}`, { method: "PATCH", body: { action } });
      toast(message);
      setApplications((list) => (list ?? []).filter((a) => a.id !== applicationId));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const DecisionButtons = ({ id, onDecide }: { id: number; onDecide: (id: number, action: "approve" | "reject") => void }) => (
    <div className="flex gap-2">
      <button
        onClick={() => onDecide(id, "approve")} disabled={busyId === id}
        className="flex items-center gap-1 rounded-full bg-leaf px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-leaf/90 disabled:opacity-50"
      >
        {busyId === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
      </button>
      <button
        onClick={() => onDecide(id, "reject")} disabled={busyId === id}
        className="flex items-center gap-1 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Join requests */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Users className="h-5 w-5 text-ember" /> Join requests {requests !== null && requests.length > 0 && <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">{requests.length}</span>}
        </h2>
        {requests === null ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 bg-white/60 px-5 py-6 text-center text-sm text-ink/50">
            No one is waiting at the door right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="animate-fade-up flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-warm">
                <div className="flex items-center gap-3">
                  <Avatar name={r.user?.name ?? "?"} url={r.user?.avatarUrl} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.user?.name}</p>
                    <p className="text-xs text-ink/50">
                      {r.user?.hometown ? `From ${r.user.hometown}` : ""}{r.user?.currentCity ? ` · Now in ${r.user.currentCity}` : ""} · {timeAgo(r.createdAt)}
                    </p>
                  </div>
                </div>
                <DecisionButtons id={r.id} onDecide={decideRequest} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Moderator applications (founder / admin only) */}
      {isFounder && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Handshake className="h-5 w-5 text-leaf" /> Moderator applications
          </h2>
          {applications === null ? (
            <Spinner />
          ) : applications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/20 bg-white/60 px-5 py-6 text-center text-sm text-ink/50">
              No pending applications.
            </p>
          ) : (
            <ul className="space-y-3">
              {applications.map((a) => (
                <li key={a.id} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-4 shadow-warm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.applicant?.name ?? "?"} url={a.applicant?.avatarUrl} />
                      <div>
                        <p className="text-sm font-semibold text-ink">{a.applicant?.name}</p>
                        <p className="text-xs text-ink/50">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                    <DecisionButtons id={a.id} onDecide={decideApplication} />
                  </div>
                  <p className="mt-3 rounded-xl bg-paper/70 px-4 py-3 text-sm italic text-ink/70">“{a.reason}”</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// Next.js requires Suspense around useSearchParams during prerendering.
export default function CommunityPage() {
  return (
    <Suspense fallback={<Spinner label="Opening the hub…" />}>
      <CommunityPageInner />
    </Suspense>
  );
}
