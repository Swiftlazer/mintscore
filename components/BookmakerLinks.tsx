import { BOOKMAKERS, affiliateLinkWithTracking } from "@/lib/bookmakers";

export default function BookmakerLinks({
  matchId,
  source = "match",
}: {
  matchId?: number;
  source?: "match" | "bonus" | "header" | "footer";
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-bone/40">
        Place this bet at
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {BOOKMAKERS.map(bm => (
          <a
            key={bm.id}
            href={affiliateLinkWithTracking(bm, source, matchId)}
            target="_blank"
            rel="noopener sponsored"
            className="group flex items-center justify-center rounded-md border border-hairline bg-ink/60 px-3 py-3 text-sm font-semibold text-bone/80 transition hover:border-flag/50 hover:bg-flag/5 hover:text-flag"
          >
            {bm.name}
            <span className="ml-1.5 text-bone/40 transition group-hover:text-flag">↗</span>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-bone/40">
        Affiliate links, Mintscore earns commission if you sign up. Doesn't affect odds you receive.
      </p>
    </div>
  );
}
