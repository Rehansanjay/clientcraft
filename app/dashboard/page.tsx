"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AppShell from "@/components/AppShell";

type Proposal = {
  id: string;
  content: string;
  industry: string;
  goal: string;
  tone: string;
  confidence_score: number;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        // 1️⃣ Auth check
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !session.user) {
          router.push("/login");
          return;
        }

        if (!mounted) return;

        setEmail(session.user.email || null);

        // 2️⃣ Load proposals for this user
        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error && error.message) {
          console.error("Supabase error:", error);
          setPageError("Failed to load proposals.");
        } else {
          setProposals(data || []);
        }
      } catch (err) {
        console.error(err);
        setPageError("Something went wrong.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <AppShell>
      {/* HEADER */}
      <div className="mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#9AA4B2] mb-4 hover:underline"
        >
          ← Back to home
        </Link>

        <h1 className="text-2xl font-semibold">Systems</h1>
        <p className="text-[#9AA4B2] mt-2">
          Your intelligent systems will appear here.
        </p>

        {email && (
          <p className="text-xs text-[#9AA4B2] mt-1">
            Logged in as {email}
          </p>
        )}
      </div>

      {/* STATES */}
      {loading && (
        <p className="text-[#9AA4B2]">
          Loading dashboard…
        </p>
      )}

      {pageError && (
        <p className="text-red-500">
          {pageError}
        </p>
      )}

      {!loading && !pageError && proposals.length === 0 && (
        <div className="border border-dashed border-[#1F2937] rounded-lg p-10 text-center">
          <p className="text-[#9AA4B2] mb-4">
            No systems yet.
          </p>
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 rounded-md bg-white text-black font-medium"
          >
            Generate your first proposal
          </button>
        </div>
      )}

      {/* PROPOSALS */}
      {!loading && proposals.length > 0 && (
        <div className="space-y-6">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="border border-[#1F2937] rounded-lg p-6 bg-[#0E131B]"
            >
              <div className="flex justify-between text-xs text-[#9AA4B2] mb-3">
                <span>
                  {new Date(p.created_at).toLocaleString()}
                </span>
                <span>
                  Confidence <strong>{p.confidence_score}/10</strong>
                </span>
              </div>

              <p className="text-xs text-[#9AA4B2] mb-3">
                {p.industry} · {p.goal} · {p.tone}
              </p>

              <pre className="whitespace-pre-line text-sm mb-4 text-[#EDEFF2]">
                {p.content}
              </pre>

              <button
                onClick={() => navigator.clipboard.writeText(p.content)}
                className="text-xs underline text-[#9AA4B2]"
              >
                Copy proposal
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
