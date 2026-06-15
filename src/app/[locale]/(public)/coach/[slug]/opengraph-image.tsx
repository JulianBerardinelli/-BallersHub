import { ImageResponse } from "next/og";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachProfiles } from "@/db/schema";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";

// node runtime: db uses node-postgres (pg), which can't run on edge.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

function brandOnly(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800, color: "#fff", letterSpacing: -2 }}>{title}</div>
        <div style={{ marginTop: 16, fontSize: 30, color: "#CCFF00" }}>{"'BallersHub"}</div>
      </div>
    ),
    { ...size },
  );
}

type RouteParams = { locale: string; slug: string };

export default async function CoachOgImage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;

  const [coach] = await db
    .select({
      fullName: coachProfiles.fullName,
      roleTitle: coachProfiles.roleTitle,
      currentClub: coachProfiles.currentClub,
      avatarUrl: coachProfiles.avatarUrl,
    })
    .from(coachProfiles)
    .where(
      and(
        eq(coachProfiles.slug, slug),
        eq(coachProfiles.visibility, "public"),
        eq(coachProfiles.status, "approved"),
      ),
    )
    .limit(1);

  if (!coach) return brandOnly("'BallersHub");

  const avatar = coach.avatarUrl ? toCanonicalUrl(coach.avatarUrl) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 90px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)",
          fontFamily: FONT,
        }}
      >
        {avatar && (
          <img
            src={avatar}
            alt=""
            width={300}
            height={300}
            style={{ width: 300, height: 300, borderRadius: 28, objectFit: "cover", border: "4px solid #CCFF00" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#CCFF00", letterSpacing: 1 }}>
            {(coach.roleTitle || "DIRECTOR TÉCNICO").toUpperCase()}
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.05, marginTop: 6 }}>
            {coach.fullName}
          </div>
          {coach.currentClub && (
            <div style={{ fontSize: 32, color: "#bbb", marginTop: 10 }}>{coach.currentClub}</div>
          )}
          <div style={{ fontSize: 24, color: "#888", marginTop: 28 }}>ballershub.co/coach/{slug}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
