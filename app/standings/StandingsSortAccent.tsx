"use client";

import { useEffect } from "react";

export default function StandingsSortAccent() {
  useEffect(() => {
    const root = document.getElementById("export-standings");
    if (!root) return;

    root.dataset.sortAccent = "rank";

    function handleClick(event: Event) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || !root.contains(button)) return;

      const label = button.textContent?.trim() ?? "";
      if (label.startsWith("Platz")) root.dataset.sortAccent = "rank";
      if (label.startsWith("Teiln.")) root.dataset.sortAccent = "sessions";
      if (label.startsWith("Siegquote")) root.dataset.sortAccent = "winRate";
    }

    root.addEventListener("click", handleClick);
    return () => root.removeEventListener("click", handleClick);
  }, []);

  return null;
}
