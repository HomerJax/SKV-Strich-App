"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fetchImageAsFile } from "@/lib/share/utils";
import { useI18n } from "@/components/i18n/I18nProvider";

const TABLE_ID = "export-standings";
const PORTAL_ID = "standings-top10-share-portal";

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export default function StandingsTop10Share() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const season = searchParams.get("season");
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    function mountAboveTable() {
      const table = document.getElementById(TABLE_ID);
      if (!table?.parentElement) return false;

      let mount = document.getElementById(PORTAL_ID);
      if (!mount) {
        mount = document.createElement("div");
        mount.id = PORTAL_ID;
        mount.className = "mb-4";
        table.parentElement.insertBefore(mount, table);
      }

      setPortalTarget(mount);
      return true;
    }

    if (!mountAboveTable()) {
      observer = new MutationObserver(() => {
        if (mountAboveTable()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      document.getElementById(PORTAL_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        setPreparing(true);
        setPreparedFile(null);
        setMessage(null);

        const params = new URLSearchParams();
        if (season) params.set("season", season);
        params.set("lang", locale);
        params.set("ts", String(Date.now()));
        const imageUrl = `/api/share/standings/image?${params.toString()}`;
        const file = await fetchImageAsFile(imageUrl, "strikr-top-10.png");

        if (cancelled) return;
        setPreparedFile(file);
      } catch (error) {
        if (cancelled) return;
        setPreparedFile(null);
        setMessage(
          error instanceof Error
            ? error.message
            : t("standings.top10PrepareFailed")
        );
      } finally {
        if (!cancelled) setPreparing(false);
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [season, locale, t]);

  async function shareNative(file: File) {
    if (!Capacitor.isPluginAvailable("Share") || !Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error("NATIVE_SHARE_UPDATE_REQUIRED");
    }

    const data = await fileToBase64(file);
    const path = `share/${Date.now()}-strikr-top-10.png`;
    const written = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: t("standings.top10ShareTitle"),
      files: [written.uri],
      dialogTitle: t("standings.top10DialogTitle"),
    });
  }

  async function handleShare() {
    if (!preparedFile || sharing) return;

    setSharing(true);
    setMessage(null);

    try {
      if (Capacitor.isNativePlatform()) {
        await shareNative(preparedFile);
        setMessage(t("standings.top10Shared"));
        return;
      }

      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        setMessage(t("standings.top10Unsupported"));
        return;
      }

      if (typeof navigator.canShare === "function") {
        const canShareFiles = navigator.canShare({
          files: [preparedFile],
        });

        if (!canShareFiles) {
          throw new Error(
            t("standings.top10Unsupported")
          );
        }
      }

      await navigator.share({
        files: [preparedFile],
      });

      setMessage(t("standings.top10Shared"));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "NATIVE_SHARE_UPDATE_REQUIRED") {
        setMessage(t("standings.nativeShareUpdate"));
        return;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const sizeKb = Math.max(1, Math.round(preparedFile.size / 1024));
        const detail = error.message?.trim() || "ohne weitere Meldung";
        setMessage(
          `Share abgebrochen: ${error.name}: ${detail} · ${preparedFile.type || "kein MIME-Type"} · ${sizeKb} KB`
        );
        return;
      }

      setMessage(
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : t("standings.top10ShareFailed")
      );
    } finally {
      setSharing(false);
    }
  }

  const content = (
    <section className="standings-top10-share rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">{t("standings.shareSection")}</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-500">
            {t("standings.top10ShareHint")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={preparing || sharing || !preparedFile}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {preparing || !preparedFile
            ? t("standings.top10Preparing")
            : sharing
              ? t("standings.sharing")
              : t("standings.shareTop10")}
        </button>
      </div>

      {message ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {message}
        </div>
      ) : null}
    </section>
  );

  return portalTarget ? createPortal(content, portalTarget) : null;
}
