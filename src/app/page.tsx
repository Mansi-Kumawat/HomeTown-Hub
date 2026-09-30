"use client";
// ============================================================================
// LANDING PAGE (public) — tells the Hometown Hub story: hero, value props,
// "how it works", roles, and a live preview of open communities.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Megaphone, CalendarDays, Users, ShieldCheck, BellRing,
  MapPin, Search, HeartHandshake, Landmark, Sparkles, Loader2,
} from "lucide-react";
import { api, type Community } from "@/lib/client";

export default function LandingPage() {
  const [featured, setFeatured] = useState<Community[] | null>(null);

  // Public preview: fetch the three biggest open communities.
  useEffect(() => {
    api<{ communities: Community[] }>("/api/communities?limit=3")
      .then(({ data }) => setFeatured(data.communities))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative">
        {/* soft decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-64 h-80 w-80 rounded-full bg-ember/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-ember/25 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ember">
              <Sparkles className="h-3.5 w-3.5" /> For every hometown, everywhere
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Carry your <span className="relative inline-block text-ember">
                hometown
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 8 Q 50 1 100 6 T 198 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span> in your pocket.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/65">
              Hometown Hub connects people from the same city or village — share
              announcements, discuss local life, organize events and keep your
              culture alive, no matter where you live now.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-warm-lg transition-all hover:bg-ember"
              >
                Find your community
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/communities"
                className="flex items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink/30"
              >
                <CompassIcon /> Explore hubs
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-ink/55">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-leaf" /> Neighbour-led</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-leaf" /> Moderated</span>
              <span className="hidden items-center gap-2 sm:flex"><Landmark className="h-4 w-4 text-leaf" /> Culture-first</span>
            </div>
          </div>

          {/* Hero artwork card */}
          <div className="animate-fade-up relative [animation-delay:120ms]">
            <div className="absolute -inset-3 rotate-2 rounded-[2rem] bg-gold/20" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 shadow-warm-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero.jpg" alt="A cozy hometown at sunrise" className="h-100 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5 pt-16">
                <p className="flex items-center gap-2 font-display text-lg text-white">
                  <MapPin className="h-4 w-4 text-gold" /> Munnar Tea Hills Circle
                </p>
                <p className="mt-1 text-sm text-white/80">412 members sharing festival plans right now</p>
              </div>
            </div>
            {/* floating announcement chip */}
            <div className="absolute -left-4 top-6 animate-fade-up rounded-2xl border border-ink/10 bg-white p-3.5 shadow-warm-lg [animation-delay:350ms] sm:-left-8">
              <p className="flex items-center gap-2 text-xs font-semibold text-ink"><Megaphone className="h-3.5 w-3.5 text-ember" /> Pinned announcement</p>
              <p className="mt-1 text-xs text-ink/55">“Monsoon cleanup drive — Sunday 7 AM”</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* VALUE PROPS                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-ink/10 bg-paper-deep/40 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Megaphone, title: "Announcements", text: "One trusted place for news that matters — pinned by your moderators, not buried in chats." },
            { icon: CalendarDays, title: "Local events", text: "Festival meet-ups, sports days, alumni dinners. RSVP in one tap and see who's coming." },
            { icon: BellRing, title: "Gentle alerts", text: "A bell, not a firehose. Get notified when something happens in your hometown circle." },
            { icon: HeartHandshake, title: "Shared memory", text: "Photos, recipes, dialect words, oral history — preserve what makes home, home." },
          ].map((f, i) => (
            <div key={f.title} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-6 shadow-warm transition-transform hover:-translate-y-1" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember/10"><f.icon className="h-5.5 w-5.5 text-ember" /></span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HOW IT WORKS                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Three steps home</h2>
          <p className="mt-3 text-ink/60">Designed for everyone — from students in hostels to grandparents on their first smartphone.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { step: "01", icon: Search, title: "Find your hub", text: "Search your city or village name. Not listed yet? Create it — a platform admin reviews every new hub." },
            { step: "02", icon: Users, title: "Knock on the door", text: "Send a join request. Local moderators approve members so the circle stays genuinely hometown." },
            { step: "03", icon: HeartHandshake, title: "Belong again", text: "Post, comment, organize events, welcome newcomers. Home is a habit — practice it here." },
          ].map((s, i) => (
            <div key={s.step} className="relative animate-fade-up rounded-2xl border border-ink/10 bg-white p-7 shadow-warm" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="absolute right-6 top-5 font-display text-4xl font-semibold text-paper-deep">{s.step}</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf/10"><s.icon className="h-5.5 w-5.5 text-leaf" /></span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* LIVE COMMUNITY PREVIEW                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-ink/10 bg-paper-deep/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">Open hubs this week</h2>
              <p className="mt-2 text-ink/60">A live peek at communities on the platform right now.</p>
            </div>
            <Link href="/communities" className="group flex items-center gap-1.5 text-sm font-semibold text-ember">
              Browse all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {featured === null ? (
            <div className="flex justify-center py-14 text-ink/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : featured.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white/60 p-10 text-center text-ink/55">
              No public hubs yet — yours could be the first.
            </p>
          ) : (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="group animate-fade-up overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="relative h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl || "/images/hero.jpg"} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
                      {c.category?.name ?? "Community"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold text-ink group-hover:text-ember">{c.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50"><MapPin className="h-3.5 w-3.5" /> {c.city}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink/60">{c.description}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-leaf"><Users className="h-3.5 w-3.5" /> {c.memberCount} member{c.memberCount === 1 ? "" : "s"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ROLES + FINAL CTA                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { icon: Users, role: "Members", points: ["Join hometown circles", "Post, like & comment", "Create & attend events"] },
            { icon: ShieldCheck, role: "Moderators", points: ["Approve join requests", "Pin announcements", "Keep the feed kind"] },
            { icon: Landmark, role: "Platform admins", points: ["Approve new hubs", "Handle abuse reports", "Watch community health"] },
          ].map((r, i) => (
            <div key={r.role} className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-6 shadow-warm" style={{ animationDelay: `${i * 90}ms` }}>
              <p className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-paper"><r.icon className="h-4.5 w-4.5" /></span>
                {r.role}
              </p>
              <ul className="mt-4 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-ink/65">
                    <span className="h-1.5 w-1.5 rounded-full bg-ember" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center shadow-warm-lg sm:px-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
            Your hometown is one search away.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-paper/60">
            Join free, find your people, and never miss what happens back home again.
          </p>
          <Link
            href="/register"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ember px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Tiny inline compass icon (avoids importing the whole icon set twice). */
function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
