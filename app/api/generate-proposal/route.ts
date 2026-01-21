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
    console.log("Auth Header present:", !!authHeader); // Debug log

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Missing Auth Header" }, { status: 401 });
    }

    // Create a Supabase client scoped to this user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      console.error("Auth Error:", userError);
      return NextResponse.json({ error: "Unauthorized: Invalid Token or User not found" }, { status: 401 });
    }

    console.log("User found:", data.user.id);

    /* ---------- PROFILE ---------- */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "plan, subscription_active, freelancer_count, student_count"
      )
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile Missing Error:", profileError);
      return NextResponse.json({ error: "Unauthorized: Profile missing. Please log out and back in." }, { status: 401 });
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
    // Using Vercel AI SDK 'streamText'
    console.log("Starting streamText...");

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      temperature: mode === "student" ? 0.55 : 0.7,
      maxTokens: mode === "student" ? 140 : 320,
      system: systemPrompt,
      prompt: userPrompt,
      onFinish: async ({ text }: { text: string }) => {
        console.log("Stream finished. Text length:", text?.length);
        if (!text) {
          console.error("No text generated!");
          return;
        }

        try {
          /* ---------- SAVE ---------- */
          // Re-create user client inside callback or use the one from closure?
          // The 'supabase' client from closure relies on 'authHeader'.
          // 'streamText' might run after the request loop, but 'supabase' object capturing 'authHeader' should persist.

          const { error: insertError } = await supabase.from("proposals").insert({
            user_id: data.user.id,
            content: text,
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

          if (insertError) {
            console.error("Supabase Insert Error:", insertError);
          } else {
            console.log("Proposal saved to DB.");
          }

          /* ---------- INCREMENT COUNTERS ---------- */
          if (!isPro) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update(
                isFreelancer
                  ? { freelancer_count: profile.freelancer_count + 1 }
                  : { student_count: profile.student_count + 1 }
              )
              .eq("id", data.user.id);

            if (updateError) console.error("Profile Update Error:", updateError);
          }
        } catch (dbError) {
          console.error("DB Save failed (catch):", dbError);
        }
      },
    } as any);

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("Route Error:", err);
    return NextResponse.json(
      { error: "Server error: " + (err as Error).message },
      { status: 500 }
    );
  }
}
