import { redirect } from "next/navigation";

export default async function InvitesPage() {
  redirect("/admin/members");
}