"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Mode = "freelancer" | "student";

const FREELANCER_LIMIT = 3;
const STUDENT_LIMIT = 5;

export default function GeneratePage() {
  const router = useRouter();

  /* ---------------- STATE ---------------- */
  const [mode, setMode] = useState<Mode>("freelancer");

  const [input, setInput] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("General Business");
  const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState("");
  const [tone, setTone] = useState<"safe" | "bold">("safe");

  const [contextNote, setContextNote] = useState("");

  const [makeClientFocused, setMakeClientFocused] = useState(false);

  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentLimit =
    mode === "freelancer" ? FREELANCER_LIMIT : STUDENT_LIMIT;

  /* ---------------- AUTH ---------------- */
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

  /* ---------------- GENERATE ---------------- */
  const handleGenerate = async () => {
    if (!input || !role) {
      alert(
        mode === "freelancer"
          ? "Add client context and select your role."
          : "Add company context and select your background."
      );
      return;
    }

    if (trialCount >= currentLimit) return;

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
          mode,
          input,
          role,
          industry,
          goal,
          priority,
          tone,
          contextNote,
          makeClientFocused,
        }),
      });

      if (res.status === 403) {
        setTrialCount(currentLimit);
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

  /* ---------------- COPY ---------------- */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ---------------- UI ---------------- */
  return (
    <main className="min-h-screen px-6 py-16 flex justify-center bg-[var(--bg)] text-[var(--text)] font-sans">
      <div className="w-full max-w-3xl space-y-12">

        {/* HEADER */}
        <header className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => router.push("/")}
              className="text-[var(--muted)] hover:text-[var(--text)] transition flex items-center gap-1"
            >
              ← Back to Home
            </button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {mode === "freelancer"
                ? "Generate a client-ready proposal"
                : "Generate a professional outreach message"}
            </h1>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {mode === "freelancer"
                ? "Add real context (optional). Show value. Send with confidence."
                : "Reach out politely (optional). Show alignment. Start a real conversation."}
            </p>
          </div>
        </header>

        {/* CARD */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 space-y-10">

          {/* MODE SWITCH */}
          <div className="flex gap-2">
            {(["freelancer", "student"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setTrialCount(0);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === m
                  ? "bg-black text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
              >
                {m === "freelancer" ? "💼 Freelancer" : "🎓 Student / Job"}
              </button>
            ))}
          </div>

          {/* INPUT */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "freelancer"
                ? "Paste the job post, client brief, or website…"
                : "Paste the company website, role description, or recruiter post…"
            }
            className="w-full h-40 rounded-lg border bg-[var(--input-bg)]
            text-[var(--input-text)] border-[var(--border)]
            placeholder:text-[var(--placeholder)] p-4 text-sm leading-relaxed"
          />

          {/* PROMPT HELP */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm">
            <p className="font-medium mb-2">
              {mode === "freelancer"
                ? "How to get better proposals"
                : "How to write a strong outreach message"}
            </p>
            <ul className="list-disc ml-5 space-y-1 text-[var(--muted)]">
              {mode === "freelancer" ? (
                <>
                  <li>Mention what the client is trying to improve</li>
                  <li>Reference their product, site, or workflow</li>
                  <li>Highlight one clear outcome you can deliver</li>
                  <li>Avoid generic skill lists</li>
                </>
              ) : (
                <>
                  <li>Mention why this company or role interests you</li>
                  <li>Show curiosity, not desperation</li>
                  <li>Keep it respectful and specific</li>
                  <li>End with a light, open-ended intent</li>
                </>
              )}
            </ul>
          </div>

          {/* CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <Select
              label={mode === "freelancer" ? "Your role" : "Your background"}
              optional={mode === "student"}
              value={role}
              onChange={setRole}
              options={[
                "Software Developer",
                "Designer",
                "Marketer",
                "Consultant",
                "Student",
              ]}
            />

            <Select
              label={
                mode === "freelancer"
                  ? "Industry / Domain"
                  : "Target industry"
              }
              optional={mode === "student"}
              value={industry}
              onChange={setIndustry}
              options={[
                "General Business",
                "SaaS",
                "FinTech",
                "Healthcare",
                "E-commerce",
              ]}
            />

            <Select
              label={
                mode === "freelancer"
                  ? "Client goal"
                  : "Reason for reaching out"
              }
              optional={mode === "student"}
              value={goal}
              onChange={setGoal}
              options={
                mode === "freelancer"
                  ? [
                    "Build trust before purchase",
                    "Increase sales",
                    "Reduce manual work",
                  ]
                  : [
                    "Learn about the role",
                    "Ask for guidance",
                    "Show interest",
                    "Request a conversation",
                  ]
              }
            />

            <Select
              label={
                mode === "freelancer"
                  ? "Decision priority"
                  : "What you want clarity on"
              }
              optional={mode === "student"}
              value={priority}
              onChange={setPriority}
              options={
                mode === "freelancer"
                  ? ["Speed", "Budget", "Specifications"]
                  : ["Role scope", "Skills needed", "Team culture"]
              }
            />

            <Select
              label="Tone"
              value={tone}
              onChange={(v) => setTone(v as any)}
              options={
                mode === "freelancer"
                  ? ["safe", "bold"]
                  : ["polite", "confident"]
              }
            />

            <input
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="Additional context (optional)"
              className="w-full rounded-md border bg-[var(--input-bg)]
              text-[var(--input-text)] border-[var(--border)]
              placeholder:text-[var(--placeholder)] p-3 text-sm"
            />
          </div>

          {/* ACTION */}
          <button
            onClick={handleGenerate}
            disabled={loading || trialCount >= currentLimit}
            className="w-full bg-black text-white py-4 rounded-md font-medium disabled:opacity-50"
          >
            {loading
              ? "Writing…"
              : mode === "freelancer"
                ? "Generate proposal"
                : "Generate message"}
          </button>

          {/* LIMIT */}
          <p className="text-xs text-center text-[var(--muted)]">
            {currentLimit - trialCount} free{" "}
            {mode === "freelancer" ? "proposals" : "messages"} left
          </p>
        </div>

        {/* OUTPUT */}
        {output && (
          <div className="relative border border-[var(--border)] rounded-lg p-6 bg-[var(--card)] whitespace-pre-line text-sm leading-relaxed">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 text-xs px-3 py-1 border rounded-md"
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

/* ---------- SELECT ---------- */
function Select({
  label,
  optional,
  value,
  onChange,
  options,
}: {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-medium mb-1">
        {label}
        {optional && (
          <span className="text-xs text-[var(--muted)]">(optional)</span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-[var(--input-bg)]
        text-[var(--input-text)] border-[var(--border)]
        p-3 text-sm"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
