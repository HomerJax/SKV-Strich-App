"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type CategoryMeta = {
  key: string;
  title: string;
  subtitle: string;
};

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

function categorizeGrid(
  grid: Element,
  tone: "earned" | "open",
  categories: CategoryMeta[],
) {
  if (grid.getAttribute("data-hof-categorized") === "true") return true;

  const articles = Array.from(grid.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "ARTICLE",
  );

  if (articles.length === 0) return false;

  const buckets = new Map<string, HTMLElement[]>();
  for (const meta of categories) buckets.set(meta.key, []);

  for (const article of articles) {
    const badgeKey = badgeKeyFromArticle(article);
    const category = categoryForBadgeKey(badgeKey);
    buckets.get(category)?.push(article);
  }

  grid.setAttribute("data-hof-categorized", "true");
  grid.classList.add("hof-categorized-root");

  for (const meta of categories) {
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
  const { t, locale } = useI18n();

  const categories = useMemo<CategoryMeta[]>(
    () => [
      {
        key: "career-appearances",
        title: t("badges.categoryCareerAppearances"),
        subtitle: t("badges.categoryCareerAppearancesHint"),
      },
      {
        key: "career-wins",
        title: t("badges.categoryCareerWins"),
        subtitle: t("badges.categoryCareerWinsHint"),
      },
      {
        key: "attendance",
        title: t("badges.categoryAttendance"),
        subtitle: t("badges.categoryAttendanceHint"),
      },
      {
        key: "wins",
        title: t("badges.categoryWins"),
        subtitle: t("badges.categoryWinsHint"),
      },
      {
        key: "losses",
        title: t("badges.categoryLosses"),
        subtitle: t("badges.categoryLossesHint"),
      },
      {
        key: "special",
        title: t("badges.categorySpecial"),
        subtitle: t("badges.categorySpecialHint"),
      },
    ],
    [t, locale],
  );

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const enhance = () => {
      const earnedSection =
        findSectionByHeading(t("badges.myTrophyCase")) ??
        findSectionByHeading(t("badges.trophyCase"));
      const openSection = findSectionByHeading(t("badges.whatNext"));

      let earnedDone = false;
      let openDone = false;

      if (earnedSection) {
        const grid = findBadgeGrid(earnedSection);
        if (grid) earnedDone = categorizeGrid(grid, "earned", categories);
      }

      if (openSection) {
        const grid = findBadgeGrid(openSection);
        if (grid) openDone = categorizeGrid(grid, "open", categories);
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
  }, [categories, locale, t]);

  return null;
}
