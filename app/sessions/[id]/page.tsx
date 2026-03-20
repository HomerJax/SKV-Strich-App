"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ExportButtons from "@/components/ExportButtons";
import { getPlayerDisplayName } from "@/lib/player-display";
import { LineupExportCard, ResultExportCard } from "./SessionExportCards";
import type { Player, SessionRow, TeamMap, TeamSide } from "./session-types";
import {
  ageBadgeColor,
  badgeColor,
  buildLineupShareText,
  buildResultShareText,
  getErrorMessage,
  normalizeGoalValue,
  positionLabel,
  shuffle,
  sortForTeamView,
  sumAge,
  sumPos,
  sumStrength,
} from "./session-ui";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
};

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const resultRef = useRef<HTMLDivElement | null>(null);
  const teamsRef = useRef<HTMLDivElement | null>(null);
  const winnerPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);
  const [manualTeams, setManualTeams] = useState<TeamMap>({});
  const [clubId, setClubId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);

  const [winnerPhotoUrl, setWinnerPhotoUrl] = useState<string | null>(null);

  const [goalsA, setGoalsA] = useState("");
  const [goalsB, setGoalsB] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState<
    Player["preferred_position"] | ""
  >("");
  const [guestAgeGroup, setGuestAgeGroup] = useState<
    Player["age_group"] | ""
  >("");
  const [guestSaving, setGuestSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sharingLineup, setSharingLineup] = useState(false);
  const [sharingResult, setSharingResult] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function guestBadge(player: Player) {
    return player.is_guest ? (
      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-white">
        Gast
      </span>
    ) : null;
  }

  async function refreshWinnerPhotoUrl(path: string | null | undefined) {
    if (!path) {
      setWinnerPhotoUrl(null);
      return;
    }

    const { data, error } = await supabase.storage
      .from("session-photos")
      .createSignedUrl(path, 60 * 60);

    if (error || !data?.signedUrl) {
      setWinnerPhotoUrl(null);
      return;
    }

    setWinnerPhotoUrl(data.signedUrl);
  }

  async function loadPage() {
    try {
      setLoading(true);
      setErr(null);
      setMsg(null);

      const { data: membershipData, error: membershipError } =
        await supabase.rpc("get_my_membership");

      if (membershipError) throw membershipError;

      const membership = (membershipData?.[0] as Membership | undefined) ?? null;
      const currentClubId = membership?.club_id ?? null;

      if (!currentClubId) {
        throw new Error("Kein Club für den aktuellen User gefunden.");
      }

      setClubId(currentClubId);
      setIsAdmin(membership?.role === "admin");

      const { data: settingsData, error: settingsError } = await supabase
        .from("club_settings")
        .select(
          "use_strength, strength_default, use_categories, category_label, position_label, attack_label, defense_label, goalkeeper_label"
        )
        .eq("club_id", currentClubId)
        .single();

      if (settingsError) throw settingsError;

      const { data: sData, error: sErr } = await supabase
        .from("sessions")
        .select("id, date, notes, winner_photo_path")
        .eq("id", sessionId)
        .single();
      if (sErr) throw sErr;

      const sessionRow = sData as SessionRow;
      await refreshWinnerPhotoUrl(sessionRow.winner_photo_path ?? null);

      const { data: pData, error: pErr } = await supabase
        .from("players")
        .select(
          "id, name, first_name, last_name, nickname, is_active, age_group, preferred_position, strength, is_guest"
        )
        .eq("club_id", currentClubId)
        .order("name");
      if (pErr) throw pErr;

      const active = (pData ?? []).filter((p) => p.is_active !== false) as Player[];

      const { data: spData, error: spErr } = await supabase
        .from("session_players")
        .select("player_id")
        .eq("session_id", sessionId);
      if (spErr) throw spErr;

      const present = (spData ?? []).map((r) => r.player_id as number);

      const { data: rData } = await supabase
        .from("results")
        .select("id, team_a_id, team_b_id, goals_team_a, goals_team_b")
        .eq("session_id", sessionId)
        .maybeSingle();

      const teamAssignment: TeamMap = {};
      present.forEach((pid) => (teamAssignment[pid] = null));

      if (rData && (rData.team_a_id || rData.team_b_id)) {
        const teamIds = [rData.team_a_id, rData.team_b_id].filter(
          Boolean
        ) as number[];
        const { data: tpData } = await supabase
          .from("team_players")
          .select("team_id, player_id")
          .in("team_id", teamIds);

        for (const tp of tpData ?? []) {
          if (tp.team_id === rData.team_a_id) teamAssignment[tp.player_id] = "A";
          if (tp.team_id === rData.team_b_id) teamAssignment[tp.player_id] = "B";
        }

        if (rData.goals_team_a != null) setGoalsA(String(rData.goals_team_a));
        if (rData.goals_team_b != null) setGoalsB(String(rData.goals_team_b));
        setHasResult(true);
      } else {
        setHasResult(false);
        setGoalsA("");
        setGoalsB("");
      }

      setClubSettings(settingsData as ClubSettings);
      setSession(sessionRow);
      setPlayers(active);
      setPresentIds(present);
      setManualTeams(teamAssignment);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Laden."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [sessionId]);

  const presentPlayers = useMemo(
    () => players.filter((p) => presentIds.includes(p.id)),
    [players, presentIds]
  );

  const teamA = useMemo(
    () =>
      presentPlayers
        .filter((p) => manualTeams[p.id] === "A")
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );
  const teamB = useMemo(
    () =>
      presentPlayers
        .filter((p) => manualTeams[p.id] === "B")
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );
  const unassigned = useMemo(
    () =>
      presentPlayers
        .filter((p) => !manualTeams[p.id])
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );

  const canShareLineup = teamA.length > 0 && teamB.length > 0;
  const canShareResult =
    teamA.length > 0 &&
    teamB.length > 0 &&
    goalsA.trim() !== "" &&
    goalsB.trim() !== "";

  async function shareText(text: string, title: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title,
        text,
      });
      return "shared";
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }

    throw new Error("Teilen wird auf diesem Gerät/Browser nicht unterstützt.");
  }

  async function handleShareLineup() {
    try {
      setSharingLineup(true);
      setErr(null);
      setMsg(null);

      if (!canShareLineup) {
        throw new Error("Bitte zuerst beide Teams zuweisen.");
      }

      const text = buildLineupShareText(session, teamA, teamB);
      const result = await shareText(text, "Aufstellung teilen");
      setMsg(
        result === "copied"
          ? "Aufstellungs-Text in die Zwischenablage kopiert."
          : "Aufstellung erfolgreich geteilt."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Aufstellung konnte nicht geteilt werden."));
    } finally {
      setSharingLineup(false);
    }
  }

  async function handleShareResult() {
    try {
      setSharingResult(true);
      setErr(null);
      setMsg(null);

      if (!canShareResult) {
        throw new Error(
          "Bitte zuerst Teams und Ergebnis vollständig und gültig eintragen."
        );
      }

      const text = buildResultShareText(session, goalsA, goalsB, teamA, teamB);
      const result = await shareText(text, "Ergebnis teilen");
      setMsg(
        result === "copied"
          ? "Ergebnis-Text in die Zwischenablage kopiert."
          : "Ergebnis erfolgreich geteilt."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Ergebnis konnte nicht geteilt werden."));
    } finally {
      setSharingResult(false);
    }
  }

  async function togglePresence(id: number) {
    if (hasResult) {
      setErr(
        "Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um wieder zu entsperren."
      );
      return;
    }
    setErr(null);
    setMsg(null);

    const isPresent = presentIds.includes(id);

    if (isPresent) {
      const { error } = await supabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId)
        .eq("player_id", id);

      if (error) {
        setErr(getErrorMessage(error, "Spieler konnte nicht entfernt werden."));
        return;
      }

      setPresentIds((x) => x.filter((p) => p !== id));
      setManualTeams((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
    } else {
      const { error } = await supabase
        .from("session_players")
        .insert({ session_id: sessionId, player_id: id });

      if (error) {
        setErr(getErrorMessage(error, "Spieler konnte nicht hinzugefügt werden."));
        return;
      }

      setPresentIds((x) => [...x, id]);
      setManualTeams((m) => ({ ...m, [id]: null }));
    }
  }

  async function addGuestPlayer() {
    try {
      if (!isAdmin) {
        throw new Error(
          "Gastspieler können aktuell nur von Admins angelegt werden."
        );
      }

      if (hasResult) {
        throw new Error(
          "Gastspieler können nicht mehr hinzugefügt werden, wenn bereits ein Ergebnis gespeichert ist."
        );
      }

      if (!clubId) {
        throw new Error("Kein Club gefunden.");
      }

      const cleanName = guestName.trim();
      if (!cleanName) {
        throw new Error("Bitte einen Namen für den Gastspieler eingeben.");
      }

      setGuestSaving(true);
      setErr(null);
      setMsg(null);

      const payload = {
        club_id: clubId,
        name: cleanName,
        is_active: true,
        is_guest: true,
        preferred_position: guestPosition === "" ? null : guestPosition,
        age_group: guestAgeGroup === "" ? null : guestAgeGroup,
        strength: null,
      };

      const { data: createdPlayer, error: insertPlayerError } = await supabase
        .from("players")
        .insert(payload)
        .select(
          "id, name, first_name, last_name, nickname, is_active, age_group, preferred_position, strength, is_guest"
        )
        .single();

      if (insertPlayerError) throw insertPlayerError;

      const { error: insertSessionPlayerError } = await supabase
        .from("session_players")
        .insert({
          session_id: sessionId,
          player_id: createdPlayer.id,
        });

      if (insertSessionPlayerError) {
        await supabase.from("players").delete().eq("id", createdPlayer.id);
        throw insertSessionPlayerError;
      }

      const nextPlayer = createdPlayer as Player;

      setPlayers((prev) =>
        [...prev, nextPlayer].slice().sort((a, b) => {
          return getPlayerDisplayName(a).localeCompare(
            getPlayerDisplayName(b),
            "de"
          );
        })
      );
      setPresentIds((prev) => [...prev, nextPlayer.id]);
      setManualTeams((prev) => ({ ...prev, [nextPlayer.id]: null }));

      setGuestName("");
      setGuestPosition("");
      setGuestAgeGroup("");
      setShowGuestForm(false);
      setMsg("Gastspieler angelegt und direkt zur Anwesenheit hinzugefügt.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Gastspieler konnte nicht angelegt werden."));
    } finally {
      setGuestSaving(false);
    }
  }

  function generateTeams() {
    if (hasResult) {
      setErr(
        "Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern."
      );
      return;
    }

    setErr(null);
    setMsg(null);

    const present = presentPlayers;
    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
      return;
    }

    const targetA = Math.ceil(present.length / 2);
    const targetB = Math.floor(present.length / 2);

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");

    function evaluate(A: Player[], B: Player[]) {
      const useStrength = clubSettings?.use_strength ?? true;
      const useCategories = clubSettings?.use_categories ?? true;

      const sDiff = useStrength ? Math.abs(sumStrength(A) - sumStrength(B)) : 0;
      const aDiff = useCategories ? Math.abs(sumAge(A) - sumAge(B)) : 0;
      const pDiff = Math.abs(sumPos(A) - sumPos(B));

      return sDiff * 6 + aDiff * 3 + pDiff * 2;
    }

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let bestScore = Infinity;

    for (let k = 0; k < 400; k++) {
      const A: Player[] = [];
      const B: Player[] = [];

      const shuffledKeepers = shuffle(keepers);
      for (const gk of shuffledKeepers) {
        if (
          A.length < targetA &&
          (A.length <= B.length || B.length >= targetB)
        ) {
          A.push(gk);
        } else if (B.length < targetB) {
          B.push(gk);
        } else if (A.length < targetA) {
          A.push(gk);
        }
      }

      const shuffledField = shuffle(field);

      for (const p of shuffledField) {
        if (A.length >= targetA) {
          if (B.length < targetB) B.push(p);
          continue;
        }
        if (B.length >= targetB) {
          if (A.length < targetA) A.push(p);
          continue;
        }

        const scoreIfA = evaluate([...A, p], B);
        const scoreIfB = evaluate(A, [...B, p]);

        if (scoreIfA < scoreIfB) A.push(p);
        else if (scoreIfB < scoreIfA) B.push(p);
        else (A.length <= B.length ? A : B).push(p);
      }

      if (!(A.length === targetA && B.length === targetB)) continue;

      const score = evaluate(A, B);
      if (score < bestScore) {
        bestScore = score;
        bestA = A;
        bestB = B;
      }
    }

    if (bestA.length === 0 && bestB.length === 0) {
      setErr("Konnte keine gültige Aufteilung finden (unerwartet).");
      return;
    }

    const next: TeamMap = {};
    present.forEach((p) => (next[p.id] = null));
    for (const p of bestA) next[p.id] = "A";
    for (const p of bestB) next[p.id] = "B";

    setManualTeams(next);

    const useStrength = clubSettings?.use_strength ?? true;
    const useCategories = clubSettings?.use_categories ?? true;

    if (useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Stärke und Kategorien wurden berücksichtigt."
      );
      return;
    }

    if (useStrength && !useCategories) {
      setMsg(
        "Teams automatisch verteilt. Stärke wurde berücksichtigt, Kategorien nicht."
      );
      return;
    }

    if (!useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Kategorien wurden berücksichtigt, Stärke nicht."
      );
      return;
    }

    setMsg(
      "Teams automatisch verteilt. Stärke und Kategorien wurden nicht berücksichtigt."
    );
  }

  function setSide(pid: number, side: TeamSide | null) {
    if (hasResult) {
      setErr(
        "Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern."
      );
      return;
    }
    setErr(null);
    setManualTeams((m) => ({ ...m, [pid]: side }));
  }

  async function saveResult() {
    const cleanA = normalizeGoalValue(goalsA);
    const cleanB = normalizeGoalValue(goalsB);

    const ok = window.confirm(
      "Ergebnis speichern? Danach sind Aufstellungen & Anwesenheit gesperrt."
    );
    if (!ok) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const Araw = presentPlayers.filter((p) => manualTeams[p.id] === "A");
      const Braw = presentPlayers.filter((p) => manualTeams[p.id] === "B");

      if (Araw.length === 0 || Braw.length === 0) {
        throw new Error("Beide Teams brauchen mindestens einen Spieler.");
      }
      if (Math.abs(Araw.length - Braw.length) > 1) {
        throw new Error("Teams dürfen höchstens 1 Spieler Unterschied haben.");
      }

      const { data: existing } = await supabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      async function ensureTeam(name: string) {
        const { data, error } = await supabase
          .from("teams")
          .select("id")
          .eq("session_id", sessionId)
          .eq("name", name)
          .maybeSingle();

        if (error) throw error;
        if (data?.id) return data.id as number;

        const { data: ins, error: insertError } = await supabase
          .from("teams")
          .insert({ session_id: sessionId, name })
          .select()
          .single();
        if (insertError) throw insertError;

        return ins!.id as number;
      }

      const teamAId = await ensureTeam("Team 1");
      const teamBId = await ensureTeam("Team 2");

      const { error: deleteTpError } = await supabase
        .from("team_players")
        .delete()
        .in("team_id", [teamAId, teamBId]);
      if (deleteTpError) throw deleteTpError;

      const { error: insertTpError } = await supabase.from("team_players").insert([
        ...Araw.map((p) => ({ team_id: teamAId, player_id: p.id })),
        ...Braw.map((p) => ({ team_id: teamBId, player_id: p.id })),
      ]);
      if (insertTpError) throw insertTpError;

      if (!clubId) {
        throw new Error("Kein Club für die Session gefunden.");
      }

      const payload = {
        session_id: sessionId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        goals_team_a: cleanA === "" ? null : Number(cleanA),
        goals_team_b: cleanB === "" ? null : Number(cleanB),
        club_id: clubId,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("results")
          .update(payload)
          .eq("session_id", sessionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("results").insert(payload);
        if (error) throw error;
      }

      setHasResult(true);
      setGoalsA(cleanA);
      setGoalsB(cleanB);
      setMsg(
        "Ergebnis gespeichert. Aufstellungen & Anwesenheit sind ab jetzt gesperrt."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Speichern."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteResult() {
    const ok = window.confirm(
      "Ergebnis wirklich löschen?\nDanach sind Aufstellungen & Anwesenheit wieder bearbeitbar."
    );
    if (!ok) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const { error } = await supabase
        .from("results")
        .delete()
        .eq("session_id", sessionId);
      if (error) throw error;

      setHasResult(false);
      setGoalsA("");
      setGoalsB("");

      setMsg(
        "Ergebnis gelöscht. Aufstellungen & Anwesenheit sind wieder bearbeitbar."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Löschen des Ergebnisses."));
    } finally {
      setSaving(false);
    }
  }

  async function handleWinnerPhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!session) {
      setErr("Training konnte nicht geladen werden.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setErr("Bitte ein Bild auswählen.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErr("Das Bild ist zu groß. Bitte maximal 10 MB verwenden.");
      return;
    }

    try {
      setPhotoBusy(true);
      setErr(null);
      setMsg(null);

      const extension = file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() || "jpg"
        : "jpg";

      const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "jpg";
      const newPath = `sessions/${sessionId}/${Date.now()}-winner.${safeExt}`;
      const oldPath = session.winner_photo_path ?? null;

      const { error: uploadError } = await supabase.storage
        .from("session-photos")
        .upload(newPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("sessions")
        .update({ winner_photo_path: newPath })
        .eq("id", sessionId);

      if (updateError) {
        await supabase.storage.from("session-photos").remove([newPath]);
        throw updateError;
      }

      if (oldPath) {
        await supabase.storage.from("session-photos").remove([oldPath]);
      }

      const nextSession: SessionRow = {
        ...session,
        winner_photo_path: newPath,
      };

      setSession(nextSession);
      await refreshWinnerPhotoUrl(newPath);
      setMsg("Siegerfoto hochgeladen.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht hochgeladen werden."));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleWinnerPhotoDelete() {
    if (!session?.winner_photo_path) {
      setErr("Kein Siegerfoto vorhanden.");
      return;
    }

    const ok = window.confirm("Siegerfoto wirklich löschen?");
    if (!ok) return;

    try {
      setPhotoBusy(true);
      setErr(null);
      setMsg(null);

      const path = session.winner_photo_path;

      const { error: updateError } = await supabase
        .from("sessions")
        .update({ winner_photo_path: null })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      await supabase.storage.from("session-photos").remove([path]);

      const nextSession: SessionRow = {
        ...session,
        winner_photo_path: null,
      };

      setSession(nextSession);
      setWinnerPhotoUrl(null);
      setMsg("Siegerfoto gelöscht.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht gelöscht werden."));
    } finally {
      setPhotoBusy(false);
    }
  }

  function teamMeta(team: Player[]) {
    const gk = team.filter((p) => p.preferred_position === "goalkeeper").length;
    const def = team.filter((p) => p.preferred_position === "defense").length;
    const att = team.filter((p) => p.preferred_position === "attack").length;
    const ah = team.filter((p) => p.age_group === "AH").length;
    const u32 = team.filter((p) => p.age_group === "Ü32").length;
    return { gk, def, att, ah, u32 };
  }

  const metaA = teamMeta(teamA);
  const metaB = teamMeta(teamB);

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;
  if (err && !session)
    return <div className="bg-red-50 p-4 text-sm text-red-700">{err}</div>;

  return (
    <>
      <div className="space-y-4">
        <button
          onClick={() => router.push("/sessions")}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zurück zu Trainings
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">
              Training {new Date(session!.date).toLocaleDateString("de-DE")}
            </h1>
            {session?.notes && (
              <div className="text-[11px] text-slate-500">{session.notes}</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => teamsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              Zu den Teams ↓
            </button>
            <button
              onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              Zum Ergebnis ↓
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {msg}
          </div>
        )}

        <div className="space-y-3 rounded-xl border bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold">Anwesenheit</div>
              {hasResult && (
                <div className="text-[11px] text-slate-500">
                  Gesperrt (Ergebnis gespeichert)
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowGuestForm((v) => !v)}
                disabled={hasResult}
                className={`rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm ${
                  hasResult ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {showGuestForm ? "Gastformular schließen" : "Gast hinzufügen"}
              </button>
            )}
          </div>

          {isAdmin && showGuestForm && !hasResult && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-700">Name</div>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="z. B. Gastspieler 1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    {clubSettings?.position_label ?? "Position"} (optional)
                  </div>
                  <select
                    value={guestPosition ?? ""}
                    onChange={(e) =>
                      setGuestPosition(
                        e.target.value as Player["preferred_position"] | ""
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Offen</option>
                    <option value="goalkeeper">
                      {clubSettings?.goalkeeper_label ?? "Torwart"}
                    </option>
                    <option value="defense">
                      {clubSettings?.defense_label ?? "Hinten"}
                    </option>
                    <option value="attack">
                      {clubSettings?.attack_label ?? "Vorne"}
                    </option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    {clubSettings?.category_label ?? "Altersgruppe"} (optional)
                  </div>
                  <select
                    value={guestAgeGroup ?? ""}
                    onChange={(e) =>
                      setGuestAgeGroup(e.target.value as Player["age_group"] | "")
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Offen</option>
                    <option value="AH">AH</option>
                    <option value="Ü32">Ü32</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={addGuestPlayer}
                disabled={guestSaving}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guestSaving ? "Speichere…" : "Gastspieler anlegen"}
              </button>
            </div>
          )}

          {!isAdmin && (
            <div className="text-[11px] text-slate-500">
              Gastspieler können aktuell nur von Admins angelegt werden.
            </div>
          )}

          <div className="grid gap-2">
            {players.map((p) => {
              const on = presentIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePresence(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                    on ? "bg-emerald-50" : "bg-white"
                  } ${hasResult ? "cursor-not-allowed opacity-60" : ""}`}
                  disabled={hasResult}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{getPlayerDisplayName(p)}</span>
                    {guestBadge(p)}
                  </span>

                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] ${ageBadgeColor(
                        p.age_group
                      )}`}
                    >
                      {p.age_group ?? "?"}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] ${badgeColor(
                        p.preferred_position
                      )}`}
                    >
                      {positionLabel(p.preferred_position)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div ref={teamsRef} className="space-y-3 rounded-xl border bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">Teams</div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareLineup}
                disabled={sharingLineup || !canShareLineup}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  sharingLineup || !canShareLineup
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                {sharingLineup ? "Teile…" : "Aufstellung teilen"}
              </button>

              <ExportButtons
                targetId="export-lineup-card"
                fileBaseName={`strikr-aufstellung-${session?.date ?? sessionId}`}
              />

              <button
                onClick={generateTeams}
                disabled={hasResult}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  hasResult ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Teams generieren
              </button>
            </div>
          </div>

          {hasResult && (
            <div className="text-[11px] text-slate-500">
              Teams sind gesperrt, weil ein Ergebnis gespeichert ist. Lösche das
              Ergebnis, um Teams zu ändern.
            </div>
          )}

          {!canShareLineup && (
            <div className="text-[11px] text-slate-500">
              Aufstellung teilen ist verfügbar, sobald beide Teams mindestens einen
              Spieler haben.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-lg border p-2">
              <div className="text-xs font-semibold">Team 1 ({teamA.length})</div>
              <div className="text-[11px] text-slate-500">
                GK {metaA.gk} · Hinten {metaA.def} · Vorne {metaA.att} · AH{" "}
                {metaA.ah} · Ü32 {metaA.u32}
              </div>

              {teamA.length === 0 ? (
                <div className="text-[11px] text-slate-400">
                  Noch kein Spieler zugewiesen.
                </div>
              ) : (
                <div className="space-y-1">
                  {teamA.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSide(p.id, null)}
                      disabled={hasResult}
                      className={`flex w-full items-center justify-between rounded-md border bg-white px-2 py-1 text-left text-xs hover:bg-slate-50 ${
                        hasResult
                          ? "cursor-not-allowed opacity-60 hover:bg-white"
                          : ""
                      }`}
                      title={
                        hasResult
                          ? "Gesperrt: Ergebnis gespeichert"
                          : "Klick: aus Team entfernen"
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{getPlayerDisplayName(p)}</span>
                        {guestBadge(p)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] ${ageBadgeColor(
                            p.age_group
                          )}`}
                        >
                          {p.age_group ?? "?"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] ${badgeColor(
                            p.preferred_position
                          )}`}
                        >
                          {positionLabel(p.preferred_position)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-2">
              <div className="text-xs font-semibold">Team 2 ({teamB.length})</div>
              <div className="text-[11px] text-slate-500">
                GK {metaB.gk} · Hinten {metaB.def} · Vorne {metaB.att} · AH{" "}
                {metaB.ah} · Ü32 {metaB.u32}
              </div>

              {teamB.length === 0 ? (
                <div className="text-[11px] text-slate-400">
                  Noch kein Spieler zugewiesen.
                </div>
              ) : (
                <div className="space-y-1">
                  {teamB.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSide(p.id, null)}
                      disabled={hasResult}
                      className={`flex w-full items-center justify-between rounded-md border bg-white px-2 py-1 text-left text-xs hover:bg-slate-50 ${
                        hasResult
                          ? "cursor-not-allowed opacity-60 hover:bg-white"
                          : ""
                      }`}
                      title={
                        hasResult
                          ? "Gesperrt: Ergebnis gespeichert"
                          : "Klick: aus Team entfernen"
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{getPlayerDisplayName(p)}</span>
                        {guestBadge(p)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] ${ageBadgeColor(
                            p.age_group
                          )}`}
                        >
                          {p.age_group ?? "?"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] ${badgeColor(
                            p.preferred_position
                          )}`}
                        >
                          {positionLabel(p.preferred_position)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-2">
            <div className="mb-2 text-xs font-semibold">
              Nicht zugewiesen ({unassigned.length})
            </div>

            {unassigned.length === 0 ? (
              <div className="text-[11px] text-slate-400">
                Alle Spieler sind einem Team zugeordnet.
              </div>
            ) : (
              <div className="space-y-1">
                {unassigned.map((p) => (
                  <div
                    key={p.id}
                    className="flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2 py-1 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate font-medium">
                          {getPlayerDisplayName(p)}
                        </div>
                        {guestBadge(p)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span
                          className={`rounded-md px-2 py-0.5 ${ageBadgeColor(
                            p.age_group
                          )}`}
                        >
                          {p.age_group ?? "?"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 ${badgeColor(
                            p.preferred_position
                          )}`}
                        >
                          {positionLabel(p.preferred_position)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        disabled={hasResult}
                        className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                          hasResult
                            ? "cursor-not-allowed opacity-60 hover:bg-white"
                            : ""
                        }`}
                        onClick={() => setSide(p.id, "A")}
                      >
                        → Team 1
                      </button>
                      <button
                        disabled={hasResult}
                        className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                          hasResult
                            ? "cursor-not-allowed opacity-60 hover:bg-white"
                            : ""
                        }`}
                        onClick={() => setSide(p.id, "B")}
                      >
                        → Team 2
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Hinweis: Anzeige ist nach Torwart / Hinten / Vorne sortiert (danach
            alphabetisch).
          </div>
        </div>

        <div ref={resultRef} className="space-y-3 rounded-xl border bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">Ergebnis</div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareResult}
                disabled={sharingResult || !canShareResult}
                className={`rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm ${
                  sharingResult || !canShareResult
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                {sharingResult ? "Teile…" : "Ergebnis teilen"}
              </button>

              <ExportButtons
                targetId="export-result-card"
                fileBaseName={`strikr-ergebnis-${session?.date ?? sessionId}`}
              />

              {hasResult && (
                <button
                  disabled={saving}
                  onClick={deleteResult}
                  className="rounded-lg border bg-red-50 px-3 py-1.5 text-xs shadow-sm"
                >
                  Ergebnis löschen
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={goalsA}
              onChange={(e) => setGoalsA(normalizeGoalValue(e.target.value))}
              placeholder="Team 1"
              inputMode="numeric"
              className="w-16 rounded-md border px-2 py-1 text-center"
            />
            <span className="text-sm">:</span>
            <input
              value={goalsB}
              onChange={(e) => setGoalsB(normalizeGoalValue(e.target.value))}
              placeholder="Team 2"
              inputMode="numeric"
              className="w-16 rounded-md border px-2 py-1 text-center"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Siegerfoto
                </div>
                <div className="text-[11px] text-slate-500">
                  Optional für Ergebniskarte und Teilen.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={winnerPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleWinnerPhotoUpload}
                  disabled={photoBusy}
                />

                <button
                  type="button"
                  onClick={() => winnerPhotoInputRef.current?.click()}
                  disabled={photoBusy}
                  className={`rounded-lg border bg-white px-3 py-1.5 text-xs ${
                    photoBusy ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {session?.winner_photo_path ? "Foto ersetzen" : "Foto hochladen"}
                </button>

                {session?.winner_photo_path && (
                  <button
                    type="button"
                    onClick={handleWinnerPhotoDelete}
                    disabled={photoBusy}
                    className={`rounded-lg border bg-red-50 px-3 py-1.5 text-xs ${
                      photoBusy ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    Foto löschen
                  </button>
                )}
              </div>
            </div>

            {photoBusy && (
              <div className="text-[11px] text-slate-500">
                Foto wird verarbeitet…
              </div>
            )}

            {winnerPhotoUrl ? (
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="w-full max-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img
                    src={winnerPhotoUrl}
                    alt="Siegerfoto"
                    className="h-24 w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Noch kein Siegerfoto hinterlegt.
              </div>
            )}
          </div>

          {!canShareResult && (
            <div className="text-[11px] text-slate-500">
              Ergebnis teilen ist verfügbar, sobald beide Teams Spieler haben und
              beide Tore gültig eingetragen sind.
            </div>
          )}

          <button
            disabled={saving}
            onClick={saveResult}
            className="rounded-lg border bg-emerald-50 px-3 py-1.5 text-xs shadow-sm"
          >
            {saving ? "Speichere…" : "Ergebnis speichern"}
          </button>

          <div className="text-[11px] text-slate-500">
            Hinweis: Nach dem Speichern sind Aufstellungen & Anwesenheit gesperrt.
            Wenn ein Spieler fehlt, lösche das Ergebnis, passe Aufstellungen an und
            trage das Ergebnis erneut ein.
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[99999px] top-0 opacity-0"
      >
        <LineupExportCard
          session={session}
          teamA={teamA}
          teamB={teamB}
          metaA={metaA}
          metaB={metaB}
        />
        <ResultExportCard
          session={session}
          teamA={teamA}
          teamB={teamB}
          goalsA={goalsA}
          goalsB={goalsB}
          winnerPhotoUrl={winnerPhotoUrl}
        />
      </div>
    </>
  );
}