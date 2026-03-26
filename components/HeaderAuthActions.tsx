"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type HeaderAuthActionsProps = {
  isLoggedIn?: boolean;
};

export default function HeaderAuthActions({
  isLoggedIn = true,
}: HeaderAuthActionsProps) {
  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <LogoutButton className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60">
        Logout
      </LogoutButton>
    </div>
  );
}