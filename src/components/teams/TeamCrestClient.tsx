"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import TeamCrest from "./TeamCrest";

export default function TeamBadgeClient({ teamId, href }: { teamId: string; href?: string }) {
  const [name, setName] = React.useState<string | null>(null);
  const [crest, setCrest] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function run() {
      const { data, error } = await supabase
        .from("teams")
        .select("name, crest_url, updated_at")
        .eq("id", teamId)
        .maybeSingle();
      if (!active) return;
      if (!error && data) {
        const src = data.crest_url ? `${data.crest_url}?v=${Date.parse(data.updated_at ?? "") || 0}` : null;
        setName(data.name ?? null);
        setCrest(src);
      }
    }
    run();
    return () => { active = false; };
  }, [teamId]);

  const content = (
    <span className="inline-flex items-center gap-2">
      <TeamCrest src={crest} size={18} />
      <span className="truncate max-w-[220px]">{name ?? "Equipo"}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="underline">
        {content}
      </a>
    );
  }
  return content;
}
