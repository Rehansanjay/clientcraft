export const dynamic = "force-dynamic";

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
  send_status: "send-ready" | "review" | "revise";
  send_reason: string | null;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setEmail(session.user.email || null);

      const { data } = await supabase
        .from("proposals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setProposals(data || []);
      setLoading(false);
    };

    load();
  }, [router]);

  return (
    <AppShell>
      <div className="mb-10">
        <Link href="/" className="text-sm underline text-[#9AA4B2]">
          ← Back to home
        </Link>

        <h1 className="text-2xl font-semibold mt-4">Your proposals</h1>
        <p className="text-[#9AA4B2]">
          Generated proposals you can reuse or send.
        </p>

        {email && (
          <p className="text-xs text-[#9AA4B2] mt-1">
            Logged in as {email}
          </p>
        )}
      </div>

      {loading && <p className="text-[#9AA4B2]">Loading…</p>}

      {!loading && proposals.length === 0 && (
        <div className="border border-dashed border-[#1F2937] rounded-lg p-10 text-center">
          <p className="text-[#9AA4B2] mb-6">
            No proposals yet.
          </p>
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 rounded-md bg-white text-black font-medium"
          >
            Generate your first proposal
          </button>
        </div>
      )}

      {!loading && proposals.length > 0 && (
        <div className="space-y-6">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="border border-[#1F2937] rounded-lg p-6 bg-[#0E131B]"
            >
              <div className="flex justify-between text-xs text-[#9AA4B2] mb-2">
                <span>{new Date(p.created_at).toLocaleString()}</span>
                <span>
                  {p.send_status === "send-ready" && "🟢 Send-ready"}
                  {p.send_status === "review" && "🟡 Review recommended"}
                  {p.send_status === "revise" && "🔴 Revise before sending"}
                </span>
              </div>

              {p.send_reason && (
                <p className="text-xs text-[#9AA4B2] mb-3">
                  {p.send_reason}
                </p>
              )}

              <pre className="whitespace-pre-line text-sm text-[#EDEFF2] mb-4">
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
