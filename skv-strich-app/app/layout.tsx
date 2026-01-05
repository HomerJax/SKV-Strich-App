import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SKV Strich App",
  description: "Aufstellung • Striche • Trainings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {/* HEADER */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">

            {/* Vereinslogo – aus public/logo.png */}
            <img
              src="/logo.png"
              alt="Vereinslogo"
              className="h-10 w-10 rounded-full border shadow-sm"
            />

            <div className="flex flex-col">
              <span className="font-bold text-slate-900">
                SKV Strich App
              </span>
              <span className="text-xs text-slate-500">
                Aufstellung • Striche • Trainings
              </span>
            </div>
          </div>
        </header>

        {/* INHALT */}
        <main className="mx-auto max-w-5xl px-4 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}
