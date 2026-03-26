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
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Harte Navigation ist hier absichtlich robuster als rein clientseitiges router.push,
      // weil wir sicherstellen wollen, dass nach Cookie-/Session-Löschung alles frisch geladen wird.
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