"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_WHEEL_SEGMENTS, WHEEL_COLORS, getWheelSegmentMidpoint, type WheelSegment,
} from "@/lib/cashbox/wheel-config";

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
  segments?: WheelSegment[];
  error?: string;
};

export default function PenaltyFunWheel({ penaltyId }: { penaltyId: number }) {
  const [segments, setSegments] = useState<WheelSegment[]>(DEFAULT_WHEEL_SEGMENTS);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [icon, setIcon] = useState("🎡");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [reveal, setReveal] = useState(true);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch(`/api/penalties/wheel?penaltyId=${penaltyId}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json() as WheelResponse;
        if (!r.ok) throw new Error(data.error || "Schicksalsrad nicht verfügbar.");
        return data;
      }).then((data) => {
        if (!active) return;
        const next = data.segments?.length ? data.segments : DEFAULT_WHEEL_SEGMENTS;
        setSegments(next);
        setOutcome(data.outcome || null);
        setMessage(data.label || "");
        setDetail(data.detail || "");
        setIcon(data.icon || "🎡");
        setRotation(data.outcome ? (360 - getWheelSegmentMidpoint(next, data.outcome)) % 360 : 0);
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
    setError("");
    try {
      const response = await fetch("/api/penalties/wheel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyId }),
      });
      const data = await response.json() as WheelResponse;
      if (!response.ok || !data.outcome) throw new Error(data.error || "Dreh fehlgeschlagen.");
      const nextSegments = data.segments?.length ? data.segments : segments;
      const selected = nextSegments.find((item) => item.id === data.outcome);
      setSegments(nextSegments);
      setOutcome(data.outcome);
      setMessage(data.label || selected?.label || "Ergebnis");
      setDetail(data.detail || selected?.description || "");
      setIcon(data.icon || selected?.icon || "🎡");
      setReveal(false);
      setAnimate(true);
      const target = (360 - getWheelSegmentMidpoint(nextSegments, data.outcome)) % 360;
      setRotation((prev) => {
        const current = ((prev % 360) + 360) % 360;
        return prev + 6 * 360 + ((target - current + 360) % 360);
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setReveal(true), 3200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Das Rad konnte nicht gedreht werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 shadow-sm">
      <summary className="cursor-pointer text-xs font-black text-cyan-900">
        🎡 Schicksalsrad · {outcome ? "Dein Ergebnis ansehen" : "Traust du dich?"}
      </summary>
      <div className="mt-3 space-y-3">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-800">Dreh oder zahl?</p>
          <p className="mt-1 text-[11px] text-slate-600">
            Dein Verein hat die Felder und Chancen festgelegt. Ein Versuch pro Strafe.
          </p>
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-[290px]">
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow-md">
            <svg width="32" height="37" viewBox="0 0 32 37" role="img" aria-label="Zeiger">
              <path d="M3 2 H29 L16 34 Z" fill="white" stroke="#0A2536" strokeWidth="3"/>
            </svg>
          </div>
          <div className="rounded-full bg-slate-950 p-2 shadow-[0_12px_30px_rgba(10,35,55,.27)]">
            <svg viewBox="0 0 320 320" role="img" aria-label="Schicksalsrad mit vereinsindividuellen Feldern"
              className="block w-full rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: animate ? "transform 3200ms cubic-bezier(.13,.83,.17,1)" : "none",
              }}>
              {segments.map((segment, index) => {
                const start = segments.slice(0, index).reduce((sum, s) => sum + s.weight * 3.6, 0);
                const end = start + segment.weight * 3.6;
                const center = (start + end) / 2;
                const small = end - start < 28;
                const point = polar(center, small ? 119 : 100);
                const textPoint = polar(center, 70);
                return (
                  <g key={segment.id}>
                    <path d={sector(start, end)} fill={WHEEL_COLORS[index % WHEEL_COLORS.length]}
                      stroke="#F8FAFC" strokeWidth="2" strokeLinejoin="round"/>
                    <text x={point.x} y={point.y} textAnchor="middle" dominantBaseline="central"
                      fontSize={small ? 13 : 23}>{segment.icon}</text>
                    {!small && (
                      <text x={textPoint.x} y={textPoint.y} textAnchor="middle"
                        dominantBaseline="central" fontSize="10" fontWeight="800" fill="#fff"
                        stroke="#041725" strokeWidth=".5" paintOrder="stroke">
                        {segment.label.length > 12 ? segment.label.slice(0, 11) + "…" : segment.label}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="45" fill="#071E2E" stroke="white" strokeWidth="4"/>
              <text x="160" y="164" textAnchor="middle" fill="white" fontSize="24" fontWeight="900">strikr</text>
              <text x="160" y="180" textAnchor="middle" fill="#6EE7EA"
                fontSize="9" fontWeight="800" letterSpacing="1">SCHICKSAL</text>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {segments.map((segment, index) => (
            <div key={segment.id} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2.5"
              style={{ borderLeft: `4px solid ${WHEEL_COLORS[index % WHEEL_COLORS.length]}` }}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] font-black leading-4 text-slate-900">
                  {segment.icon} {segment.label}
                </span>
                <span className="shrink-0 text-[11px] font-black text-cyan-700">{segment.weight}%</span>
              </div>
              {segment.description && (
                <p className="mt-1 text-[10px] leading-4 text-slate-600">{segment.description}</p>
              )}
            </div>
          ))}
        </div>

        {outcome ? (
          <div role="status" className="rounded-xl border border-cyan-200 bg-white p-3 text-center">
            {reveal ? (
              <>
                <div className="text-lg font-black text-slate-950">{icon} {message}</div>
                {detail && <p className="mt-1 text-xs font-semibold text-slate-700">{detail}</p>}
              </>
            ) : <p className="text-sm font-black text-cyan-700">🎡 Das Schicksal entscheidet …</p>}
          </div>
        ) : (
          <button type="button" disabled={busy || loading || !!error} onClick={() => void spin()}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
            {loading ? "Rad wird geladen …" : busy ? "Ergebnis wird gespeichert …" : "🎡 JETZT DREHEN"}
          </button>
        )}
        <p className="rounded-xl bg-slate-900 px-3 py-2 text-center text-[10px] font-semibold leading-4 text-white">
          Die ausgeloste Kabinenaktion wird gespeichert. Geld- und Bierstrafen ändern sich dabei nicht automatisch.
        </p>
        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      </div>
    </details>
  );
}
