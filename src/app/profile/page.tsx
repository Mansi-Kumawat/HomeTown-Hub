"use client";
// PROFILE PAGE — see and edit your own profile (name, bio, hometowns, avatar),
// plus a strip of the communities you belong to.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Camera, MapPin, Building2, ShieldCheck, Landmark, Users } from "lucide-react";
import { api, uploadImage, type Community } from "@/lib/client";
import { useRequireAuth, useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { Spinner, EmptyState } from "@/components/ui";
import Avatar from "@/components/avatar";
import { CommunityCard } from "@/app/communities/page";

export default function ProfilePage() {
  const user = useRequireAuth();
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", bio: "", hometown: "", currentCity: "", avatarUrl: "" });
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fill the form once the user object is available.
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name, bio: user.bio, hometown: user.hometown,
        currentCity: user.currentCity, avatarUrl: user.avatarUrl,
      });
      api<{ communities: Community[] }>("/api/communities?member=me&limit=24")
        .then(({ data }) => setCommunities(data.communities))
        .catch(() => setCommunities([]));
    }
  }, [user]);

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, avatarUrl: url }));
      toast("Photo uploaded — remember to save.");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, message } = await api<{ user: typeof user }>("/api/users/me", { method: "PUT", body: form });
      if (data.user) setUser(data.user);
      toast(message);
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <Spinner label="Loading your profile…" />;

  const roleBadge =
    user.role === "admin"
      ? { icon: Landmark, text: "Platform Admin", className: "bg-ink text-paper" }
      : user.role === "moderator"
        ? { icon: ShieldCheck, text: "Community Moderator", className: "bg-leaf/10 text-leaf" }
        : { icon: Users, text: "Member", className: "bg-ink/5 text-ink/60" };

  const inputClass =
    "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ember";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Profile card */}
      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-warm-lg">
        <div className="h-24 bg-gradient-to-r from-ember/80 via-gold/60 to-leaf/70" />
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-10 flex items-end justify-between">
            <button onClick={() => fileRef.current?.click()} className="group relative" title="Change photo">
              <Avatar name={user.name} url={form.avatarUrl || null} size="xl" />
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper shadow-warm transition-colors group-hover:bg-ember">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
            <span className={`mb-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${roleBadge.className}`}>
              <roleBadge.icon className="h-3.5 w-3.5" /> {roleBadge.text}
            </span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">{user.name}</h1>
          <p className="text-sm text-ink/55">{user.email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/60">
            {user.hometown && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-ember" /> From {user.hometown}</span>}
            {user.currentCity && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-leaf" /> Lives in {user.currentCity}</span>}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={save} className="mt-6 space-y-4 rounded-3xl border border-ink/10 bg-white p-6 shadow-warm sm:p-8">
        <h2 className="font-display text-lg font-semibold text-ink">Edit profile</h2>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink/80">Full name</label>
          <input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-ink/80">Bio</label>
          <textarea id="bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="A line or two about you — what you do, what you miss about home…" className={inputClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hometown" className="mb-1.5 block text-sm font-medium text-ink/80">Hometown (city / village)</label>
            <input id="hometown" value={form.hometown} onChange={(e) => setForm((f) => ({ ...f, hometown: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="currentCity" className="mb-1.5 block text-sm font-medium text-ink/80">Where you live now</label>
            <input id="currentCity" value={form.currentCity} onChange={(e) => setForm((f) => ({ ...f, currentCity: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <button
          type="submit" disabled={busy || uploading}
          className="flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ember disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* My communities */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Your communities</h2>
        <div className="mt-4">
          {communities === null ? (
            <Spinner />
          ) : communities.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="You haven't joined a hub yet"
              hint="Search for your hometown and request to join its community."
              action={<Link href="/communities" className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep">Explore communities</Link>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
