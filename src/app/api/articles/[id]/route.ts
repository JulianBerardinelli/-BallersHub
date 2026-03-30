import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerRSC();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("player_articles")
      .delete()
      .eq("id", id)
      .eq("player_id", profile.id);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error("Article deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
