"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PUBLIC_WHEEL_COLORS, visibleSegmentMidpoint, type PublicWheelSegment,
} from "@/lib/cashbox/wheel-public";

function polar(degrees: number, radius: number) {
  const radians = (degrees - 90) * Math.PI / 180;
  return { x: 160 + radius * Math.cos(radians), y: 160 + radius * Math.sin(radians) };
}
function sector(start: number, end: number) {
  const first = polar(start, 140);
  const last = polar(end, 140);
  const sweep = end - start;
  return `M 160 160 L ${first.x} ${first.y} A 140 140 0 ${sweep > 180 ? 1 : 0} 1 ${last.x} ${last.y} Z`;
}

type WheelResponse = {
  outcome?: string | null;
  label?: string | null;
  detail?: string | null;
  icon?: string | null;
  segments?: PublicWheelSegment[];
  canResetForTest?: boolean;
  error?: string;
};

export default function PenaltyFunWheel({ penaltyId }: { penaltyId: number }) {
  const [segments, setSegments] = useState<PublicWheelSegment[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [icon, setIcon] = useState("🎡");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [canResetForTest, setCanResetForTest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [reveal, setReveal] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showResultPopup) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowResultPopup(false);
    };
    window.addEventListener("keydown", onEscape);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [showResultPopup]);


  useEffect(() => {
    let active = true;
    setLoading(true);
    setShowResultPopup(false);
    void fetch(`/api/penalties/wheel?penaltyId=${penaltyId}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json() as WheelResponse;
        if (!r.ok) throw new Error(data.error || "Schicksalsrad nicht verfügbar.");
        return data;
      }).then((data) => {
        if (!active) return;
        const next = data.segments ?? [];
        setSegments(next);
        setCanResetForTest(data.canResetForTest === true);
        setOutcome(data.outcome || null);
        setMessage(data.label || "");
        setDetail(data.detail || "");
        setIcon(data.icon || "🎡");
        setRotation(data.outcome ? (360 - visibleSegmentMidpoint(next, data.outcome)) % 360 : 0);
        setAnimate(false);
        setReveal(true);
      }).catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Rad nicht verfügbar.");
      }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [penaltyId]);

  async function spin() {
    if (busy || loading || outcome) return;
    setBusy(true);
    setShowResultPopup(false);
    setError("");
    try {
      const response = await fetch("/api/penalties/wheel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyId }),
      });
      const data = await response.json() as WheelResponse;
      if (!response.ok || !data.outcome) throw new Error(data.error || "Dreh fehlgeschlagen.");
      const nextSegments = data.segments ?? segments;
      const selected = nextSegments.find((item) => item.id === data.outcome);
      setSegments(nextSegments);
      setCanResetForTest(data.canResetForTest === true);
      setOutcome(data.outcome);
      setMessage(data.label || selected?.label || "Ergebnis");
      setDetail(data.detail || selected?.description || "");
      setIcon(data.icon || selected?.icon || "🎡");
      setReveal(false);
      setAnimate(true);
      const target = (360 - visibleSegmentMidpoint(nextSegments, data.outcome)) % 360;
      setRotation((prev) => {
        const current = ((prev % 360) + 360) % 360;
        return prev + 6 * 360 + ((target - current + 360) % 360);
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setReveal(true);
        setShowResultPopup(true);
      }, 3200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Das Rad konnte nicht gedreht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function resetTestSpin() {
    if (!canResetForTest || !outcome || busy || resetting || !reveal) return;
    setResetting(true);
    setError("");
    try {
      const response = await fetch("/api/penalties/wheel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyId }),
      });
      const data = await response.json() as WheelResponse;
      if (!response.ok) throw new Error(data.error || "Zurücksetzen fehlgeschlagen.");
      if (timer.current) clearTimeout(timer.current);
      setShowResultPopup(false);
      setSegments(data.segments ?? []);
      setCanResetForTest(data.canResetForTest === true);
      setOutcome(null);
      setMessage("");
      setDetail("");
      setIcon("🎡");
      setAnimate(false);
      setRotation(0);
      setReveal(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Testdreh konnte nicht zurückgesetzt werden.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <details className="group mt-3 overflow-hidden rounded-[24px] border border-slate-800/15 bg-gradient-to-br from-slate-950 via-[#0b1828] to-[#10384b] p-4 text-white shadow-[0_18px_55px_rgba(2,8,23,.16)]">
      <summary className="cursor-pointer text-sm font-black tracking-tight text-cyan-100 marker:text-cyan-400">
        🎡 Schicksalsrad · {outcome ? "Dein Ergebnis ansehen" : "Traust du dich?"}
      </summary>
      <div className="mt-3 space-y-3">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Dreh oder zahl?</p>
          <p className="mt-1 text-[11px] text-slate-300">
            {canResetForTest
              ? "Testmodus: Dreh so oft du willst!"
              : "Die Kabine ist gespannt. Ein Versuch pro Strafe."}
          </p>
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-[290px]">
          <div className="pointer-events-none absolute -inset-4 rounded-full bg-cyan-400/10 blur-2xl" aria-hidden="true" />
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_5px_rgba(0,0,0,.6)]">
            <svg width="32" height="37" viewBox="0 0 32 37" role="img" aria-label="Zeiger">
              <path d="M5 3 H27 L16 31 Z" fill="#67E8F9" stroke="#08202E" strokeWidth="2.5"/>
            </svg>
          </div>
          <div className="relative rounded-full border border-white/20 bg-gradient-to-br from-slate-700 via-[#091725] to-slate-950 p-[6px] shadow-[0_20px_45px_rgba(0,0,0,.52),inset_0_1px_2px_rgba(255,255,255,.2)]">
            <div className="rounded-full border border-cyan-200/35 bg-[#091725] p-[2px]">
            <svg viewBox="0 0 320 320" role="img" aria-label="Schicksalsrad mit vereinsindividuellen Feldern"
              className="block w-full rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: animate ? "transform 3200ms cubic-bezier(.13,.83,.17,1)" : "none",
              }}>
              {segments.map((segment, index) => {
                // The sectors intentionally have identical visual sizes.
                // True (possibly unequal) probabilities never reach the client.
                const start = index * 360 / segments.length;
                const end = (index + 1) * 360 / segments.length;
                const center = (start + end) / 2;
                const small = end - start < 28;
                const dense = segments.length >= 8;
                const point = polar(center, small || dense ? 120 : 112);
                const textPoint = polar(center, dense ? 88 : segments.length >= 6 ? 83 : 76);
                const maxLabelLength = dense ? 7 : segments.length >= 6 ? 9 : 12;
                return (
                  <g key={segment.id}>
                    <path d={sector(start, end)} fill={PUBLIC_WHEEL_COLORS[index % PUBLIC_WHEEL_COLORS.length]}
                      stroke="#071523" strokeWidth="1.6" strokeLinejoin="round"/>
                    <text x={point.x} y={point.y} textAnchor="middle" dominantBaseline="central"
                      fontSize={small ? 13 : 23}>{segment.icon}</text>
                    {!small && (
                      <text x={textPoint.x} y={textPoint.y} textAnchor="middle"
                        dominantBaseline="central" fontSize={dense ? "8" : segments.length >= 6 ? "9" : "10"} fontWeight="800" fill="#fff"
                        stroke="#041725" strokeWidth=".5" paintOrder="stroke">
                        {segment.label.length > maxLabelLength ? segment.label.slice(0, maxLabelLength - 1) + "…" : segment.label}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="139" fill="none" stroke="#BDF7FC" strokeOpacity=".5" strokeWidth="1.3"/>
              <circle cx="160" cy="160" r="43" fill="#061622" stroke="#62DCEB" strokeOpacity=".6" strokeWidth="2"/>
              <circle cx="160" cy="160" r="37" fill="#0A2132" stroke="#FFFFFF" strokeOpacity=".17" strokeWidth="1"/>
              <text x="160" y="163" textAnchor="middle" fill="white" fontSize="23" fontWeight="900">strikr</text>
              <text x="160" y="179" textAnchor="middle" fill="#73E8ED"
                fontSize="9" fontWeight="800" letterSpacing="1.2">SCHICKSAL</text>
            </svg>
            </div>
          </div>
        </div>

        {outcome ? (
          <div className="space-y-2 text-center">
            {!reveal ? (
              <p role="status" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100">
                🎡 Das Schicksal entscheidet …
              </p>
            ) : (
              <button type="button" onClick={() => setShowResultPopup(true)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm font-black text-white transition hover:bg-white/20">
                🎁 Dein Ergebnis nochmal ansehen
              </button>
            )}
          </div>
        ) : (
          <button type="button" disabled={busy || loading || !!error} onClick={() => void spin()}
            className="w-full rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-black text-slate-950 shadow-[0_8px_25px_rgba(34,211,238,.22)] transition hover:bg-white disabled:opacity-50">
            {loading ? "Rad wird geladen …" : busy ? "Ergebnis wird gespeichert …" : "🎡 JETZT DREHEN"}
          </button>
        )}
        {canResetForTest && (
          <div className="rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3">
            <p className="text-xs font-black text-cyan-100">🧪 Nur zum Testen</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">
              Du darfst diese Teststrafe zurücksetzen und beliebig oft neu drehen.
              Es wird nur das Testergebnis gelöscht – keine echte Strafe oder Zahlung verändert.
            </p>
            {outcome && (
              <button type="button" onClick={() => void resetTestSpin()}
                disabled={resetting || busy || !reveal}
                className="mt-3 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50">
                {resetting ? "Testdreh wird zurückgesetzt …" : "🔄 Zurücksetzen & nochmal drehen"}
              </button>
            )}
          </div>
        )}
        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      </div>
      {showResultPopup && outcome && reveal
        ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => setShowResultPopup(false)} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-labelledby="wheel-result-title"
              aria-describedby="wheel-result-description"
              data-strikr-wheel-result
              className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[420px] overflow-y-auto rounded-[28px] border border-cyan-200/50 bg-white text-center shadow-[0_24px_90px_rgba(0,0,0,.48)]">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#124a59] to-cyan-700 px-5 pb-12 pt-9 text-white">
                <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true"/>
                <div className="absolute -right-12 top-10 h-36 w-36 rounded-full bg-violet-300/20 blur-3xl" aria-hidden="true"/>
                <p className="relative text-[11px] font-black uppercase tracking-[.23em] text-cyan-100">
                  🎡 Das Schicksal hat entschieden!
                </p>
                <div className="relative mx-auto mt-7 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/60 bg-white/15 text-7xl shadow-[0_0_45px_rgba(103,232,249,.4)] sm:h-36 sm:w-36" aria-hidden="true">
                  {icon}
                </div>
              </div>
              <div className="relative -mt-6 space-y-3 rounded-t-[28px] bg-white px-5 pb-6 pt-6">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Dein Ergebnis</p>
                <h2 id="wheel-result-title" className="break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                  {message}
                </h2>
                <p id="wheel-result-description" className="mx-auto max-w-[320px] whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
                  {detail || "Dein Ergebnis wurde gespeichert."}
                </p>
                <p className="text-[11px] leading-5 text-slate-500">
                  Die ursprüngliche Geld- oder Bierstrafe bleibt unverändert.
                </p>
                <button ref={closeButtonRef} type="button" onClick={() => setShowResultPopup(false)}
                  className="mt-2 w-full rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700">
                  Alles klar! 🙌
                </button>
                {canResetForTest && (
                  <button type="button" onClick={() => void resetTestSpin()}
                    disabled={resetting || busy}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-900 disabled:opacity-50">
                    {resetting ? "Testdreh zurücksetzen …" : "🧪 Nur Test: Zurücksetzen & nochmal drehen"}
                  </button>
                )}
              </div>
            </div>
            <style>{`
              @keyframes strikrResultPop {
                from { opacity: 0; transform: translateY(28px) scale(.84); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              [data-strikr-wheel-result] {
                animation: strikrResultPop .42s cubic-bezier(.18,1.1,.3,1) both;
              }
              @media (prefers-reduced-motion: reduce) {
                [data-strikr-wheel-result] { animation: none; }
              }
            `}</style>
          </div>,
          document.body,
        )
        : null}
    </details>
  );
}
