"use client";

import { useRef } from "react";
import * as htmlToImage from "html-to-image";
import MvpShareImage from "./MvpShareImage";
import type { MvpShareImageProps } from "./mvp-share.types";

type Props = MvpShareImageProps & {
  onReady?: (file: File) => void;
};

export default function MvpShareCapture(props: Props) {
  const ref = useRef<HTMLDivElement>(null);

  async function generate() {
    if (!ref.current) return null;

    const blob = await htmlToImage.toBlob(ref.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#000",
    });

    if (!blob) return null;

    return new File([blob], "strikr-mvp.png", {
      type: "image/png",
    });
  }

  async function handleGenerate() {
    const file = await generate();
    if (file && props.onReady) props.onReady(file);
  }

  return (
    <div className="fixed left-[-9999px] top-[-9999px]">
      <div ref={ref}>
        <MvpShareImage {...props} />
      </div>

      {/* optional trigger */}
      <button onClick={handleGenerate}>Generate</button>
    </div>
  );
}