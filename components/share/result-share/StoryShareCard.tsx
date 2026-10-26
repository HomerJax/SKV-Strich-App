/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import ResultShareCard from "./ResultShareCard";
import type { ExtendedResultShareData } from "./result-share.types";

const PILOT_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
export function isStorySharePilotClub(clubId: string | null | undefined): boolean {
  return clubId === PILOT_ID;
}

/** 9:16 export: crucial content starts below Instagram's top chrome and
 * ends above the reply/composer area. No text occupies the top/bottom 150px. */
export function StoryShareFrame({
  eyebrow, title, subtitle, children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", width: 1080, height: 1920, flexDirection: "column", position: "relative", overflow: "hidden", color: "#f8fafc",
      background: "linear-gradient(155deg,#061520 0%,#073d47 35%,#041421 72%,#020b14 100%)" }}>
      <div style={{ display: "flex", position: "absolute", left: -280, top: 270, width: 680, height: 680, borderRadius: 350,
        background: "radial-gradient(circle,rgba(45,212,191,.24),transparent 72%)" }} />
      <div style={{ display: "flex", position: "absolute", right: -320, bottom: 190, width: 760, height: 760, borderRadius: 380,
        background: "radial-gradient(circle,rgba(14,165,233,.20),transparent 73%)" }} />
      <div style={{ display: "flex", marginTop: 162, marginLeft: 64, marginRight: 64, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 900, letterSpacing: 5, color: "#5eead4" }}>{eyebrow.toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 900, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 23, color: "rgba(226,244,247,.7)", lineHeight: 1.25 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", padding: "14px 21px", borderRadius: 22, border: "1px solid rgba(94,234,212,.35)",
          background: "rgba(94,234,212,.12)", fontSize: 33, fontWeight: 900, letterSpacing: -1 }}>strikr<span style={{color:"#5eead4"}}>.</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 42, marginLeft: 34,
        marginRight: 34, height: 1284, borderRadius: 45, overflow: "hidden",
        border: "2px solid rgba(94,234,212,.36)", boxShadow: "0 40px 95px rgba(0,0,0,.48)", background: "#041323" }}>
        {children}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40,
        marginLeft: 70, marginRight: 70, paddingTop: 25, borderTop: "1px solid rgba(94,234,212,.25)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 29, fontWeight: 900 }}>TRAIN SMARTER. PLAY FAIR.</div>
          <div style={{ display: "flex", fontSize: 19, color: "#8ddbd8", letterSpacing: 1 }}>Erstellt mit strikr</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 900, color: "#5eead4" }}>strikr.team</div>
          <div style={{ display: "flex", fontSize: 17, color: "rgba(226,244,247,.7)" }}>@getstrikr</div>
        </div>
      </div>
    </div>
  );
}

export function ResultStoryShareCard({
  data,
  tournament = false,
}: {
  data: ExtendedResultShareData;
  tournament?: boolean;
}) {
  return (
    <StoryShareFrame
      eyebrow={tournament ? "Turnier · Siegercard" : "Training · Siegercard"}
      title={tournament ? "TURNIERSIEGER." : "SIEGER DES ABENDS."}
      subtitle={[(data.clubName || data.branding?.clubName || "Dein Team"), data.date].filter(Boolean).join(" · ")}
    >
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <ResultShareCard data={data} />
      </div>
    </StoryShareFrame>
  );
}
