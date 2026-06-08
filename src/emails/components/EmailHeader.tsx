import { Img, Section } from "@react-email/components";
import { siteUrl } from "../tokens";

/**
 * Brand header — full 'BallersHub imagotipo (isotipo + wordmark lockup).
 *
 * Served as **PNG** from `/public/images/logo/imagotipo-lime.png` (rasterized
 * 2x from `imagotipo-lime.svg`, the two-tone lockup: lime isotipo + 'BALLERS in
 * lime + HUB in white). Two reasons it's a rasterized image, not SVG + live text:
 *   - Gmail and Outlook strip inline SVG → a broken image for most recipients.
 *   - The wordmark is Barlow Condensed Black (see `src/components/brand/Wordmark.tsx`),
 *     a font email clients can't load. Live text fell back to Helvetica and looked
 *     lighter than the real logo; rasterizing bakes the exact weight in.
 *
 * `alt` keeps the brand name visible if images are blocked.
 */
export function EmailHeader() {
  const logoUrl = `${siteUrl}/images/logo/imagotipo-lime.png`;

  return (
    <Section style={wrapStyle}>
      <a href={siteUrl} style={linkStyle}>
        <Img src={logoUrl} alt="'BallersHub" width="200" height="32" style={logoStyle} />
      </a>
    </Section>
  );
}

const wrapStyle: React.CSSProperties = {
  padding: "8px 0 28px",
  textAlign: "left",
};

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
};

const logoStyle: React.CSSProperties = {
  display: "block",
  width: "200px",
  height: "32px",
  border: 0,
  outline: "none",
  textDecoration: "none",
};
