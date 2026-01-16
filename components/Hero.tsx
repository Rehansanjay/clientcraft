import Image from "next/image";

export default function Hero() {
  return (
    <section className="min-h-[90vh] flex items-center">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <div>
          <h1 className="text-5xl font-semibold leading-tight">
            Intelligent systems<br />for serious work
          </h1>

          <p className="mt-6 text-[#9AA4B2] max-w-lg">
            Design, deploy, and scale intelligent workflows that bring clarity
            and control to complex work.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button className="bg-[#2F6BFF] px-6 py-3 rounded-md text-white">
              Get Started
            </button>
            <button className="text-[#9AA4B2]">
              View Documentation
            </button>
          </div>

          <p className="mt-6 text-sm text-[#9AA4B2]">
            Built for teams that value clarity over chaos.
          </p>
        </div>

        {/* RIGHT */}
        <div className="relative flex justify-center">
          <Image
            src="/logo/klynexa-symbol.svg"
            alt="Klynexa Symbol"
            width={360}
            height={360}
            className="opacity-20"
          />
        </div>

      </div>
    </section>
  );
}
