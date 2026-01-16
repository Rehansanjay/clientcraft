import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen px-6 py-20 flex justify-center">
      <div className="w-full max-w-5xl space-y-16">

        {/* TOP NAV */}
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="underline text-[var(--muted)]"
          >
            ← Home
          </Link>

          <span className="text-gray-300">•</span>

          <Link
            href="/generate"
            className="underline text-[var(--muted)]"
          >
            Generate
          </Link>
        </div>

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-[var(--muted)] text-lg">
            Start free. Upgrade only when it’s worth it.
          </p>
        </div>

        {/* PLANS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* FREE PLAN */}
          <div className="border rounded-2xl p-10">
            <h2 className="text-2xl font-semibold mb-2">Free</h2>
            <p className="text-[var(--muted)] mb-6">
              Try klynexa with no commitment
            </p>

            <div className="text-4xl font-semibold mb-8">
              ₹0
            </div>

            <ul className="space-y-4 text-sm mb-10">
              <li>✔ 3 proposal generations</li>
              <li>✔ Industry & goal tuning</li>
              <li>✔ Safe / Bold tone</li>
              <li>✔ Confidence score</li>
              <li className="text-[var(--muted)]">✖ Unlimited usage</li>
            </ul>

            <Link
              href="/generate"
              className="block text-center border rounded-md py-3 font-medium"
            >
              Continue free
            </Link>
          </div>

          {/* PRO PLAN */}
          <div className="border rounded-2xl p-10 bg-black text-white relative">

            {/* BADGE */}
            <div className="absolute top-6 right-6 text-xs bg-white text-black px-3 py-1 rounded-full">
              Most popular
            </div>

            <h2 className="text-2xl font-semibold mb-2">Pro</h2>
            <p className="text-gray-300 mb-6">
              For freelancers who want replies
            </p>

            <div className="text-4xl font-semibold mb-2">
              ₹499
            </div>
            <p className="text-sm text-gray-400 mb-8">
              per month
            </p>

            <ul className="space-y-4 text-sm mb-10">
              <li>✔ Unlimited proposals</li>
              <li>✔ Unlimited sharpen</li>
              <li>✔ Saved proposals dashboard</li>
              <li>✔ Priority generation</li>
              <li>✔ All future upgrades</li>
            </ul>

            {/* PAYMENT LATER */}
            <button
              className="w-full bg-white text-black py-3 rounded-md font-medium opacity-80 cursor-not-allowed"
            >
              Upgrade (coming soon)
            </button>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-sm text-[var(--muted)]">
          No contracts. Cancel anytime.
        </p>

      </div>
    </main>
  );
}
