"use client";

interface Props<T extends string | number> {
  /** Section label shown to the left of the pills, e.g. "By league". */
  label: string;
  /** Available filter options in display order. */
  options: Array<{ value: T; label: string }>;
  /** Currently active subset. null/empty = "show all". */
  active: Set<T> | null;
  /** Called when the active set changes. */
  onChange: (next: Set<T> | null) => void;
}

export default function FilterPills<T extends string | number>({
  label,
  options,
  active,
  onChange,
}: Props<T>) {
  const allActive = active === null || active.size === 0;

  const toggleOne = (value: T) => {
    const next = new Set(active ?? []);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next.size === 0 ? null : next);
  };

  const reset = () => onChange(null);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <p className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-bone/50">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={reset}
          aria-pressed={allActive}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            allActive
              ? "bg-flag text-ink"
              : "border border-hairline bg-mist/40 text-bone/70 hover:border-bone/40"
          }`}
        >
          All
        </button>
        {options.map(opt => {
          const isActive = !allActive && active!.has(opt.value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => toggleOne(opt.value)}
              aria-pressed={isActive}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? "bg-flag text-ink"
                  : "border border-hairline bg-mist/40 text-bone/70 hover:border-bone/40"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
