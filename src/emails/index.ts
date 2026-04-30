/**
 * BallersHub email design system — public surface.
 *
 * Templates compose **only** from these primitives. Never write raw HTML
 * or hardcoded colors inside a template — the whole point of this module
 * is that re-skinning all emails (e.g. seasonal palette change) only
 * touches `tokens.ts` and the components below.
 */
export * from "./tokens";
export { EmailLayout } from "./components/EmailLayout";
export { EmailHeader } from "./components/EmailHeader";
export { EmailFooter } from "./components/EmailFooter";
export { EmailButton, type EmailButtonVariant } from "./components/EmailButton";
export { EmailHeading } from "./components/EmailHeading";
export { EmailParagraph } from "./components/EmailParagraph";
export { EmailDivider } from "./components/EmailDivider";
export { EmailCard } from "./components/EmailCard";
export { EmailEyebrow } from "./components/EmailEyebrow";
