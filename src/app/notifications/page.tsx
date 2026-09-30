"use client";
// NOTIFICATIONS PAGE — the bell inbox: newest first, unread highlighted.
// "Mark all read" clears the badge; clicking an item jumps to its link.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing, CheckCheck, MessagesSquare, Megaphone, CalendarDays, CheckCircle2,
  XCircle, MessageCircle, Heart, Handshake, Flag, Landmark, UserPlus,
} from "lucide-react";
import { api, type NotificationItem } from "@/lib/client";
import { useRequireAuth, useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { Spinner, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";

// Map notification "type" → an icon + accent color.
const ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  new_post: { icon: MessagesSquare, className: "bg-ink/5 text-ink" },
  announcement: { icon: Megaphone, className: "bg-gold/15 text-gold-deep" },
  new_event: { icon: CalendarDays, className: "bg-leaf/10 text-leaf" },
  event_cancelled: { icon: CalendarDays, className: "bg-red-50 text-red-600" },
  join_request: { icon: UserPlus, className: "bg-ember/10 text-ember" },
  join_approved: { icon: CheckCircle2, className: "bg-leaf/10 text-leaf" },
  join_rejected: { icon: XCircle, className: "bg-red-50 text-red-600" },
  new_comment: { icon: MessageCircle, className: "bg-ink/5 text-ink" },
  new_like: { icon: Heart, className: "bg-ember/10 text-ember" },
  moderator_application: { icon: Handshake, className: "bg-leaf/10 text-leaf" },
  moderator_approved: { icon: Handshake, className: "bg-leaf/10 text-leaf" },
  moderator_rejected: { icon: Handshake, className: "bg-red-50 text-red-600" },
  community_pending: { icon: Landmark, className: "bg-gold/15 text-gold-deep" },
  community_approved: { icon: Landmark, className: "bg-leaf/10 text-leaf" },
  community_rejected: { icon: Landmark, className: "bg-red-50 text-red-600" },
  new_report: { icon: Flag, className: "bg-red-50 text-red-600" },
};

export default function NotificationsPage() {
  const user = useRequireAuth();
  const { refreshNotifications } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ notifications: NotificationItem[] }>("/api/notifications");
      setItems(data.notifications);
    } catch (error) {
      toast((error as Error).message, "error");
      setItems([]);
    }
  }, [toast]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api("/api/notifications", { method: "PATCH", body: {} });
      setItems((list) => (list ?? []).map((n) => ({ ...n, isRead: true })));
      await refreshNotifications(); // clears the navbar badge
      toast("All caught up!");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((list) => (list ?? []).map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      api("/api/notifications", { method: "PATCH", body: { ids: [item.id] } })
        .then(() => refreshNotifications())
        .catch(() => {});
    }
    if (item.link) router.push(item.link);
  };

  if (!user) return <Spinner label="Checking your login…" />;

  const unread = (items ?? []).filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink/55">
            {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead} disabled={busy}
            className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/35 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4 text-leaf" /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-6">
        {items === null ? (
          <Spinner label="Loading notifications…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No notifications yet"
            hint="When someone posts in your community, comments on your post, or approves your request — it'll land here."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const meta = ICONS[item.type] ?? { icon: BellRing, className: "bg-ink/5 text-ink" };
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-warm ${
                      item.isRead ? "border-ink/10 bg-white/70" : "border-ember/25 bg-white shadow-warm"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm leading-snug ${item.isRead ? "text-ink/70" : "font-medium text-ink"}`}>
                        {item.message}
                      </span>
                      <span className="mt-1 block text-xs text-ink/40">{timeAgo(item.createdAt)}</span>
                    </span>
                    {!item.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ember" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
