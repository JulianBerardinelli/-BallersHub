import { redirect } from "next/navigation";

export default async function AdminCoachEditIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/coaches/${id}/edit/datos`);
}
