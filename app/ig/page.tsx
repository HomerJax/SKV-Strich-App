import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InstagramRedirectPage() {
  redirect("/?utm_source=instagram&utm_medium=bio&utm_campaign=supercup");
}
