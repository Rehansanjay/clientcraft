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

const FREELANCER_LIMIT = 3;
const STUDENT_LIMIT = 5;

/* ---------- SEND STATUS ---------- */
function evaluateSendStatus({
  tone,
  makeClientFocused,
}: {
  tone: string;
  makeClientFocused: boolean;
}) {
  if (tone === "bold" && makeClientFocused) {
    return {
      status: "send-ready",
      reason: "Direct, specific, and outcome-focused.",
    };
  }

  if (tone === "safe") {
    return {
      status: "review",
      reason: "Clear and professional, but could be sharper.",
    };
  }

  return {
    status: "revise",
    reason: "Too vague or generic.",
  };
}

export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------- PROFILE ---------- */
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "plan, subscription_active, freelancer_count, student_count"
      )
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile missing" }, { status: 401 });
    }

    const isPro =
      profile.plan === "pro" && profile.subscription_active === true;

    /* ---------- INPUT ---------- */
    const {
      mode = "freelancer",
      input,
      role,
      industry,
      goal,
      priority,
      tone,
      contextNote,
      makeClientFocused,
    } = await req.json();

    const isFreelancer = mode === "freelancer";
    const currentCount = isFreelancer
      ? profile.freelancer_count
      : profile.student_count;

    const currentLimit = isFreelancer
      ? FREELANCER_LIMIT
      : STUDENT_LIMIT;

    if (!isPro && currentCount >= currentLimit) {
      return NextResponse.json(
        { error: "Free limit reached" },
        { status: 403 }
      );
    }

    /* ---------- SYSTEM PROMPT (HARD TRAINED) ---------- */
    const systemPrompt =
      mode === "student"
        ? `
You are a real student or early-career developer sending ONE cold message to a founder or hiring manager.

YOU ARE NOT AN AI.
YOU ARE NOT GIVING ADVICE.
YOU ARE WRITING THE MESSAGE ITSELF.

STRICT RULES (NO EXCEPTIONS):
- DO NOT say: "I came across", "I was impressed", "hope you are doing well"
- DO NOT sound polite-generic or HR-like
- DO NOT explain motivation — show it through specificity
- First line MUST reference a concrete signal (product, launch, post, repo, feature)
- Ask ONE clear, low-pressure question
- Sound curious, sharp, and human
- No emojis
- No flattery
- Max 60 words

Bad example (NEVER do this):
"I came across your company and was impressed..."

Good behavior:
"Noticed you shipped <specific thing>. Curious if you're open to interns helping with <specific area>."

Write ONLY the message.
`
        : `
You are a senior freelancer writing a proposal to a real paying client.

YOU ARE NOT AN AI.
YOU ARE NOT DESCRIBING YOURSELF.
YOU ARE ADDRESSING A BUSINESS PROBLEM.

STRICT RULES:
- First sentence MUST reference the client’s business or industry
- Mention ONE concrete business outcome
- Give ONE specific example of how you’d approach it
- Never say:
  "reliable developer"
  "high-quality solutions"
  "I'd love to help"
- No filler
- No generic sales language
- Max 120 words

${makeClientFocused && isPro ? `
PRO RULE:
- Explicitly state what could go wrong if this is done poorly
` : ""}

Write ONLY the proposal.
`;

    /* ---------- USER PROMPT ---------- */
    const userPrompt =
      mode === "student"
        ? `
Context:
${input}

Your background: ${role}
Target industry: ${industry}
Reason: ${goal}
What you want clarity on: ${priority}

Extra context:
${contextNote || ""}
`
        : `
Client context:
${input}

Role: ${role}
Industry: ${industry}
Goal: ${goal}
Priority: ${priority}
Tone: ${tone}

Extra context:
${contextNote || ""}
`;

    /* ---------- AI ---------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: mode === "student" ? 0.55 : 0.7,
      max_tokens: mode === "student" ? 140 : 320,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const proposal = completion.choices[0].message.content?.trim();

    /* ---------- SAVE ---------- */
    await supabase.from("proposals").insert({
      user_id: data.user.id,
      content: proposal,
      industry,
      goal,
      tone,
      send_status: evaluateSendStatus({
        tone,
        makeClientFocused,
      }).status,
      send_reason: isPro
        ? evaluateSendStatus({ tone, makeClientFocused }).reason
        : null,
    });

    /* ---------- INCREMENT COUNTERS ---------- */
    if (!isPro) {
      await supabase
        .from("profiles")
        .update(
          isFreelancer
            ? { freelancer_count: profile.freelancer_count + 1 }
            : { student_count: profile.student_count + 1 }
        )
        .eq("id", data.user.id);
    }

    return NextResponse.json({
      proposal,
      remaining: currentLimit - currentCount - (isPro ? 0 : 1),
      mode,
      isPro,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
