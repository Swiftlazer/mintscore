"use client";

import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  description: string;
  url: string;
}

export default function ShareButtons({ title, description, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — ${description}`);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      label: "Share on X",
    },
    {
      name: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      label: "Share on WhatsApp",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      label: "Share on Telegram",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
      label: "Share on Facebook",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-bone/40">
        Share this prediction
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {platforms.map(p => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.label}
            className="rounded-full border border-hairline bg-mist/40 px-4 py-1.5 text-xs font-semibold text-bone/80 transition hover:border-flag/50 hover:bg-flag/5 hover:text-flag"
          >
            {p.name}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="rounded-full border border-hairline bg-mist/40 px-4 py-1.5 text-xs font-semibold text-bone/80 transition hover:border-flag/50 hover:bg-flag/5 hover:text-flag"
        >
          {copied ? "Link copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
