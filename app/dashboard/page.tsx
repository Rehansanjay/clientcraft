"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import AppShell from "@/components/AppShell";

/* ---------- TYPES (MATCH DB EXACTLY) ---------- */
type Proposal = {
  id: string;
  content: string;
  industry: string;
  goal: string;
  tone: string;
  send_status: "send-ready" | "review" | "revise";
  send_reason: string | null;
  created_at: string;
};

/* ---------- STATUS LABEL ---------- */
function getStatusLabel(status: Proposal["send_status"]) {
  if (status === "send-ready") return "Send-ready";
  if (status === "review") return "Review once";
  return "Needs revision";
}

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      /* ---------- AUTH ---------- */
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      /* ---------- FETCH PROPOSALS ---------- */
      const { data: rows, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error(error);
        setError("Failed to load proposals.");
      } else {
        setProposals(rows || []);
      }

      setLoading(false);
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <AppShell>
      {/* ---------- HEADER ---------- */}
      <div className="mb-10">
        <Link href="/" className="text-sm underline text-gray-400">
          ← Back to home
        </Link>

        <h1 className="text-2xl font-semibold mt-4">
          Your proposals
        </h1>
      </div>

      {/* ---------- STATES ---------- */}
      {loading && <p className="text-gray-400">Loading…</p>}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && proposals.length === 0 && (
        <div className="border border-dashed rounded-lg p-10 text-center">
          <p className="text-gray-400 mb-4">
            No proposals yet.
          </p>
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 bg-white text-black rounded-md"
          >
            Generate your first proposal
          </button>
        </div>
      )}

      {/* ---------- LIST ---------- */}
      <div className="space-y-6">
        {proposals.map((p) => (
          <div
            key={p.id}
            className="border rounded-lg p-6 bg-[#0E131B]"
          >
            {/* META */}
            <div className="flex justify-between text-xs text-gray-400 mb-3">
              <span>
                {new Date(p.created_at).toLocaleString()}
              </span>
              <span>{getStatusLabel(p.send_status)}</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              {p.industry} · {p.goal} · {p.tone}
            </p>

            {/* CONTENT */}
            <pre className="whitespace-pre-line text-sm mb-4 text-white">
              {p.content}
            </pre>

            {/* PRO INSIGHT */}
            {p.send_reason && (
              <p className="text-xs text-gray-400 italic mb-3">
                Why this works: {p.send_reason}
              </p>
            )}

            <button
              onClick={() =>
                navigator.clipboard.writeText(p.content)
              }
              className="text-xs underline text-gray-400"
            >
              Copy proposal
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
