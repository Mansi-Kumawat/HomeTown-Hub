"use client";
// NAVBAR — sticky top bar with brand, main links, the notification bell
// (unread badge), and the account menu. Collapses to a hamburger on mobile.
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Compass, Bell, Menu, X, LogOut, UserRound, ShieldCheck, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { initials } from "@/lib/client";

function Avatar({ name, url, size = "h-8 w-8 text-xs" }: { name: string; url?: string; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} rounded-full object-cover ring-2 ring-white/80`} />;
  }
  return (
    <span className={`${size} flex items-center justify-center rounded-full bg-ember/10 font-semibold text-ember ring-2 ring-white/80`}>
      {initials(name)}
    </span>
  );
}

export default function Navbar() {
  const { user, loading, logout, unreadCount, refreshNotifications } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Refresh the bell whenever we navigate (cheap + always up to date).
  useEffect(() => {
    if (user) refreshNotifications();
    setMobileOpen(false);
  }, [pathname, user, refreshNotifications]);

  const isActive = (href: string) => pathname.startsWith(href);

  const linkClass = (href: string) =>
    `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      isActive(href) ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember text-white shadow-warm transition-transform group-hover:-rotate-6">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Hometown<span className="text-ember">Hub</span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/communities" className={linkClass("/communities")}>
            <Compass className="h-4 w-4" /> Explore
          </Link>
          {user && (
            <Link href="/notifications" className={`${linkClass("/notifications")} relative`}>
              <Bell className="h-4 w-4" /> Alerts
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className={linkClass("/admin")}>
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        {/* Right side: account */}
        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-ink/5" />
          ) : user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-ink/5">
                <Avatar name={user.name} url={user.avatarUrl} />
                <span className="max-w-28 truncate text-sm font-medium text-ink">{user.name.split(" ")[0]}</span>
              </Link>
              <button
                onClick={() => { logout(); router.push("/"); }}
                className="rounded-full p-2 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ember"
                title="Log out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-ink/70 hover:text-ink">
                Log in
              </Link>
              <Link href="/register" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ember">
                Join your hometown
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-lg p-2 text-ink md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav className="animate-fade-up border-t border-ink/10 bg-paper px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/communities" className={linkClass("/communities")}>
              <Compass className="h-4 w-4" /> Explore communities
            </Link>
            {user && (
              <Link href="/notifications" className={linkClass("/notifications")}>
                <Bell className="h-4 w-4" /> Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" className={linkClass("/admin")}>
                <ShieldCheck className="h-4 w-4" /> Admin dashboard
              </Link>
            )}
            {user ? (
              <>
                <Link href="/profile" className={linkClass("/profile")}>
                  <UserRound className="h-4 w-4" /> My profile
                </Link>
                <button
                  onClick={() => { logout(); router.push("/"); }}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-left text-sm font-medium text-ember hover:bg-ember/5"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1 rounded-full border border-ink/15 px-4 py-2 text-center text-sm font-medium text-ink">
                  Log in
                </Link>
                <Link href="/register" className="flex-1 rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-paper">
                  Join now
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

/** Shared small footer used on every page. */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-paper-deep/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink/50 sm:flex-row sm:px-6">
        <p className="flex items-center gap-2 font-display text-base text-ink/70">
          <MapPin className="h-4 w-4 text-ember" /> Hometown Hub — carry your hometown in your pocket.
        </p>
        <p className="flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" /> Built with Next.js, PostgreSQL & Drizzle
        </p>
      </div>
    </footer>
  );
}
