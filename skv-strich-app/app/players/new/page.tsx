"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function NewPlayerPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<"defense" | "attack" | "goalkeeper">(
    "attack"
  );
  const [ageGroup, setAgeGroup] = useState<"AH" | "Ü32">("AH");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Bitte einen Namen eingeben.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("players").insert({
      name: name.trim(),
      age_group: ageGroup,          // AH oder Ü32
      preferred_position: position, // defense / attack / goalkeeper
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/players");
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 400 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Neuen Spieler hinzufügen
      </h1>

      <button
        type="button"
        onClick={() => router.push("/players")}
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
        {/* Name */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "0.3rem",
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* Altersgruppe */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Altersgruppe
          </label>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as "AH" | "Ü32")}
            required
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "0.3rem",
              border: "1px solid #ccc",
            }}
          >
            <option value="AH">AH</option>
            <option value="Ü32">Ü32</option>
          </select>
        </div>

        {/* Position */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Position
          </label>
          <select
            value={position}
            onChange={(e) =>
              setPosition(e.target.value as "defense" | "attack" | "goalkeeper")
            }
            required
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "0.3rem",
              border: "1px solid #ccc",
            }}
          >
            <option value="defense">Hinten (Abwehr)</option>
            <option value="attack">Vorne (Angriff)</option>
            <option value="goalkeeper">Torwart</option>
          </select>
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
          {loading ? "Speichere..." : "Spieler anlegen"}
        </button>
      </form>
    </div>
  );
}
