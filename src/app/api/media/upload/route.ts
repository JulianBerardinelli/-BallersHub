import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Player Profile ID
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const type = formData.get("type") as "photo" | "video";
    const title = formData.get("title") as string | null;
    const provider = formData.get("provider") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";
    const altText = formData.get("altText") as string | null;
    const tagsString = formData.get("tags") as string | null;
    
    // Parse tags array
    let tags: string[] | null = null;
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
      } catch (e) {
        tags = tagsString.split(",").map(t => t.trim()).filter(Boolean);
      }
    }

    if (!type) {
      return NextResponse.json({ error: "Media type is required" }, { status: 400 });
    }

    let publicUrl = url || "";

    // Upload local file if provided
    if (file && !url) {
      // Validate file size (5MB for images, 50MB for videos)
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
      const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

      if (type === "photo" && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Image size exceeds 5MB limit" }, { status: 400 });
      }
      if (type === "video") {
        return NextResponse.json({ error: "La subida de archivos de video está reservada para usuarios Pro. Por favor, utiliza un link de YouTube o Vimeo." }, { status: 403 });
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `gallery/${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Assume bucket name is 'player-media'
      const { error: uploadError } = await supabase.storage
        .from("player-media")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("player-media").getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
    }

    if (!publicUrl) {
      return NextResponse.json({ error: "File or external URL is required" }, { status: 400 });
    }

    // Insert record
    const { data: mediaRecord, error: insertError } = await supabase
      .from("player_media")
      .insert({
        player_id: profile.id,
        type,
        url: publicUrl,
        title,
        alt_text: altText,
        tags,
        provider,
        is_primary: isPrimary,
        is_approved: true, // Reactive mode
        is_flagged: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save media record in database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
