"use client";

import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function LogoutButton({
  className = "",
  children,
}: LogoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Logout API returned non-OK status:", response.status);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={className}
      aria-busy={isSubmitting}
    >
      {children ?? (isSubmitting ? "Logging out..." : "Logout")}
    </button>
  );
}