import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#1F2937] mt-32">
      {/* MAIN FOOTER */}
      <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* BRAND */}
        <div>
          <h3 className="text-lg font-semibold">Klynexa</h3>
          <p className="text-sm text-[#9AA4B2] mt-3 max-w-xs leading-relaxed">
            Intelligent proposal systems for professionals who work with serious clients.
          </p>
        </div>

        {/* PRODUCT */}
        <div>
          <h4 className="text-sm font-medium mb-4">Product</h4>
          <ul className="space-y-3 text-sm text-[#9AA4B2]">
            <li>
              <Link href="/generate" className="hover:underline">
                Generate
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:underline">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        {/* COMPANY */}
        <div>
          <h4 className="text-sm font-medium mb-4">Company</h4>
          <ul className="space-y-3 text-sm text-[#9AA4B2]">
            <li>
              <a
                href="mailto:klynexa.app@gmail.com"
                className="hover:underline"
              >
                Contact
              </a>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHTS / LEGAL BAR */}
      <div className="border-t border-[#1F2937]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-[#9AA4B2]">
          <span>
            © {new Date().getFullYear()} Klynexa. All rights reserved.
          </span>
          <span className="text-xs">
            Built for professionals · Secure · Privacy-first
          </span>
        </div>
      </div>
    </footer>
  );
}
