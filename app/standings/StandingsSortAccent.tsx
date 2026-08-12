"use client";

import { useEffect } from "react";

type SortAccent = "wins" | "sessions" | "winRate";
type Direction = "asc" | "desc";

function numericCell(row: HTMLTableRowElement, index: number) {
  const value = row.cells[index]?.textContent?.replace(/[^0-9.-]/g, "").trim() ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeVisiblePositions(root: HTMLElement) {
  const tbody = root.querySelector("tbody");
  if (!(tbody instanceof HTMLTableSectionElement)) return;

  Array.from(tbody.rows).forEach((row, index) => {
    if (!row.dataset.officialRank) {
      row.dataset.officialRank = row.dataset.rank || String(index + 1);
    }

    const rank = index + 1;
    row.dataset.rank = String(rank);

    const rankLabel = row.cells[0]?.querySelector("div > div:first-child");
    if (rankLabel instanceof HTMLElement) {
      rankLabel.textContent = String(rank);
    }
  });
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
      if (rows.length < 2) {
        normalizeVisiblePositions(root);
        return;
      }

      sorting = true;
      rows.sort((a, b) => {
        const winsDiff = numericCell(a, 2) - numericCell(b, 2);
        if (winsDiff !== 0) return winsDirection === "asc" ? winsDiff : -winsDiff;

        const officialRankA = Number(a.dataset.officialRank || a.dataset.rank || 0);
        const officialRankB = Number(b.dataset.officialRank || b.dataset.rank || 0);
        return officialRankA - officialRankB;
      });

      const fragment = document.createDocumentFragment();
      rows.forEach((row) => fragment.appendChild(row));
      tbody.appendChild(fragment);
      normalizeVisiblePositions(root);
      sorting = false;
    }

    function activate(root: HTMLElement, next: SortAccent) {
      activeSort = next;
      root.dataset.sortAccent = next;

      if (next === "wins") {
        root.dataset.winsDirection = winsDirection;
        sortWins(root);
      } else {
        delete root.dataset.winsDirection;
      }
    }

    function setupRoot(root: HTMLElement) {
      if (cleanupRoot) return;

      Array.from(root.querySelectorAll("tbody tr")).forEach((row, index) => {
        if (row instanceof HTMLTableRowElement) {
          row.dataset.officialRank = row.dataset.rank || String(index + 1);
        }
      });

      activate(root, "wins");

      function handleClick(event: Event) {
        const target = event.target as HTMLElement | null;
        const th = target?.closest("th");
        if (!(th instanceof HTMLTableCellElement) || !root.contains(th)) return;

        const headerRow = th.parentElement;
        if (!headerRow) return;
        const index = Array.from(headerRow.children).indexOf(th);

        if (index === 0) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (index === 2) {
          event.preventDefault();
          event.stopPropagation();
          winsDirection = activeSort === "wins" && winsDirection === "desc" ? "asc" : "desc";
          activate(root, "wins");
          return;
        }

        if (index === 3) {
          activate(root, "sessions");
          window.requestAnimationFrame(() => normalizeVisiblePositions(root));
          return;
        }

        if (index === 4) {
          activate(root, "winRate");
          window.requestAnimationFrame(() => normalizeVisiblePositions(root));
        }
      }

      root.addEventListener("click", handleClick);

      const tbody = root.querySelector("tbody");
      const tbodyObserver = new MutationObserver(() => {
        if (sorting) return;

        window.requestAnimationFrame(() => {
          if (activeSort === "wins") {
            sortWins(root);
          } else {
            normalizeVisiblePositions(root);
          }
        });
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
