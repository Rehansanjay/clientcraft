import Image from "next/image";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0B0F14] border-r border-[#1C2330] p-4">
      
      <div className="mb-8">
        <Image
          src="/logo/klynexa-symbol.svg"
          alt="Klynexa"
          width={32}
          height={32}
        />
      </div>

      <nav className="space-y-4 text-sm text-[#9AA4B2]">
        <div>Systems</div>
        <div>Studio</div>
        <div>Flows</div>
        <div>Vault</div>
        <div>Insights</div>
      </nav>
    </aside>
  );
}
