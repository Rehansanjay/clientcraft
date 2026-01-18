"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "./lib/supabase";


export default function Home() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(() => {
      if (mounted) setCheckingAuth(false);
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleGenerateClick = async () => {
    const { data } = await supabase.auth.getSession();
    router.push(data.session ? "/generate" : "/login");
  };

  return (
    <main className="min-h-screen">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl space-y-6">

          <h1 className="text-6xl font-semibold tracking-tight">
            Klynexa
          </h1>

          <p className="text-lg text-gray-700">
            Proposal intelligence for freelancers who work with serious clients.
          </p>

          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Understands client intent, not just prompts</li>
            <li>• Writes proposals grounded in real business context</li>
            <li>• Controls tone, priority, and decision logic</li>
            <li>• Avoids generic AI language by design</li>
            <li>• Built for professionals, not experimentation</li>
          </ul>

          <div className="flex items-center gap-6 pt-4">
            <button
              onClick={handleGenerateClick}
              disabled={checkingAuth}
              className="bg-black text-white px-8 py-4 rounded-md font-medium disabled:opacity-50"
            >
              Generate your first proposal
            </button>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/dashboard" className="underline">
                Dashboard
              </Link>
              <span>•</span>
              <Link href="/pricing" className="underline">
                Pricing
              </Link>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            3 free proposals · No card required
          </p>
        </div>
      </section>

      {/* WHY */}
      <section className="max-w-6xl mx-auto px-6 py-28 border-t">
        <h2 className="text-3xl font-semibold mb-20">
          Why Klynexa works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <WhyItem
            number="01"
            title="Context over keywords"
            desc="Klynexa understands industry, client goals, and decision priorities before writing."
          />
          <WhyItem
            number="02"
            title="Control without prompt engineering"
            desc="You select intent and tone. The system handles the thinking."
          />
          <WhyItem
            number="03"
            title="Specific by design"
            desc="Every proposal includes concrete, realistic examples — no filler."
          />
        </div>
      </section>

      {/* HOW */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <h2 className="text-3xl font-semibold mb-4">
          How it works
        </h2>
        <p className="text-gray-600 mb-20">
          Less than 2 minutes from job post to send-ready proposal.
        </p>

        <div className="space-y-20 max-w-3xl">
          <Step
            number="01"
            title="Paste client context"
            desc="Job post, website, or brief — anything that explains what the client needs."
          />
          <Step
            number="02"
            title="Refine intent"
            desc="Choose industry, goal, priority, and tone."
          />
          <Step
            number="03"
            title="Generate & reuse"
            desc="Send immediately or reuse later from your dashboard."
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="rounded-2xl bg-black text-white p-14">
          <h2 className="text-3xl font-semibold mb-4">
            Clients don’t ignore good freelancers.
            <br />
            They ignore unclear proposals.
          </h2>

          <p className="text-gray-300 mb-8 max-w-2xl">
            Klynexa helps you respond with clarity and confidence —
            without sounding scripted.
          </p>

          <div className="flex items-center gap-6">
            <button
              onClick={handleGenerateClick}
              className="bg-white text-black px-8 py-4 rounded-md font-medium"
            >
              Generate a free proposal
            </button>

            <div className="flex items-center gap-4 text-sm text-gray-300">
              <Link href="/pricing" className="underline">
                Pricing
              </Link>
              <span>•</span>
              <Link href="/dashboard" className="underline">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

/* ---------- COMPONENTS ---------- */

function WhyItem({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <div className="text-5xl font-semibold text-gray-300 mb-6">
        {number}
      </div>
      <h3 className="text-xl font-medium mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-10">
      <div className="text-5xl font-semibold text-gray-300">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-medium mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
