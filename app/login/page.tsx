"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async () => {
    if (!email) return;

    setLoading(true);

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/generate`,
      },
    });

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

            <button
              onClick={handleLogin}
              disabled={loading}
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
