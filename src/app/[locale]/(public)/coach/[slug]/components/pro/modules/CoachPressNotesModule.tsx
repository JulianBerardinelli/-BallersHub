"use client";

// Pro coach — Press & Notes (#press). Reuses the player's agnostic
// `ProfilePressNotesModule` in CARDS layout (owner decision) fed with
// coach_articles. The underlying module already returns null when the list is
// empty and renders its own id="press" section, so the wrapper only maps the
// coach article shape onto the module's `Article` shape.
//
// The page only passes articles to this module when there ARE articles, but we
// keep the empty guard so the section never renders an empty header.

import ProfilePressNotesModule from "@/app/[locale]/(public)/[slug]/components/modules/ProfilePressNotesModule";
import type { CoachArticleRow } from "../../CoachPortfolio";

export type CoachPressNotesModuleProps = {
  articles: CoachArticleRow[];
};

export default function CoachPressNotesModule({ articles }: CoachPressNotesModuleProps) {
  if (!articles || articles.length === 0) return null;

  const mapped = articles.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    imageUrl: a.imageUrl,
    publisher: a.publisher,
    publishedAt: a.publishedAt,
    position: a.position,
  }));

  return <ProfilePressNotesModule articles={mapped} layout="cards" />;
}
