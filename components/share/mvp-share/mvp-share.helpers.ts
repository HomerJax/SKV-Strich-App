import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlayerRow } from "./mvp-share.types";

export async function getPublicAssetDataUrl(
  filePath: string,
  mimeType: string
) {
  const file = await readFile(path.join(process.cwd(), "public", filePath));
  return `data:${mimeType};base64,${file.toString("base64")}`;
}

export async function getPublicSvgDataUrlWithFill(
  filePath: string,
  fill: string
) {
  const file = await readFile(
    path.join(process.cwd(), "public", filePath),
    "utf8"
  );

  const svg = file
    .replace(/fill="#030303"/g, `fill="${fill}"`)
    .replace(/fill="#000000"/g, `fill="${fill}"`)
    .replace(/fill="black"/g, `fill="${fill}"`);

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function getStorageImageDataUrl({
  bucket,
  filePath,
}: {
  bucket: string;
  filePath: string | null | undefined;
}) {
  if (!filePath) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(filePath);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || "image/png";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function getName(player?: PlayerRow | null) {
  return (
    [player?.first_name, player?.last_name].filter(Boolean).join(" ") ||
    "Spieler"
  );
}

export function formatDateDE(date: string | null | undefined) {
  if (!date) return "Training";

  return new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getBadgeLabel(count: number) {
  if (count >= 10) return "GOAT";
  if (count >= 7) return "Gold";
  if (count >= 5) return "Silber";
  if (count >= 3) return "Bronze";
  if (count >= 1) return "Blech";
  return "Kein Badge";
}

export function getEarnedBadgeText(count: number) {
  if (count >= 10) return "GOAT Badge verdient";
  if (count >= 7) return "Goldenes Badge verdient";
  if (count >= 5) return "Silbernes Badge verdient";
  if (count >= 3) return "Bronzenes Badge verdient";
  if (count >= 1) return "Blechernes Badge verdient";
  return "Badge-Fortschritt";
}