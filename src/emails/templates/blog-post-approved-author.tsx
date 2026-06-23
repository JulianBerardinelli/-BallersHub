import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type BlogPostApprovedAuthorProps = {
  /** Display name del autor (firstname-first si lo derivamos). */
  authorName: string;
  /** Título del post aprobado. */
  postTitle: string;
  /** Cluster label en español. */
  clusterLabel: string;
  /** URL pública del post: /blog/[slug]. */
  postUrl: string;
  /** URL del author hub: /blog/authors/[slug] — para que el autor vea su hub. */
  authorHubUrl?: string;
  recipientEmail?: string;
  /** Author's preferred_locale (F6 phase 3). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  preheader: (title: string) => string;
  eyebrow: string;
  heading: (name: string) => string;
  intro: string;
  ctaView: string;
  hubIntro: string;
  ctaHub: string;
  footer: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    preheader: (t) => `Publicamos "${t}".`,
    eyebrow: "Tu artículo está publicado",
    heading: (n) => `¡Listo, ${n}!`,
    intro: "Aprobamos tu post y ya está en vivo en el blog de 'BallersHub.",
    ctaView: "Ver mi artículo publicado",
    hubIntro:
      "También sumamos el post a tu página de autor. Podés compartir tu hub con clubes y agencias:",
    ctaHub: "Ver mi página de autor",
    footer:
      "Gracias por sumar contenido editorial al ecosistema. Los posts con más links a perfiles reales son los que mejor performance tienen — si querés escribir otro, abrí /blog/write desde tu dashboard.",
  },
  en: {
    preheader: (t) => `We published "${t}".`,
    eyebrow: "Your article is published",
    heading: (n) => `You're live, ${n}!`,
    intro: "We approved your post and it's now live on the 'BallersHub blog.",
    ctaView: "View my published article",
    hubIntro:
      "We also added the post to your author page. You can share your hub with clubs and agencies:",
    ctaHub: "View my author page",
    footer:
      "Thanks for adding editorial content to the ecosystem. Posts with more links to real profiles perform best — if you want to write another, open /blog/write from your dashboard.",
  },
  it: {
    preheader: (t) => `Abbiamo pubblicato "${t}".`,
    eyebrow: "Il tuo articolo è pubblicato",
    heading: (n) => `È online, ${n}!`,
    intro: "Abbiamo approvato il tuo post ed è ora online sul blog di 'BallersHub.",
    ctaView: "Vedi il mio articolo pubblicato",
    hubIntro:
      "Abbiamo anche aggiunto il post alla tua pagina autore. Puoi condividere il tuo hub con club e agenzie:",
    ctaHub: "Vedi la mia pagina autore",
    footer:
      "Grazie per aver aggiunto contenuti editoriali all'ecosistema. I post con più link a profili reali sono quelli che rendono meglio — se vuoi scriverne un altro, apri /blog/write dalla tua dashboard.",
  },
  pt: {
    preheader: (t) => `Publicamos "${t}".`,
    eyebrow: "Seu artigo está publicado",
    heading: (n) => `Está no ar, ${n}!`,
    intro: "Aprovamos seu post e ele já está no ar no blog da 'BallersHub.",
    ctaView: "Ver meu artigo publicado",
    hubIntro:
      "Também adicionamos o post à sua página de autor. Você pode compartilhar seu hub com clubes e agências:",
    ctaHub: "Ver minha página de autor",
    footer:
      "Obrigado por adicionar conteúdo editorial ao ecossistema. Os posts com mais links para perfis reais são os que têm melhor desempenho — se quiser escrever outro, abra /blog/write no seu painel.",
  },
  de: {
    preheader: (t) => `Wir haben "${t}" veröffentlicht.`,
    eyebrow: "Dein Artikel ist veröffentlicht",
    heading: (n) => `Du bist online, ${n}!`,
    intro: "Wir haben deinen Beitrag freigegeben und er ist jetzt im 'BallersHub-Blog online.",
    ctaView: "Meinen veröffentlichten Artikel ansehen",
    hubIntro:
      "Wir haben den Beitrag außerdem zu deiner Autorenseite hinzugefügt. Du kannst deinen Hub mit Klubs und Agenturen teilen:",
    ctaHub: "Meine Autorenseite ansehen",
    footer:
      "Danke, dass du redaktionelle Inhalte zum Ökosystem beiträgst. Beiträge mit mehr Links zu echten Profilen schneiden am besten ab — wenn du einen weiteren schreiben möchtest, öffne /blog/write in deinem Dashboard.",
  },
  fr: {
    preheader: (t) => `Nous avons publié "${t}".`,
    eyebrow: "Ton article est publié",
    heading: (n) => `Tu es en ligne, ${n} !`,
    intro: "Nous avons approuvé ton article et il est désormais en ligne sur le blog 'BallersHub.",
    ctaView: "Voir mon article publié",
    hubIntro:
      "Nous avons aussi ajouté l'article à ta page auteur. Tu peux partager ton hub avec des clubs et des agences :",
    ctaHub: "Voir ma page auteur",
    footer:
      "Merci d'enrichir l'écosystème avec du contenu éditorial. Les articles avec le plus de liens vers de vrais profils sont les plus performants — si tu veux en écrire un autre, ouvre /blog/write depuis ton tableau de bord.",
  },
  fi: {
    preheader: (t) => `Julkaisimme artikkelin "${t}".`,
    eyebrow: "Artikkelisi on julkaistu",
    heading: (n) => `Olet linjoilla, ${n}!`,
    intro: "Hyväksyimme artikkelisi, ja se on nyt julkaistu 'BallersHubin blogissa.",
    ctaView: "Katso julkaistu artikkelini",
    hubIntro:
      "Lisäsimme artikkelin myös kirjoittajasivullesi. Voit jakaa hubisi seurojen ja agentuurien kanssa:",
    ctaHub: "Katso kirjoittajasivuni",
    footer:
      "Kiitos, että tuot toimituksellista sisältöä ekosysteemiin. Artikkelit, joissa on eniten linkkejä oikeisiin profiileihin, menestyvät parhaiten — jos haluat kirjoittaa toisen, avaa /blog/write hallintapaneelistasi.",
  },
};

/**
 * Notifica al autor blogger que su post fue aprobado y publicado.
 *
 * Localized (F6 phase 3): copy follows the author's preferred_locale (resolved
 * in resend.ts); falls back to es. Post title + cluster label stay verbatim.
 */
export default function BlogPostApprovedAuthorEmail({
  authorName,
  postTitle,
  clusterLabel,
  postUrl,
  authorHubUrl,
  recipientEmail,
  locale = "es",
}: BlogPostApprovedAuthorProps) {
  const firstName = (authorName || "").split(" ")[0] || authorName;
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout
      preheader={c.preheader(postTitle)}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro}</EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{postTitle}</strong>
        </EmailParagraph>
        <EmailParagraph tone="muted">{clusterLabel}</EmailParagraph>
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={postUrl} variant="lime">
          {c.ctaView}
        </EmailButton>
      </div>

      {authorHubUrl && (
        <>
          <EmailDivider tone="subtle" spacing={24} />
          <EmailParagraph tone="muted">{c.hubIntro}</EmailParagraph>
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <EmailButton href={authorHubUrl} variant="outline">
              {c.ctaHub}
            </EmailButton>
          </div>
        </>
      )}

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.footer}</EmailParagraph>
    </EmailLayout>
  );
}
