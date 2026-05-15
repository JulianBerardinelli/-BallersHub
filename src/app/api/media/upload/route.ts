import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

/**
 * Compose a meaningful default alt-text for a media item when the
 * uploader didn't supply one. Pricing matrix §E item #5 — Pro pages
 * need optimized alt-tags on every image for accessibility + Google
 * Images SEO, but we can't gate on the player remembering to fill it.
 *
 * Pattern: `{Player full name} — {positions joined} · {current club}`.
 * Falls back to just `{fullName}` when fields are missing. Always
 * returns a non-empty string so the column never holds an empty alt.
 */
function buildDefaultAltText(profile: {
  full_name: string | null;
  positions: string[] | null;
  current_club: string | null;
}): string {
  const name = profile.full_name?.trim() || "Futbolista";
  const segments: string[] = [name];
  if (profile.positions && profile.positions.length > 0) {
    segments.push(profile.positions.slice(0, 2).join(" / "));
  }
  if (profile.current_club && profile.current_club.trim().length > 0) {
    segments.push(profile.current_club.trim());
  }
  return segments.join(" — ");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Player Profile (id + slug + alt-text composition fields).
    // We pull `slug` so we can revalidate the public page after the
    // upload lands, and `full_name`/`positions`/`current_club` so the
    // server can compose a default alt-text when the form didn't
    // supply one.
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id, slug, full_name, positions, current_club")
      .eq("user_id", user.id)
      .single<{
        id: string;
        slug: string | null;
        full_name: string | null;
        positions: string[] | null;
        current_club: string | null;
      }>();

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
    const rawAltText = formData.get("altText") as string | null;
    const tagsString = formData.get("tags") as string | null;

    // Server-default alt-text: when the form omits/empties altText,
    // synthesize one from the player's name + position + current club.
    // This satisfies pricing matrix §E #5 (optimized alt-tags on
    // multimedia) without requiring the player to fill the field.
    const altText =
      rawAltText && rawAltText.trim().length > 0
        ? rawAltText.trim()
        : buildDefaultAltText(profile);
    
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

    // New approved media means the public gallery and OG image
    // (which can use the new avatar / hero) must re-render. Bust the
    // 1h ISR window so the player sees their upload immediately on
    // their public profile.
    revalidatePlayerPublicProfile(profile.slug ?? null);

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
