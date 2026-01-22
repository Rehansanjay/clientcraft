import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
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
      return NextResponse.json({ error: "Unauthorized: Missing Auth Header" }, { status: 401 });
    }

    // Standard Client for Auth Verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return NextResponse.json({ error: "Unauthorized: Invalid Token or User not found" }, { status: 401 });
    }

    /* ---------- ADMIN CLIENT (BYPASS RLS) ---------- */
    // Initialize early for robust operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ---------- PROFILE ---------- */
    // 1. Check with User Client (Standard)
    let { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_active, freelancer_count, student_count")
      .eq("id", user.id)
      .single();

    // 2. If missing, Check with Admin Client (Hidden by RLS?)
    if (!profile) {
      console.log("Profile missing (Standard). Checking Admin...");
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("plan, subscription_active, freelancer_count, student_count")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        console.log("Profile found via Admin. Using it.");
        profile = existingProfile;
      } else {
        // 3. Really missing -> Create (Admin)
        console.log("Profile really missing. Creating...");
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: user.id,
            plan: "free",
            subscription_active: false,
            freelancer_count: 0,
            student_count: 0,
          })
          .select("plan, subscription_active, freelancer_count, student_count")
          .single();

        if (createError || !newProfile) {
          console.error("Profile Creation Failed:", createError);
          return NextResponse.json({
            error: `Profile creation failed: ${createError?.message}`
          }, { status: 500 });
        }
        profile = newProfile;
      }
    }

    const isPro = profile.plan === "pro" && profile.subscription_active === true;

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
    const currentCount = isFreelancer ? profile.freelancer_count : profile.student_count;
    const currentLimit = isFreelancer ? FREELANCER_LIMIT : STUDENT_LIMIT;

    if (!isPro && currentCount >= currentLimit) {
      return NextResponse.json({ error: "Free limit reached" }, { status: 403 });
    }

    /* ---------- ROBUST SAVE: START (PENDING) ---------- */
    // Insert "Pending" record immediately so we have a DB row even if stream fails
    console.log("Creating PENDING proposal...");

    const { data: proposalData, error: insertError } = await supabaseAdmin
      .from("proposals")
      .insert({
        user_id: user.id,
        content: "(Generating...)", // Placeholder
        industry,
        goal,
        tone,
        send_status: "pending",
        send_reason: null, // Will update later
      })
      .select("id")
      .single();

    if (insertError || !proposalData) {
      console.error("Pending Insert Failed:", insertError);
      return NextResponse.json({ error: "Database Write Failed" }, { status: 500 });
    }

    const proposalId = proposalData.id;
    console.log("Pending Proposal Created:", proposalId);


    /* ---------- SYSTEM PROMPT ---------- */
    const systemPrompt =
      mode === "student"
        ? `
You are a student or early-career developer sending a cold message to a professional recruiter or founder.

GOAL: Get a reply and build a connection.

RULES:
- Start with "Hi [Name]," (if the name is known) or "Hi there,".
- Tone: Formal, polite, but NOT robotic/HR-like. Be warm and human.
- NO generic openers like "I hope you are well" or "I came across".
- Reference a specific detail from their context immediately.
- Explain "Why me" briefly (connect your skill to their need).
- End with a low-friction question.
- Max 60-70 words.
- NO emojis.

Structure:
"Hi [Name],
[Specific observation about their work/post]. [Brief value prop/connection].
[Question]?"

Write ONLY the message body.
`
        : `
You are a top-tier freelancer sending a proposal to a client.

GOAL: Win confidence immediately. Be direct, professional, and "peer-to-peer".

RULES:
- Start with "Hi [Name]," (if the name is found) or "Hi,".
- Tone: Professional, confident, conversational (not stiff/corporate).
- SKIP "I am writing to...", "I have X years of experience...".
- Focus entirely on THEIR problem and YOUR solution.
- Use spacing/bullets if it helps readability.
- Max 100 words.

Structure:
"Hi [Name],
[Direct acknowledgment of their pain point/goal].
[How you solve it specifically].
[Call to action/Next step]."

Write ONLY the proposal body.
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

    /* ---------- AI STREAMING ---------- */
    console.log("Starting streamText...");

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      temperature: mode === "student" ? 0.55 : 0.7,
      system: systemPrompt,
      prompt: userPrompt,

      onFinish: async ({ text }) => {
        console.log("Stream finished. Updating proposal:", proposalId);
        if (!text) return;

        try {
          // ROBUST SAVE: COMPLETE
          // Update the pending record with final text
          const evalResult = evaluateSendStatus({ tone, makeClientFocused });

          const { error: updatePropError } = await supabaseAdmin
            .from("proposals")
            .update({
              content: text,
              send_status: evalResult.status,
              send_reason: isPro ? evalResult.reason : null,
            })
            .eq("id", proposalId);

          if (updatePropError) {
            console.error("Proposal Update Failed:", updatePropError);
          } else {
            console.log("Proposal Updated to COMPLETE.");
          }

          /* ---------- INCREMENT COUNTERS ---------- */
          if (!isPro) {
            const { error: updateCountError } = await supabaseAdmin
              .from("profiles")
              .update(
                isFreelancer
                  ? { freelancer_count: profile.freelancer_count + 1 }
                  : { student_count: profile.student_count + 1 }
              )
              .eq("id", user.id);

            if (updateCountError) console.error("Counter Update Failed:", updateCountError);
          }

        } catch (dbError) {
          console.error("DB Update failed (catch):", dbError);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("Route Error:", err);
    return NextResponse.json(
      { error: "Server error: " + (err as Error).message },
      { status: 500 }
    );
  }
}
