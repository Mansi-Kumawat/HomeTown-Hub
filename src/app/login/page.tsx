"use client";
// LOGIN PAGE — email + password form. On success we store the JWT
// (via AuthProvider) and send the user to /communities.
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      toast(`Welcome back, ${user.name.split(" ")[0]}!`);
      router.push(params.get("next") || "/communities");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="animate-fade-up rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink/80">Email address</label>
        <input
          id="email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ember"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink/80">Password</label>
        <input
          id="password" type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ember"
        />
      </div>
      <button
        type="submit" disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-paper transition-colors hover:bg-ember disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {busy ? "Signing you in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-ink/55">
        New here?{" "}
        <Link href="/register" className="font-semibold text-ember hover:underline">
          Create an account
        </Link>
      </p>
      {/* Demo hint — matches the seed script credentials */}
      <div className="rounded-xl bg-paper-deep/50 p-3.5 text-xs leading-relaxed text-ink/55">
        <p className="font-semibold text-ink/70">Try the demo accounts (run the seed script first):</p>
        <p className="mt-1">Admin — <b>admin@hometownhub.app</b> · Moderator — <b>meera@example.com</b> · Member — <b>priya@example.com</b></p>
        <p>Password for all: <b>Passw0rd!</b></p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      {/* Artwork panel (hidden on small screens) */}
      <div className="relative hidden overflow-hidden rounded-l-3xl lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/auth.jpg" alt="A road leading back home" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute bottom-0 p-8">
          <p className="flex items-center gap-2 font-display text-2xl text-white">
            <MapPin className="h-5 w-5 text-gold" /> Every road leads home.
          </p>
          <p className="mt-2 text-sm text-white/75">Log in to check on your people, your streets, your stories.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-warm-lg lg:rounded-l-none lg:border-l-0">
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-ink/55">Your hometown missed you.</p>
        {/* Suspense is required around useSearchParams in Next.js */}
        <Suspense fallback={<div className="py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-ember" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
