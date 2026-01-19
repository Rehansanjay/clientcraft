import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// FIX: This stops the red lines in the logic below
interface UserProfile {
  plan: string;
  proposal_count: number;
  subscription_active: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const typedProfile = profile as UserProfile;

    const isPro = typedProfile?.plan === "pro" && typedProfile?.subscription_active;
    if (!isPro && (typedProfile?.proposal_count || 0) >= FREE_LIMIT) {
      return NextResponse.json({ error: "Limit reached" }, { status: 403 });
    }

    const body = await req.json();
    const sendEval = evaluateSendStatus(body.tone, body.makeClientFocused);

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
          ${body.makeClientFocused && isPro ? "- Address client decision risk explicitly" : ""}`,
        },
        {
          role: "user",
          content: `
          Client context: ${body.input}
          Role: ${body.role}
          Industry: ${body.industry}
          Goal: ${body.goal}
          Priority: ${body.priority}
          Tone: ${body.tone}
          Notes: ${body.goalNote || ""} ${body.priorityNote || ""} ${body.contextNote || ""}`,
        },
      ],
    });

    const proposal = completion.choices[0]?.message?.content || "";

    await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry: body.industry,
      goal: body.goal,
      tone: body.tone,
      send_status: sendEval.status,
      send_reason: isPro ? sendEval.reason : null,
      confidence_score: 8,
    });

    if (!isPro) {
      await supabase.from("profiles").update({ 
        proposal_count: (typedProfile.proposal_count || 0) + 1 
      }).eq("id", user.id);
    }

    return NextResponse.json({
      proposal,
      sendStatus: sendEval.status,
      sendReason: isPro ? sendEval.reason : null,
      isPro,
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}