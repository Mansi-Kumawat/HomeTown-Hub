"use client";
// ============================================================================
// ADMIN DASHBOARD — the Platform Admin's control room. Tabs:
//   Overview     → stat cards + a 7-day posts bar chart
//   Communities  → approve/reject pending hubs, delete any hub
//   Users        → search, change roles, activate/deactivate accounts
//   Reports      → abuse queue: dismiss a report or delete the content
//   Categories   → add / rename / delete community categories
// Only user.role === "admin" can open this page (the API double-checks too).
// ============================================================================

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Flag, Tags, Search, Loader2,
  CheckCircle2, XCircle, Trash2, ShieldCheck, TrendingUp, CalendarDays,
  MessagesSquare, UserX, UserCheck2, AlertTriangle,
} from "lucide-react";
import {
  api, type AdminStats, type ChartPoint, type Community, type User, type ReportItem, type Category,
} from "@/lib/client";
import { useRequireAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { Spinner, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";

type Tab = "overview" | "communities" | "users" | "reports" | "categories";

function AdminInner() {
  const user = useRequireAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "overview");

  useEffect(() => {
    const wanted = searchParams.get("tab") as Tab | null;
    if (wanted) setTab(wanted);
  }, [searchParams]);

  if (!user) return <Spinner label="Checking your login…" />;
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={ShieldCheck}
          title="Admins only"
          hint="This dashboard is reserved for platform administrators."
          action={<Link href="/communities" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ember">Back to communities</Link>}
        />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "communities", label: "Communities", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "categories", label: "Categories", icon: Tags },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Admin dashboard</h1>
      <p className="mt-1 text-ink/60">Platform health, approvals, people and moderation.</p>

      <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-ink/10 bg-paper/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
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

      <div className="mt-8">
        {tab === "overview" && <OverviewTab goTo={setTab} />}
        {tab === "communities" && <CommunitiesTab />}
        {tab === "users" && <UsersTab me={user} />}
        {tab === "reports" && <ReportsTab />}
        {tab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OVERVIEW — stat cards + 7-day activity chart
// ---------------------------------------------------------------------------
function OverviewTab({ goTo }: { goTo: (tab: Tab) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);

  useEffect(() => {
    api<{ stats: AdminStats; chart: ChartPoint[] }>("/api/admin/stats")
      .then(({ data }) => { setStats(data.stats); setChart(data.chart); })
      .catch(() => setStats(null));
  }, []);

  if (!stats) return <Spinner label="Crunching numbers…" />;

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users, tone: "text-ink" },
    { label: "Active communities", value: stats.activeCommunities, icon: Building2, tone: "text-leaf" },
    { label: "Posts today", value: stats.postsToday, icon: MessagesSquare, tone: "text-ember" },
    { label: "Total posts", value: stats.totalPosts, icon: TrendingUp, tone: "text-ink" },
    { label: "Events", value: stats.totalEvents, icon: CalendarDays, tone: "text-leaf" },
    { label: "Pending hubs", value: stats.pendingCommunities, icon: AlertTriangle, tone: "text-gold-deep" },
    { label: "Open reports", value: stats.openReports, icon: Flag, tone: "text-red-600" },
  ];
  const max = Math.max(1, ...chart.map((c) => c.value));

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-5 shadow-warm" style={{ animationDelay: `${i * 60}ms` }}>
            <c.icon className={`h-5 w-5 ${c.tone}`} />
            <p className="mt-3 font-display text-3xl font-semibold text-ink">{c.value}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink/45">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Chart: posts per day, last 7 days (pure CSS bars — no chart library) */}
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-warm">
        <h2 className="font-display text-lg font-semibold text-ink">Posts — last 7 days</h2>
        <div className="mt-6 flex h-44 items-end gap-3 sm:gap-5">
          {chart.map((point) => (
            <div key={point.day} className="group flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100">{point.value}</span>
              <div
                className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-ember/80 to-gold/70 transition-all hover:from-ember hover:to-gold"
                style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
                title={`${point.value} posts`}
              />
              <span className="text-[11px] text-ink/45">{point.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => goTo("communities")} className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-ember">
          Review pending hubs{stats.pendingCommunities > 0 ? ` (${stats.pendingCommunities})` : ""}
        </button>
        <button onClick={() => goTo("reports")} className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-ember">
          Open report queue{stats.openReports > 0 ? ` (${stats.openReports})` : ""}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMMUNITIES — approvals + management
// ---------------------------------------------------------------------------
function CommunitiesTab() {
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ communities: Community[] }>("/api/communities?status=all&limit=24");
      // Pending first, then approved, then rejected.
      const order = { pending: 0, approved: 1, rejected: 2 };
      setCommunities(data.communities.sort((a, b) => order[a.status] - order[b.status]));
    } catch (error) {
      toast((error as Error).message, "error");
      setCommunities([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const decide = async (community: Community, status: "approved" | "rejected") => {
    setBusyId(community.id);
    try {
      const { message } = await api(`/api/communities/${community.id}`, { method: "PATCH", body: { status } });
      toast(message);
      setCommunities((list) => (list ?? []).map((c) => (c.id === community.id ? { ...c, status } : c)));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (community: Community) => {
    if (!window.confirm(`Delete “${community.name}” and ALL its posts, events and members?`)) return;
    setBusyId(community.id);
    try {
      await api(`/api/communities/${community.id}`, { method: "DELETE" });
      toast("Community deleted.");
      setCommunities((list) => (list ?? []).filter((c) => c.id !== community.id));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (communities === null) return <Spinner label="Loading communities…" />;
  if (communities.length === 0) return <EmptyState icon={Building2} title="No communities on the platform yet" />;

  const statusChip = (status: Community["status"]) =>
    status === "pending"
      ? "bg-gold/15 text-gold-deep"
      : status === "approved"
        ? "bg-leaf/10 text-leaf"
        : "bg-red-50 text-red-600";

  return (
    <ul className="space-y-3">
      {communities.map((c) => (
        <li key={c.id} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-4 shadow-warm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold text-ink">{c.name}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusChip(c.status)}`}>{c.status}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink/50">
                {c.city} · {c.memberCount} members · by {c.creator?.name ?? "unknown"} · {timeAgo(c.createdAt)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-ink/65">{c.description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/communities/${c.id}`} className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-ink/40">
                View
              </Link>
              {c.status !== "approved" && (
                <button onClick={() => decide(c, "approved")} disabled={busyId === c.id} className="flex items-center gap-1 rounded-full bg-leaf px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-leaf/90 disabled:opacity-50">
                  {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                </button>
              )}
              {c.status !== "rejected" && (
                <button onClick={() => decide(c, "rejected")} disabled={busyId === c.id} className="flex items-center gap-1 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              )}
              <button onClick={() => remove(c)} disabled={busyId === c.id} className="rounded-full p-2 text-ink/40 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Delete community">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// USERS — search, roles, activate/deactivate
// ---------------------------------------------------------------------------
function UsersTab({ me }: { me: User }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (q: string, pageToLoad: number, append: boolean) => {
    try {
      const params = new URLSearchParams({ page: String(pageToLoad) });
      if (q) params.set("q", q);
      const { data } = await api<{ users: User[]; hasMore: boolean }>(`/api/admin/users?${params}`);
      setUsers((list) => (append ? [...(list ?? []), ...data.users] : data.users));
      setHasMore(data.hasMore);
      setPage(pageToLoad);
    } catch (error) {
      toast((error as Error).message, "error");
      setUsers([]);
    }
  }, [toast]);

  useEffect(() => { load("", 1, false); }, [load]);

  const updateUser = async (target: User, body: { isActive?: boolean; role?: string }, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(target.id);
    try {
      const { data, message } = await api<{ user: User }>(`/api/admin/users/${target.id}`, { method: "PATCH", body });
      toast(message);
      setUsers((list) => (list ?? []).map((u) => (u.id === target.id ? data.user : u)));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (users === null) return <Spinner label="Loading users…" />;

  return (
    <div>
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query, 1, false)}
          placeholder="Search by name or email, then press Enter"
          className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ember"
        />
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users match your search" />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className={`animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-warm ${u.isActive ? "border-ink/10" : "border-red-200 bg-red-50/40"}`}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  {u.name} {u.id === me.id && <span className="text-xs font-normal text-ink/40">(you)</span>}
                  {!u.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">deactivated</span>}
                </p>
                <p className="text-xs text-ink/50">{u.email} · joined {timeAgo(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {busyId === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink/40" />
                ) : (
                  <>
                    <select
                      value={u.role}
                      disabled={u.id === me.id}
                      onChange={(e) => updateUser(u, { role: e.target.value }, `Change ${u.name}'s role to ${e.target.value}?`)}
                      className="rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-medium text-ink outline-none disabled:opacity-50"
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    {u.id !== me.id && (
                      u.isActive ? (
                        <button
                          onClick={() => updateUser(u, { isActive: false }, `Deactivate ${u.name}? They won't be able to log in.`)}
                          className="flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-red-300 hover:text-red-600"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUser(u, { isActive: true })}
                          className="flex items-center gap-1 rounded-full bg-leaf px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf/90"
                        >
                          <UserCheck2 className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="mt-6 text-center">
          <button onClick={() => load(query, page + 1, true)} className="rounded-full border border-ink/15 bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:border-ink/35">
            Load more users
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// REPORTS — abuse queue
// ---------------------------------------------------------------------------
function ReportsTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ reports: ReportItem[] }>("/api/reports?status=pending");
      setReports(data.reports);
    } catch (error) {
      toast((error as Error).message, "error");
      setReports([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (report: ReportItem, action: "dismiss" | "deleteContent") => {
    if (action === "deleteContent" && !window.confirm("Permanently delete the reported content?")) return;
    setBusyId(report.id);
    try {
      const { message } = await api(`/api/reports/${report.id}`, { method: "PATCH", body: { action } });
      toast(message);
      setReports((list) => (list ?? []).filter((r) => r.id !== report.id));
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (reports === null) return <Spinner label="Loading reports…" />;
  if (reports.length === 0) {
    return <EmptyState icon={Flag} title="The queue is clear" hint="When members report posts or comments, they'll show up here for review." />;
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const isPost = !!r.post;
        const contentPreview = isPost ? r.post?.content : r.comment?.content;
        const authorName = isPost ? r.post?.author?.name : r.comment?.author?.name;
        return (
          <li key={r.id} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-4 shadow-warm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                    Reported {isPost ? "post" : "comment"}
                  </span>
                  <span className="text-ink/50">by {r.reporter?.name ?? "someone"} · {timeAgo(r.createdAt)}</span>
                </p>
                <p className="mt-2 text-sm text-ink">
                  <span className="font-semibold">Reason:</span> {r.reason}
                </p>
                {contentPreview ? (
                  <blockquote className="mt-2 rounded-xl border-l-4 border-ink/15 bg-paper/70 px-4 py-3 text-sm italic text-ink/65">
                    {authorName && <span className="not-italic font-semibold">{authorName}: </span>}
                    “{contentPreview.slice(0, 220)}”
                  </blockquote>
                ) : (
                  <p className="mt-2 text-sm italic text-ink/45">(The content was already removed.)</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {isPost && r.post?.community && (
                  <Link href={`/communities/${r.post.community.id}`} className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-ink/40">
                    Open hub
                  </Link>
                )}
                <button onClick={() => resolve(r, "dismiss")} disabled={busyId === r.id} className="flex items-center gap-1 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-leaf hover:text-leaf disabled:opacity-50">
                  {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Dismiss
                </button>
                <button onClick={() => resolve(r, "deleteContent")} disabled={busyId === r.id} className="flex items-center gap-1 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete content
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// CATEGORIES — add / rename / delete
// ---------------------------------------------------------------------------
function CategoriesTab() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ categories: Category[] }>("/api/categories");
      setCategories(data.categories);
    } catch (error) {
      toast((error as Error).message, "error");
      setCategories([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { message } = await api("/api/categories", { method: "POST", body: { name: name.trim() } });
      toast(message);
      setName("");
      load();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const rename = async (category: Category) => {
    if (!editingName.trim()) return;
    try {
      const { message } = await api(`/api/categories/${category.id}`, { method: "PATCH", body: { name: editingName.trim() } });
      toast(message);
      setEditingId(null);
      load();
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Delete the “${category.name}” category? Communities keep working but lose this tag.`)) return;
    try {
      await api(`/api/categories/${category.id}`, { method: "DELETE" });
      toast("Category deleted.");
      load();
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  if (categories === null) return <Spinner label="Loading categories…" />;

  return (
    <div className="max-w-2xl">
      {/* Add form */}
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name — e.g. “Jobs & Housing”"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ember"
        />
        <button type="submit" disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ember disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />} Add
        </button>
      </form>

      {/* List */}
      <ul className="mt-5 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-warm">
            {editingId === c.id ? (
              <div className="flex flex-1 gap-2">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rename(c)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-ember"
                  autoFocus
                />
                <button onClick={() => rename(c)} className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5">Cancel</button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-ink/45">{c.communityCount ?? 0} communities use this tag</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingId(c.id); setEditingName(c.name); }}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-ink/5"
                  >
                    Rename
                  </button>
                  <button onClick={() => remove(c)} className="rounded-full p-2 text-ink/40 hover:bg-red-50 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Spinner label="Loading dashboard…" />}>
      <AdminInner />
    </Suspense>
  );
}
