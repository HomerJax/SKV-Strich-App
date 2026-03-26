"use client";

import LogoutButton from "@/components/LogoutButton";

export default function AdminLogoutButton() {
  return (
    <LogoutButton className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60">
      Logout
    </LogoutButton>
  );
}