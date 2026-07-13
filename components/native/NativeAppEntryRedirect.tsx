"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

export default function NativeAppEntryRedirect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    window.location.replace("/login");
  }, []);

  return null;
}
