"use client";

import { useEffect } from "react";

type SortAccent = "rank" | "wins" | "sessions" | "winRate";
type Direction = "asc" | "desc";

function numericCell(row: HTMLTableRowElement, index: number) {
  const value = row.cells[index]?.textContent?.replace(/[^0-9.-]/g, "").trim() ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function StandingsSortAccent() {
  useEffect(() => {
    let cleanupRoot: (() => void) | null = null;
    let rootObserver: MutationObserver | null = null;
    let activeSort: SortAccent = "wins";
    let winsDirection: Direction = "desc";
    let sorting = false;

    function sortWins(root: HTMLElement) {
      const tbody = root.querySelector("tbody");
      if (!(tbody instanceof HTMLTableSectionElement) || sorting) return;

      const rows = Array.from(tbody.rows);
      if (rows.length < 2) return;

      sorting = true;
      rows.sort((a, b) => {
        const winsDiff = numericCell(a, 2) - numericCell(b, 2);
        if (winsDiff !== 0) return winsDirection === "asc" ? winsDiff : -winsDiff;

        const rankDiff = numericCell(a, 0) - numericCell(b, 0);
        return rankDiff;
      });

      const fragment = document.createDocumentFragment();
      rows.forEach((row) => fragment.appendChild(row));
      tbody.appendChild(fragment);
      sorting = false;
    }

    function activate(root: HTMLElement, next: SortAccent) {
      activeSort = next;
      root.dataset.sortAccent = next;
      if (next === "wins") {
        root.dataset.winsDirection = winsDirection;
        sortWins(root);
      }
    }

    function setupRoot(root: HTMLElement) {
      if (cleanupRoot) return;

      activate(root, "wins");

      function handleClick(event: Event) {
        const target = event.target as HTMLElement | null;
        const th = target?.closest("th");
        if (!(th instanceof HTMLTableCellElement) || !root.contains(th)) return;

        const row = th.parentElement;
        if (!row) return;
        const index = Array.from(row.children).indexOf(th);

        if (index === 0) {
          activate(root, "rank");
          return;
        }

        if (index === 2) {
          event.preventDefault();
          if (activeSort === "wins") {
            winsDirection = winsDirection === "desc" ? "asc" : "desc";
          } else {
            winsDirection = "desc";
          }
          activate(root, "wins");
          return;
        }

        if (index === 3) {
          activate(root, "sessions");
          return;
        }

        if (index === 4) {
          activate(root, "winRate");
        }
      }

      root.addEventListener("click", handleClick);

      const tbody = root.querySelector("tbody");
      const tbodyObserver = new MutationObserver(() => {
        if (activeSort === "wins" && !sorting) {
          window.requestAnimationFrame(() => sortWins(root));
        }
      });

      if (tbody) {
        tbodyObserver.observe(tbody, { childList: true });
      }

      cleanupRoot = () => {
        root.removeEventListener("click", handleClick);
        tbodyObserver.disconnect();
      };
    }

    function findAndSetup() {
      const root = document.getElementById("export-standings");
      if (root) {
        setupRoot(root);
        rootObserver?.disconnect();
        rootObserver = null;
      }
    }

    findAndSetup();

    if (!cleanupRoot) {
      rootObserver = new MutationObserver(findAndSetup);
      rootObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      rootObserver?.disconnect();
      cleanupRoot?.();
    };
  }, []);

  return null;
}
