"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../lib/supabase";
import AppShell from "@/components/AppShell";

/* ---------- TYPES ---------- */
type Proposal = {
  id: string;
  content: string;
  industry: string;
  goal: string;
  tone: string;
  confidence_score: number;
  created_at: string;
};

/* ---------- CONFIDENCE LABEL ---------- */
function getConfidenceLabel(score: number) {
  if (score >= 8) return "Send-ready · High confidence";
  if (score >= 6) return "Low risk · Review once";
  return "Needs refinement";
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        if (!mounted) return;

        setEmail(session.user.email ?? null);

        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          setPageError("Failed to load proposals.");
        } else {
          setProposals(data || []);
        }
      } catch {
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
      <div className="mb-10">
        <Link
          href="/"
          className="text-sm text-[#9AA4B2] hover:underline"
        >
          ← Back to home
        </Link>

        <h1 className="text-2xl font-semibold mt-4">
          Your proposals
        </h1>

        {email && (
          <p className="text-xs text-[#9AA4B2] mt-1">
            Logged in as {email}
          </p>
        )}
      </div>

      {loading && (
        <p className="text-[#9AA4B2]">Loading…</p>
      )}

      {pageError && (
        <p className="text-red-500">{pageError}</p>
      )}

      {!loading && proposals.length === 0 && (
        <div className="border border-dashed border-[#1F2937] rounded-lg p-10 text-center">
          <p className="text-[#9AA4B2] mb-4">
            No proposals yet.
          </p>
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 rounded-md bg-white text-black"
          >
            Generate your first proposal
          </button>
        </div>
      )}

      {proposals.length > 0 && (
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
                  {getConfidenceLabel(p.confidence_score)}
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
