import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// Initialize Supabase with Service Role for admin overrides (counting/profiles)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const FREE_LIMIT = 3;

/**
 * Logic to evaluate the "readiness" of a proposal based on inputs
 */
function evaluateSendStatus(tone: string, makeClientFocused: boolean) {
  if (tone === "bold" && makeClientFocused) {
    return {
      status: "send-ready",
      reason: "Clear positioning with concrete example and client decision risk addressed.",
    };
  }

  if (tone === "safe") {
    return {
      status: "review",
      reason: "Professional and trustworthy, but could speak more directly to client risk.",
    };
  }

  return {
    status: "revise",
    reason: "Needs clearer relevance or stronger positioning.",
  };
}

export async function POST(req: Request) {
  try {
    // 1. Auth Validation
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User Profile for Limit Checking
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, proposal_count, subscription_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 401 });
    }

    const isPro = profile.plan === "pro" && profile.subscription_active === true;

    // 3. Usage Limit Enforcement
    if (!isPro && profile.proposal_count >= FREE_LIMIT) {
      return NextResponse.json({ error: "Free limit reached" }, { status: 403 });
    }

    // 4. Parse Request Body
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

    // 5. AI Generation via Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional freelancer writing client proposals.
          Rules:
          - Max 120 words
          - One realistic example
          - Calm, human tone
          - Never generic
          ${makeClientFocused && isPro ? "- Address client decision risk explicitly" : ""}`,
        },
        {
          role: "user",
          content: `
          Client context: ${input}
          Role: ${role}
          Industry: ${industry}
          Goal: ${goal}
          Priority: ${priority}
          Tone: ${tone}
          Notes: ${goalNote || ""} ${priorityNote || ""} ${contextNote || ""}`,
        },
      ],
    });

    const proposal = completion.choices[0].message.content || "";

    // 6. Save Proposal to Database
    const { error: insertError } = await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry,
      goal,
      tone,
      send_status: sendEval.status,
      send_reason: isPro ? sendEval.reason : null,
      confidence_score: 8, // Default or derived score
    });

    if (insertError) throw insertError;

    // 7. Update Usage Count for Free Users
    if (!isPro) {
      await supabase
        .from("profiles")
        .update({
          proposal_count: (profile.proposal_count || 0) + 1,
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
    console.error("Internal Server Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}