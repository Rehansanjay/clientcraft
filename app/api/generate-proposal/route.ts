import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

interface UserProfile {
  plan: string;
  proposal_count: number;
  subscription_active: boolean;
}

// Initialization with "!" ensures TypeScript doesn't complain
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const FREE_LIMIT = 3;

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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Generate proposal for: ${body.input}` }],
    });

    const proposal = completion.choices[0]?.message?.content || "";

    // Insert into proposals table
    await supabase.from("proposals").insert({
      user_id: user.id,
      content: proposal,
      industry: body.industry,
      goal: body.goal,
      tone: body.tone,
      confidence_score: 8
    });

    // Update count for free users
    if (!isPro) {
      await supabase.from("profiles").update({ 
        proposal_count: (typedProfile?.proposal_count || 0) + 1 
      }).eq("id", user.id);
    }

    return NextResponse.json({ proposal });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}