import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const FREE_LIMIT = 3;

/* ---------- SEND STATUS LOGIC ---------- */
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
      reason:
        "Clear positioning, concrete example, and client decision risk addressed.",
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
    reason:
      "Needs clearer relevance or stronger positioning for this client.",
  };
}

export async function POST(req: Request) {
  try {
    /* ---------- ENV (RUNTIME SAFE) ---------- */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !groqKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const groq = new Groq({ apiKey: groqKey });

    /* ---------- AUTH ---------- */
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

    /* ---------- PROFILE ---------- */
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

    /* ---------- FREE LIMIT ---------- */
    if (!isPro && profile.proposal_count >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Free limit reached" },
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
      makeClientFocused,
    } = await req.json();

    /* ---------- SEND STATUS ---------- */
    const sendEval = evaluateSendStatus({
      tone,
      makeClientFocused,
    });

    /* ---------- AI ---------- */
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

    /* ---------- SAVE PROPOSAL ---------- */
    await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry,
      goal,
      tone,
      send_status: sendEval.status,
      send_reason: isPro ? sendEval.reason : null,
    });

    /* ---------- USAGE ---------- */
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
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
