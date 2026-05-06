import type { MvpShareImageProps } from "./mvp-share.types";
import WinnerLayout from "./WinnerLayout";
import TeamLayout from "./TeamLayout";

export default function MvpShareImage(props: MvpShareImageProps) {
  if (props.mode === "winner") {
    return <WinnerLayout {...props} />;
  }

  return <TeamLayout {...props} />;
}