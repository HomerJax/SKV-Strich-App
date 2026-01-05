import "./globals.css";
import Image from "next/image";
import BottomNav from "../components/BottomNav";

export const metadata = {
  title: "SKV Strich App",
  description: "Aufstellung, Striche & Trainings",
  themeColor: "#000000",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-slate-50 min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
          {/* HEADER – Schwarz / Glas-Effekt */}
          <header className="sticky top-0 z-50 border-b border-black/30 bg-black/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-white/10">
                <Image
                  src="/logo.png"
                  alt="SKV Logo"
                  width={36}
                  height={36}
                />
              </div>

              <div>
                <h1 className="text-base font-semibold text-white">
                  SKV Strich App
                </h1>
                <p className="text-[11px] text-gray-300">
                  Aufstellung • Striche • Trainings
                </p>
              </div>
            </div>
          </header>

          {/* INHALT */}
          <main className="flex-1 px-4 py-4 pb-16">{children}</main>
        </div>

        {/* BOTTOM NAV – dunkel, mit aktivem Tab */}
        <BottomNav />
      </body>
    </html>
  );
}
