"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function NewSessionPage() {
  const router = useRouter();

  // heutiges Datum als Standard
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState<string>(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!date) {
      setErrorMsg("Bitte ein Datum auswählen.");
      return;
    }

    setLoading(true);

    // Saison lassen wir für den Anfang NULL, wir hängen sie später an
    const { error } = await supabase.from("sessions").insert({
      date,
      notes: notes.trim() || null,
      season_id: null,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/sessions");
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 400 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Neuen Termin anlegen
      </h1>

      <button
        type="button"
        onClick={() => router.push("/sessions")}
        style={{
          marginBottom: "1rem",
          padding: "0.3rem 0.6rem",
          borderRadius: "0.4rem",
          border: "1px solid #444",
          background: "white",
          cursor: "pointer",
        }}
      >
        ← Zurück zur Übersicht
      </button>

      <form onSubmit={handleSubmit}>
        {/* Datum */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "0.3rem",
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* Notiz */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Notiz (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "0.3rem",
              border: "1px solid #ccc",
            }}
          />
        </div>

        {errorMsg && (
          <p style={{ color: "red", marginBottom: "0.75rem" }}>{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "0.4rem",
            border: "none",
            background: "#111",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Speichere..." : "Termin anlegen"}
        </button>
      </form>
    </div>
  );
}
