import { requirePowerUser } from "@/lib/auth/power-user";
import AdminSetupPage from "@/app/admin/setup/page";

export const dynamic = "force-dynamic";

export default async function WizardSimulatorPage() {
  await requirePowerUser();
  return <AdminSetupPage searchParams={Promise.resolve({ qa: "1" })} />;
}
