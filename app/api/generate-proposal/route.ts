import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// Types to stop VS Code "red lines"
interface UserProfile {
  plan: string;
  proposal_count: number;
  subscription_active: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const FREE_LIMIT = 3;

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

    // 2. Fetch User Profile (Casting data to UserProfile interface)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, proposal_count, subscription_active")
      .eq("id", user.id)
      .single();

    const typedProfile = profile as UserProfile;

    if (profileError || !typedProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 401 });
    }

    const isPro = typedProfile.plan === "pro" && typedProfile.subscription_active === true;

    // 3. Usage Limit Enforcement
    if (!isPro && typedProfile.proposal_count >= FREE_LIMIT) {
      return NextResponse.json({ error: "Free limit reached" }, { status: 403 });
    }

    // 4. Parse Request Body
    const body = await req.json();
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
    } = body;

    const sendEval = evaluateSendStatus(tone, makeClientFocused);

    // 5. AI Generation
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

    const proposal = completion.choices[0]?.message?.content || "";

    // 6. Save Proposal
    const { error: insertError } = await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry,
      goal,
      tone,
      send_status: sendEval.status,
      send_reason: isPro ? sendEval.reason : null,
      confidence_score: 8,
    });

    if (insertError) throw insertError;

    // 7. Update Usage
    if (!isPro) {
      await supabase
        .from("profiles")
        .update({
          proposal_count: (typedProfile.proposal_count || 0) + 1,
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