"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const TRIAL_LIMIT = 3;

export default function GeneratePage() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("General Business");
  const [goal, setGoal] = useState("Build trust before purchase");
  const [priority, setPriority] = useState("Clear specifications");
  const [tone, setTone] = useState<"safe" | "bold">("safe");

  const [goalNote, setGoalNote] = useState("");
  const [priorityNote, setPriorityNote] = useState("");
  const [contextNote, setContextNote] = useState("");

  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
  }, [router]);

  const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push("/login");
      return null;
    }
    return data.session;
  };

  const handleGenerate = async () => {
    if (!input || !role) {
      alert("Add client context and select your role.");
      return;
    }

    if (trialCount >= TRIAL_LIMIT) return;

    setLoading(true);
    setOutput("");

    try {
      const session = await getSession();
      if (!session) return;

      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          input,
          role,
          industry,
          goal,
          priority,
          tone,
          goalNote,
          priorityNote,
          contextNote,
        }),
      });

      if (res.status === 403) {
        setTrialCount(TRIAL_LIMIT);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Generation failed.");
        return;
      }

      setOutput(data.proposal);
      setTrialCount((p) => p + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen px-6 py-16 flex justify-center">
      <div className="w-full max-w-3xl space-y-10">

        <div className="flex gap-4 text-sm">
          <button onClick={() => router.push("/")} className="underline text-[var(--muted)]">
            ← Home
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={() => router.push("/pricing")} className="underline text-[var(--muted)]">
            Pricing
          </button>
        </div>

        <header>
          <h1 className="text-3xl font-semibold mb-2">
            Generate a client-ready proposal
          </h1>
          <p className="text-[var(--muted)]">
            Paste context. Choose intent. Get something you can actually send.
          </p>
        </header>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste the job post, website, or brief here…"
          className="w-full h-40 border rounded-lg p-4 text-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select label="Your role" value={role} onChange={setRole}
            options={["Software Developer","Designer","Marketer","Consultant","Writer"]} />

          <Select label="Industry" value={industry} onChange={setIndustry}
            options={["Power Tools","Textile","Restaurant","SaaS","General Business"]} />

          <div>
            <Select label="Client goal" value={goal} onChange={setGoal}
              options={[
                "Build trust before purchase",
                "Increase sales",
                "Reduce manual work",
                "Look more professional",
                "Explain products clearly",
              ]}
            />
            <input
              value={goalNote}
              onChange={(e) => setGoalNote(e.target.value)}
              placeholder="Optional: what outcome does the client want?"
              className="mt-2 w-full border rounded-md p-2 text-sm"
            />
          </div>

          <div>
            <Select label="Decision priority" value={priority} onChange={setPriority}
              options={["Clear specifications","Speed","Budget","Long-term support"]} />
            <input
              value={priorityNote}
              onChange={(e) => setPriorityNote(e.target.value)}
              placeholder="Optional: what should this emphasize?"
              className="mt-2 w-full border rounded-md p-2 text-sm"
            />
          </div>

          <Select label="Tone" value={tone} onChange={(v) => setTone(v as any)}
            options={["safe","bold"]} />

          <div>
            <label className="block text-sm font-medium mb-1">
              Extra client context (optional)
            </label>
            <input
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="e.g. cautious buyers, technical founder"
              className="w-full border rounded-md p-3 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || trialCount >= TRIAL_LIMIT}
          className="w-full bg-black text-white py-4 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? "Writing proposal…" : "Generate proposal"}
        </button>

        {trialCount >= TRIAL_LIMIT ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-[var(--muted)]">
              You’ve used all free proposals.
            </p>
            <button
              onClick={() => router.push("/pricing")}
              className="underline text-sm"
            >
              Upgrade to Pro →
            </button>
          </div>
        ) : (
          <p className="text-sm text-center text-[var(--muted)]">
            {TRIAL_LIMIT - trialCount} free proposals left
          </p>
        )}

        {output && (
          <div className="relative border rounded-lg p-6 bg-[var(--card)] whitespace-pre-line">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 text-sm px-3 py-1 border rounded-md"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            {output}
          </div>
        )}
      </div>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-md p-3 text-sm"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
