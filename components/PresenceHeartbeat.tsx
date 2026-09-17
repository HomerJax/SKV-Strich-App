"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    let stopped = false;

    const sendHeartbeat = () => {
      if (stopped || document.visibilityState === "hidden") return;

      void fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 45_000);
    window.addEventListener("focus", sendHeartbeat);
    document.addEventListener("visibilitychange", sendHeartbeat);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", sendHeartbeat);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, [pathname]);

  return null;
}
