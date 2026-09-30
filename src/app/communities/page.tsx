"use client";
// ============================================================================
// EXPLORE PAGE — browse & search all approved communities.
// Features: live search (debounced), category filter chips, "my communities"
// strip when logged in, and Load-More pagination so we never fetch everything
// at once (keeps pages under 3s even as the platform grows).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Users, PlusCircle, Building2, Compass } from "lucide-react";
import { api, type Community, type Category } from "@/lib/client";
import { useAuth } from "@/components/auth-provider";
import { SkeletonCards, EmptyState } from "@/components/ui";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      href={`/communities/${community.id}`}
      className="group animate-fade-up flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg"
    >
      <div className="relative h-36 overflow-hidden bg-paper-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={community.imageUrl || "/images/hero.jpg"}
          alt={community.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {community.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
            {community.category.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-ember">
          {community.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
          <MapPin className="h-3.5 w-3.5" /> {community.city}
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink/60">{community.description}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-leaf">
          <Users className="h-3.5 w-3.5" /> {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}

export default function CommunitiesPage() {
  const { user } = useAuth();

  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [mine, setMine] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch one page of communities. append=true → "Load more" clicked.
  const fetchCommunities = useCallback(
    async (pageToLoad: number, append: boolean, q: string, categoryId: number | null) => {
      if (append) setLoadingMore(true);
      try {
        const params = new URLSearchParams({ page: String(pageToLoad), limit: "9" });
        if (q) params.set("q", q);
        if (categoryId) params.set("categoryId", String(categoryId));
        const { data } = await api<{ communities: Community[]; hasMore: boolean }>(`/api/communities?${params}`);
        setCommunities((list) => (append ? [...(list ?? []), ...data.communities] : data.communities));
        setHasMore(data.hasMore);
        setPage(pageToLoad);
      } catch {
        if (!append) setCommunities([]);
      } finally {
        setLoadingMore(false);
      }
    },
    []
  );

  // Debounce: wait 350ms after the user stops typing before searching,
  // so we don't fire an API call on every keystroke.
  const onSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCommunities(null);
      fetchCommunities(1, false, value, activeCategory);
    }, 350);
  };

  const pickCategory = (id: number | null) => {
    setActiveCategory(id);
    setCommunities(null);
    fetchCommunities(1, false, query, id);
  };

  // Initial load: communities + categories + my memberships.
  useEffect(() => {
    fetchCommunities(1, false, "", null);
    api<{ categories: Category[] }>("/api/categories")
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, [fetchCommunities]);

  useEffect(() => {
    if (!user) { setMine([]); return; }
    api<{ communities: Community[] }>("/api/communities?member=me&limit=12")
      .then(({ data }) => setMine(data.communities))
      .catch(() => {});
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Find your people</h1>
          <p className="mt-1.5 text-ink/60">Search by hometown, city or village — or start a hub of your own.</p>
        </div>
        <Link
          href="/communities/new"
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ember"
        >
          <PlusCircle className="h-4 w-4" /> Create a community
        </Link>
      </div>

      {/* Search + filters */}
      <div className="mt-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Try your hometown name — “Munnar”, “Kochi”, “Jaisalmer”…"
            className="w-full rounded-2xl border border-ink/15 bg-white py-3.5 pl-11 pr-4 text-sm shadow-warm outline-none transition-colors focus:border-ember"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => pickCategory(null)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === null ? "bg-ink text-paper" : "border border-ink/15 bg-white text-ink/65 hover:border-ink/35"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === c.id ? "bg-ink text-paper" : "border border-ink/15 bg-white text-ink/65 hover:border-ink/35"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* My communities strip */}
      {user && mine.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink/50">
            <Building2 className="h-4 w-4" /> Your communities
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {mine.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-warm transition-colors hover:border-ember/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl || "/images/hero.jpg"} alt="" className="h-10 w-10 rounded-xl object-cover" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{c.name}</span>
                  <span className="block text-xs text-ink/50">{c.memberCount} members</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Results grid */}
      <section className="mt-10">
        {communities === null ? (
          <SkeletonCards count={6} />
        ) : communities.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={query ? `No communities found for “${query}”` : "No communities yet"}
            hint={
              query
                ? "Check the spelling — or be the one to bring this hometown online."
                : "Be the first to bring a hometown online."
            }
            action={
              user ? (
                <Link href="/communities/new" className="flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep">
                  <PlusCircle className="h-4 w-4" /> Start “{query || "your hometown"}” hub
                </Link>
              ) : (
                <Link href="/register" className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep">
                  Sign up to create one
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => fetchCommunities(page + 1, true, query, activeCategory)}
                  disabled={loadingMore}
                  className="rounded-full border border-ink/15 bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/35 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more communities"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
