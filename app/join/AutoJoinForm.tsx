"use client";

import { useEffect, useRef } from "react";

type AutoJoinFormProps = {
  token: string;
};

export default function AutoJoinForm({ token }: AutoJoinFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    form.requestSubmit();
  }, []);

  return (
    <form ref={formRef} method="post" action="/api/join">
      <input type="hidden" name="token" value={token} />
      <noscript>
        <button
          type="submit"
          className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Einladung annehmen
        </button>
      </noscript>
    </form>
  );
}