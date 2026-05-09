import Link from "next/link";

const NAV = [
  { href: "/", label: "Predictions" },
  { href: "/bonuses", label: "Bonuses" },
  { href: "/learn", label: "Learn" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold tracking-tighter text-paper">
            Mint<span className="text-flag">score</span>
          </span>
          <span className="hidden text-[10px] font-mono uppercase tracking-widest text-bone/50 sm:inline">
            v0.1
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-bone/80 transition hover:bg-mist hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
