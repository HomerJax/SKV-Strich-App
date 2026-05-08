import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isProductionEnv } from "@/lib/env";

type DevLayoutProps = {
  children: ReactNode;
};

export default function DevLayout({ children }: DevLayoutProps) {
  if (isProductionEnv()) {
    notFound();
  }

  return <>{children}</>;
}