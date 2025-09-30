import { redirect } from "next/navigation";

export default function LegacyProfileRedirect() {
  redirect("/dashboard/edit-profile/personal-data");
}
