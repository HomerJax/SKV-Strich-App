"use client";

import { useState } from "react";
import { ExternalLink, Instagram, Play } from "lucide-react";

type Props = {
  permalink: string;
  embedUrl: string;
  title: string;
};

export default function InstagramReelEmbed({ permalink, embedUrl, title }: Props) {
  const [hasConsent, setHasConsent] = useState(false);

  return (
    <article className="min-w-0 overflow-hidden rounded-[24px] border border-white/12 bg-[#101725]">
      <div className="relative mx-auto aspect-[9/13] w-full max-w-[400px] overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(45,212,191,0.17),transparent_45%),linear-gradient(145deg,#141c2b,#060a11)]">
        {hasConsent ? (
          <iframe
            src={embedUrl}
            title={title + " – Instagram-Reel"}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 shadow-[0_0_70px_rgba(34,211,238,0.2)]">
              <Play className="ml-1 h-8 w-8 fill-cyan-200 text-cyan-200" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-black tracking-tight text-white">{title}</p>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Beim Abspielen wird Instagram geladen. Dabei können Daten an Meta übertragen und Cookies gesetzt werden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHasConsent(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              aria-label={title + " von Instagram laden"}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Reel hier abspielen
            </button>
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-white/50 underline underline-offset-2 hover:text-white"
            >
              Datenschutzhinweise von Meta
            </a>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/60">
          <Instagram className="h-4 w-4" aria-hidden="true" />
          @getstrikr
        </span>
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 transition hover:text-white"
        >
          Auf Instagram <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
