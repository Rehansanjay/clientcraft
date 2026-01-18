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

const FREE_LIMIT = 3;

/* ---------- SEND STATUS ---------- */
function evaluateSendStatus(tone: string, makeClientFocused: boolean) {
  if (tone === "bold" && makeClientFocused) {
    return {
      status: "send-ready",
      reason:
        "Clear positioning with concrete example and client decision risk addressed.",
    };
  }

  if (tone === "safe") {
    return {
      status: "review",
      reason:
        "Professional and trustworthy, but could speak more directly to client risk.",
    };
  }

  return {
    status: "revise",
    reason: "Needs clearer relevance or stronger positioning.",
  };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan, proposal_count, subscription_active")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 401 }
      );
    }

    const isPro =
      profile.plan === "pro" && profile.subscription_active === true;

    if (!isPro && profile.proposal_count >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Free limit reached" },
        { status: 403 }
      );
    }

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
      makeClientFocused,
    } = await req.json();

    const sendEval = evaluateSendStatus(tone, makeClientFocused);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are a professional freelancer writing client proposals.

Rules:
- Max 120 words
- One realistic example
- Calm, human tone
- Never generic
${makeClientFocused && isPro ? "- Address client decision risk explicitly" : ""}
`,
        },
        {
          role: "user",
          content: `
Client context:
${input}

Role: ${role}
Industry: ${industry}
Goal: ${goal}
Priority: ${priority}
Tone: ${tone}

Notes:
${goalNote || ""}
${priorityNote || ""}
${contextNote || ""}
`,
        },
      ],
    });

    const proposal = completion.choices[0].message.content;

    await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry,
      goal,
      tone,
      send_status: sendEval.status,
      send_reason: isPro ? sendEval.reason : null,
    });

    if (!isPro) {
      await supabase
        .from("profiles")
        .update({
          proposal_count: profile.proposal_count + 1,
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      proposal,
      sendStatus: sendEval.status,
      sendReason: isPro ? sendEval.reason : null,
      isPro,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
