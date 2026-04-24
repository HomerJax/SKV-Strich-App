import { fetchImageAsFile } from "@/lib/share/utils";

type ShareOptions = {
  sessionId: number;
  isWinner: boolean;
  clubInstagram?: string | null;
};

export async function shareMvpResult({
  sessionId,
  isWinner,
  clubInstagram,
}: ShareOptions) {
  const imageUrl = `${window.location.origin}/api/share/mvp/${sessionId}/image?ts=${Date.now()}`;
  const sessionUrl = `${window.location.origin}/sessions/${sessionId}`;

  let file: File | null = null;

  try {
    file = await fetchImageAsFile(imageUrl, `strikr-mvp-${sessionId}.png`);
  } catch {
    file = null;
  }

  const teamLine = clubInstagram
    ? `Markiere ${clubInstagram} + @getstrikr`
    : "Markiere dein Team + @getstrikr";

  const text = isWinner
    ? `🏆 Ich bin MVP!

${teamLine}
#strikr`
    : `⭐ MVP Voting ist durch!

${teamLine}
#strikr`;

  if (
    typeof navigator !== "undefined" &&
    file &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      text,
    });
    return;
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      text: `${text}\n\n${sessionUrl}`,
    });
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${text}\n\n${sessionUrl}`);
  }
}