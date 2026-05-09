"use client";

import { useState } from "react";

interface Props {
  title: string;
  description: string;
  url: string;
  /** Compact variant uses smaller icons and tighter spacing for use inside cards. */
  compact?: boolean;
  /** Optional heading (only shown in non-compact variant). */
  heading?: string;
}

/* ---------- Brand SVG icons ---------- */

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817L4.99 21.75H1.683l7.73-8.835L1.255 2.25H8.08l4.713 6.231zm-1.16 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.519 5.276l-.999 3.648 3.969-1.04zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.713.308 1.27.492 1.704.629.716.227 1.367.195 1.882.118.574-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

function TelegramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

function CopyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ---------- Component ---------- */

export default function ShareButtons({ title, description, url, compact = false, heading }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title}. ${description}`);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    {
      name: "X",
      Icon: XIcon,
      hoverClass: "hover:text-paper hover:bg-ink",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      ariaLabel: "Share on X",
    },
    {
      name: "WhatsApp",
      Icon: WhatsAppIcon,
      hoverClass: "hover:text-[#25D366] hover:bg-[#25D366]/10",
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      ariaLabel: "Share on WhatsApp",
    },
    {
      name: "Telegram",
      Icon: TelegramIcon,
      hoverClass: "hover:text-[#26A5E4] hover:bg-[#26A5E4]/10",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      ariaLabel: "Share on Telegram",
    },
    {
      name: "Facebook",
      Icon: FacebookIcon,
      hoverClass: "hover:text-[#0866FF] hover:bg-[#0866FF]/10",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
      ariaLabel: "Share on Facebook",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${title}. ${description} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = `${title}. ${description} ${url}`;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const iconSize = compact ? 14 : 18;
  const buttonClass = compact
    ? "p-1.5 rounded-md"
    : "px-3 py-2 rounded-md";

  return (
    <div className={compact ? "" : ""}>
      {!compact && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-bone/40">
          {heading ?? "Share"}
        </p>
      )}
      <div className={`${compact ? "mt-0" : "mt-3"} flex flex-wrap items-center gap-1.5`}>
        {platforms.map(p => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.ariaLabel}
            className={`${buttonClass} border border-hairline bg-mist/40 text-bone/70 transition ${p.hoverClass}`}
          >
            <p.Icon size={iconSize} />
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          aria-label={copied ? "Copied" : "Copy link"}
          className={`${buttonClass} border border-hairline bg-mist/40 text-bone/70 transition hover:text-flag hover:bg-flag/5 ${copied ? "text-edge border-edge/40" : ""}`}
        >
          {copied ? <CheckIcon size={iconSize} /> : <CopyIcon size={iconSize} />}
        </button>
      </div>
    </div>
  );
}
