import { NextResponse } from "next/server";
import ogs from "open-graph-scraper";
import type { ImageObject, TwitterImageObject } from "open-graph-scraper/types";

import { createSupabaseServerRSC } from "@/lib/supabase/server";

const SCRAPE_TIMEOUT_SECONDS = 8;

type SafeUrlResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

function isSafeUrl(raw: string): SafeUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "URL inválida" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Solo se permite http o https" };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return { ok: false, reason: "Host no permitido" };
  }
  if (/^(10\.|127\.|169\.254\.|192\.168\.)/.test(host)) {
    return { ok: false, reason: "Host no permitido" };
  }
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) {
    return { ok: false, reason: "Host no permitido" };
  }
  return { ok: true, url: parsed };
}

function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function pickFirst<T>(arr: T[] | undefined): T | undefined {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
}

type JsonLDLike = {
  headline?: string;
  datePublished?: string;
  publisher?: { name?: string } | string;
  image?: string | { url?: string } | (string | { url?: string })[];
};

function extractJsonLD(jsonLD: object[] | undefined): JsonLDLike | undefined {
  if (!Array.isArray(jsonLD) || jsonLD.length === 0) return undefined;
  return jsonLD[0] as JsonLDLike;
}

function jsonLDPublisher(node: JsonLDLike | undefined): string | undefined {
  if (!node?.publisher) return undefined;
  if (typeof node.publisher === "string") return node.publisher;
  return node.publisher.name ?? undefined;
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

    const body = (await req.json().catch(() => null)) as { url?: string } | null;
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    }

    const validation = isSafeUrl(rawUrl);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    const ogsResult = await ogs({
      url: validation.url.toString(),
      timeout: SCRAPE_TIMEOUT_SECONDS,
      fetchOptions: {
        headers: {
          "User-Agent": "BallersHubBot/1.0 (+https://ballershub.co)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        },
      },
    });

    if (ogsResult.error) {
      return NextResponse.json(
        { error: "No pudimos leer la página" },
        { status: 422 },
      );
    }

    const result = ogsResult.result;
    const ld = extractJsonLD(result.jsonLD);

    const title = result.ogTitle || result.twitterTitle || result.dcTitle || ld?.headline || null;

    const ogImg = pickFirst<ImageObject>(result.ogImage);
    const twImg = pickFirst<TwitterImageObject>(result.twitterImage);
    let imageUrl = ogImg?.url || twImg?.url || null;
    if (!imageUrl && ld?.image) {
      if (typeof ld.image === "string") imageUrl = ld.image;
      else if (Array.isArray(ld.image)) {
        const first = ld.image[0];
        imageUrl = typeof first === "string" ? first : first?.url ?? null;
      } else if (typeof ld.image === "object") {
        imageUrl = ld.image.url ?? null;
      }
    }

    const publisher =
      result.ogSiteName ||
      jsonLDPublisher(ld) ||
      validation.url.hostname.replace(/^www\./, "") ||
      null;

    const publishedAt = normalizeDate(result.articlePublishedTime || ld?.datePublished);

    return NextResponse.json({
      title,
      imageUrl,
      publisher,
      publishedAt,
    });
  } catch (error) {
    console.error("Scrape endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
