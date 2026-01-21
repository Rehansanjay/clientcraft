"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- REDIRECT IF ALREADY LOGGED IN ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/generate");
      }
    });
  }, [router]);

  /* ---------- LOGIN ---------- */
  const handleLogin = async () => {
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/generate`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md border rounded-xl p-8 bg-[var(--card)]">

        {!sent ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">
              Sign in to continue
            </h1>

            <p className="text-[var(--muted)] mb-6">
              We’ll email you a secure login link.
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md p-3 mb-4 text-sm"
            />

            {error && (
              <p className="text-sm text-red-500 mb-3">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !email.includes("@")}
              className="w-full bg-black text-white py-3 rounded-md font-medium disabled:opacity-50"
            >
              {loading ? "Sending link…" : "Send login link"}
            </button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">
              Check your email
            </h2>

            <p className="text-[var(--muted)]">
              We’ve sent a secure login link to <br />
              <span className="font-medium text-[var(--text)]">
                {email}
              </span>
            </p>

            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-3 rounded-md bg-black text-white text-sm font-medium"
            >
              Open Gmail
            </a>

            <p className="text-xs text-[var(--muted)] mt-3">
              Didn’t get the email? Check spam or try again.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
