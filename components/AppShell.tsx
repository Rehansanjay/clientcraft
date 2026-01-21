"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  /* ---------- AUTH GUARD ---------- */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      if (!mounted) return;

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* ---------- LOGOUT ---------- */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* TOP BAR */}
      <header className="border-b border-[#1F2937]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Klynexa
          </Link>

          <div className="flex items-center gap-6 text-sm text-[#9AA4B2]">
            <Link href="/generate" className="hover:text-white">
              Generate
            </Link>

            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>

            {email && (
              <span className="hidden sm:inline text-xs">
                {email}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="hover:text-white underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
