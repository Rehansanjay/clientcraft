import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const INDUSTRY_CONTEXT: Record<string, string> = {
  "Power Tools":
    "Buyers care about safety, durability, certifications, and real-world usage.",
  "Textile":
    "Buyers care about fabric quality, consistency, and seasonal relevance.",
  "Restaurant":
    "Customers care about clarity, speed of choice, and trust.",
  "SaaS":
    "Clients care about efficiency, reliability, and onboarding clarity.",
  "General Business":
    "Clients want professionalism and confidence before engaging.",
};

const FREE_LIMIT = 3;

export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------- PROFILE ---------- */
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_active")
      .eq("id", user.id)
      .single();

    const isPro =
      profile?.plan === "pro" && profile?.subscription_active === true;

    /* ---------- USAGE ---------- */
    const { data: usage } = await supabase
      .from("user_usage")
      .select("free_trial_count")
      .eq("user_id", user.id)
      .single();

    if (!isPro && usage?.free_trial_count >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Free trial limit reached" },
        { status: 403 }
      );
    }

    /* ---------- INPUT ---------- */
    const {
      input,
      role,
      industry,
      goal,
      priority,
      tone,
      goalNote,
      priorityNote,
      contextNote,
    } = await req.json();

    const contextBlock = `
Industry:
${INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT["General Business"]}

Goal:
${goal}${goalNote ? ` (${goalNote})` : ""}

Priority:
${priority}${priorityNote ? ` (${priorityNote})` : ""}

${contextNote ? `Additional context:\n${contextNote}` : ""}
`;

    /* ---------- AI ---------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are a professional freelancer writing client proposals.

Rules:
- Never sound generic or templated
- Keep under 120 words
- Use ONE concrete example
- No metrics or fake numbers
- Calm, human tone

Structure:
1. Understanding sentence
2. Problem or goal sentence
3. How you'd solve it (with example)
4. Polite next step
`,
        },
        {
          role: "user",
          content: `
${contextBlock}

Client details:
${input}

Role:
${role}

Tone:
${tone}
`,
        },
      ],
    });

    const proposal = completion.choices[0].message.content;
    // ✅ SAVE PROPOSAL (THIS FIXES DASHBOARD)
await supabase.from("proposals").insert({
  user_id: user.id,
  content: proposal,
  industry,
  goal,
  tone,
});


    /* ---------- TRACK FREE USAGE ONLY ---------- */
    if (!isPro) {
      await supabase.from("user_usage").upsert({
        user_id: user.id,
        free_trial_count: (usage?.free_trial_count || 0) + 1,
      });
    }

    return NextResponse.json({
      proposal,
      isPro,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
