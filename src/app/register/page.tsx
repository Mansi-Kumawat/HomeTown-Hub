"use client";
// REGISTER PAGE — name, email, password (+ optional hometown/current city).
// Validation messages come from the API so they're always consistent.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundPlus, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", hometown: "", currentCity: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const user = await register(form);
      toast(`Welcome to Hometown Hub, ${user.name.split(" ")[0]}!`);
      router.push("/communities");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ember";

  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      {/* Artwork panel */}
      <div className="relative hidden overflow-hidden rounded-l-3xl lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/auth.jpg" alt="A road leading back home" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute bottom-0 p-8">
          <p className="flex items-center gap-2 font-display text-2xl text-white">
            <MapPin className="h-5 w-5 text-gold" /> Home is a habit.
          </p>
          <p className="mt-2 text-sm text-white/75">Two minutes to join. A lifetime of hometown connection.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-warm-lg lg:rounded-l-none lg:border-l-0">
        <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-ink/55">Tell us where you're from and where you are now.</p>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p className="animate-fade-up rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink/80">Full name</label>
            <input id="name" required value={form.name} onChange={update("name")} placeholder="e.g. Priya Nair" className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink/80">Email address</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink/80">Password <span className="text-ink/40">(min 6 characters)</span></label>
            <input id="password" type="password" required autoComplete="new-password" value={form.password} onChange={update("password")} placeholder="Pick a strong password" className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hometown" className="mb-1.5 block text-sm font-medium text-ink/80">Hometown <span className="text-ink/40">(city / village)</span></label>
              <input id="hometown" value={form.hometown} onChange={update("hometown")} placeholder="e.g. Munnar" className={inputClass} />
            </div>
            <div>
              <label htmlFor="currentCity" className="mb-1.5 block text-sm font-medium text-ink/80">Where you live now</label>
              <input id="currentCity" value={form.currentCity} onChange={update("currentCity")} placeholder="e.g. Bengaluru" className={inputClass} />
            </div>
          </div>
          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ember py-3 text-sm font-semibold text-white transition-colors hover:bg-ember-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}
            {busy ? "Creating your account…" : "Join Hometown Hub"}
          </button>
          <p className="text-center text-sm text-ink/55">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ember hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
