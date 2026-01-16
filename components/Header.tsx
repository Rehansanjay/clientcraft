"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-black/10 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight"
        >
          Klynexa
        </Link>
      </div>
    </header>
  );
}
