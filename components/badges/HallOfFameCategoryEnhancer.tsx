"use client";

import { useEffect } from "react";

type CategoryMeta = {
  key: string;
  title: string;
  subtitle: string;
};

const CATEGORIES: CategoryMeta[] = [
  {
    key: "career-appearances",
    title: "Karriere · Einsätze",
    subtitle: "250 als Gold+ · 500 als GOAT – bis zur Club-Legende.",
  },
  {
    key: "career-wins",
    title: "Karriere · Siege",
    subtitle: "Deine gewonnenen Spiele über alle Saisons.",
  },
  {
    key: "attendance",
    title: "Teilnahme & Disziplin",
    subtitle: "Dranbleiben, wiederkommen, keine Einheit verpassen.",
  },
  {
    key: "wins",
    title: "Siege & Serien",
    subtitle: "Vom ersten Dreier bis zur legendären Siegesserie.",
  },
  {
    key: "losses",
    title: "Pech & Niederlagen",
    subtitle: "Auch schlechte Läufe schreiben Geschichten.",
  },
  {
    key: "special",
    title: "Specials & Secret",
    subtitle: "Seltene Momente und versteckte Achievements.",
  },
];

const SPECIAL_KEYS = new Set([
  "curse_broken",
  "resilient",
  "lucky_charm",
  "comeback",
]);

function categoryForBadgeKey(badgeKey: string) {
  if (badgeKey.startsWith("career_appearances_")) return "career-appearances";
  if (badgeKey.startsWith("career_wins_")) return "career-wins";
  if (badgeKey === "season_kickoff" || badgeKey.startsWith("attendance_streak_")) {
    return "attendance";
  }
  if (badgeKey.startsWith("win_streak_")) return "wins";
  if (badgeKey.startsWith("loss_streak_")) return "losses";
  if (SPECIAL_KEYS.has(badgeKey)) return "special";
  return "special";
}

function findSectionByHeading(text: string) {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((item) => item.textContent?.trim() === text);
  return heading?.closest("section") ?? null;
}

function findBadgeGrid(section: Element) {
  const candidates = Array.from(section.querySelectorAll("div"));
  return (
    candidates.find((candidate) => {
      const directArticles = Array.from(candidate.children).filter(
        (child) => child.tagName === "ARTICLE",
      );
      return directArticles.length > 0;
    }) ?? null
  );
}

function badgeKeyFromArticle(article: Element) {
  return article.querySelector("[title]")?.getAttribute("title")?.trim() ?? "";
}

function buildCategoryHeader(meta: CategoryMeta, tone: "earned" | "open") {
  const header = document.createElement("div");
  header.className = "hof-category-header";

  const title = document.createElement("div");
  title.className = "hof-category-title";
  title.textContent = meta.title;

  const subtitle = document.createElement("div");
  subtitle.className = "hof-category-subtitle";
  subtitle.textContent = meta.subtitle;

  header.append(title, subtitle);
  header.dataset.tone = tone;
  return header;
}

function categorizeGrid(grid: Element, tone: "earned" | "open") {
  if (grid.getAttribute("data-hof-categorized") === "true") return true;

  const articles = Array.from(grid.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "ARTICLE",
  );

  if (articles.length === 0) return false;

  const buckets = new Map<string, HTMLElement[]>();
  for (const meta of CATEGORIES) buckets.set(meta.key, []);

  for (const article of articles) {
    const badgeKey = badgeKeyFromArticle(article);
    const category = categoryForBadgeKey(badgeKey);
    buckets.get(category)?.push(article);
  }

  grid.setAttribute("data-hof-categorized", "true");
  grid.classList.add("hof-categorized-root");

  for (const meta of CATEGORIES) {
    const categoryArticles = buckets.get(meta.key) ?? [];
    if (categoryArticles.length === 0) continue;

    const block = document.createElement("section");
    block.className = "hof-category-block";
    block.dataset.category = meta.key;
    block.dataset.tone = tone;

    const shelf = document.createElement("div");
    shelf.className = "hof-category-shelf";

    const innerGrid = document.createElement("div");
    innerGrid.className = "hof-category-grid";

    for (const article of categoryArticles) innerGrid.appendChild(article);

    shelf.appendChild(innerGrid);
    block.append(buildCategoryHeader(meta, tone), shelf);
    grid.appendChild(block);
  }

  return true;
}

export default function HallOfFameCategoryEnhancer() {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const enhance = () => {
      const earnedSection =
        findSectionByHeading("Mein Trophäenschrank") ??
        findSectionByHeading("Trophäenschrank");
      const openSection = findSectionByHeading("Was geht noch?");

      let earnedDone = false;
      let openDone = false;

      if (earnedSection) {
        const grid = findBadgeGrid(earnedSection);
        if (grid) earnedDone = categorizeGrid(grid, "earned");
      }

      if (openSection) {
        const grid = findBadgeGrid(openSection);
        if (grid) openDone = categorizeGrid(grid, "open");
      }

      if (earnedDone && openDone) observer?.disconnect();
    };

    enhance();

    observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => observer?.disconnect(), 8000);

    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
    };
  }, []);

  return null;
}
