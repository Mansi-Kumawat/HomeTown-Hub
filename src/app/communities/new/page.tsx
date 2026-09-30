"use client";
// ============================================================================
// CREATE COMMUNITY — members propose a new hub. It starts as "pending" and a
// Platform Admin approves it before it appears publicly.
// Includes image upload (ImagePicker pattern: file → /api/upload → URL).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { api, uploadImage, type Category } from "@/lib/client";
import { useRequireAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { Spinner } from "@/components/ui";

export default function NewCommunityPage() {
  const user = useRequireAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", city: "", description: "", rules: "", imageUrl: "", categoryId: "" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Send the chosen file to /api/upload and remember the returned URL.
  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast("Cover image ready.");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { message } = await api("/api/communities", {
        method: "POST",
        body: { ...form, categoryId: form.categoryId || null },
      });
      toast(message);
      router.push("/communities");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <Spinner label="Checking your login…" />;

  const inputClass =
    "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ember";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Start a hometown hub</h1>
      <p className="mt-1.5 text-ink/60">
        Every hub is reviewed by a platform admin before going live — usually within a day.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-warm sm:p-8">
        {/* Cover image */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink/80">Cover image <span className="text-ink/40">(optional)</span></span>
          {form.imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="Community cover" className="h-44 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-white hover:bg-ink"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 bg-paper/60 text-ink/55 transition-colors hover:border-ember hover:text-ember"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-sm">{uploading ? "Uploading…" : "Click to upload a cover photo"}</span>
              <span className="text-xs text-ink/40">JPG, PNG or WebP · max 2.5 MB</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
        </div>

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink/80">Community name</label>
          <input id="name" required value={form.name} onChange={set("name")} placeholder="e.g. Munnar Tea Hills Circle" className={inputClass} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-ink/80">City / village</label>
            <input id="city" required value={form.city} onChange={set("city")} placeholder="e.g. Munnar, Kerala" className={inputClass} />
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink/80">Category</label>
            <select id="category" value={form.categoryId} onChange={set("categoryId")} className={inputClass}>
              <option value="">Pick one (optional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink/80">What is this community about?</label>
          <textarea
            id="description" required rows={4} value={form.description} onChange={set("description")}
            placeholder="Who is it for, and what will people find here?"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="rules" className="mb-1.5 block text-sm font-medium text-ink/80">Community rules <span className="text-ink/40">(optional — moderators can edit later)</span></label>
          <textarea
            id="rules" rows={3} value={form.rules} onChange={set("rules")}
            placeholder={"e.g.\n1. Be kind and respectful\n2. Stay on local topics\n3. No spam or ads"}
            className={inputClass}
          />
        </div>

        <button
          type="submit" disabled={busy || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ember py-3 text-sm font-semibold text-white transition-colors hover:bg-ember-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-center text-xs text-ink/45">
          You'll be the creator and first moderator of this hub once it's approved.
        </p>
      </form>
    </div>
  );
}
