"use client";

export default function LateRsvpModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="text-3xl">⚽️</div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
          Schön, dass du dabei bist!
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Leider bist du etwas spät dran 😄
        </p>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-950">
          {message}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          Alles klar
        </button>
      </div>
    </div>
  );
}
