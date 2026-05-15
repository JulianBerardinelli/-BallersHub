import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function GET() {
  try {
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

    const { data: articles, error } = await supabase
      .from("player_articles")
      .select("*")
      .eq("player_id", profile.id)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles });
  } catch (error: unknown) {
    console.error("Fetch articles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const { title, url, imageUrl, publisher, publishedAt } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from("player_articles")
      .insert({
        player_id: profile.id,
        title,
        url,
        image_url: imageUrl || null,
        publisher: publisher || null,
        published_at: publishedAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert article error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ article: inserted });
  } catch (error: unknown) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
