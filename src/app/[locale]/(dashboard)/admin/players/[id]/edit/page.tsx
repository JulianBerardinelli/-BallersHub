import { redirect } from "next/navigation";

export default async function AdminPlayerEditIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/players/${id}/edit/datos`);
}
