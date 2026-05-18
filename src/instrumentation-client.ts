// Vercel BotID — client-side init. Next 15.3+ recommended path.
//
// The `protect` list tells BotID which fetches (from a page in our
// app) should carry the bot-challenge headers. The server then
// validates them via `checkBotId()` in the matching route handler.
//
// Local dev always returns isBot: false unless we pass
// developmentOptions to checkBotId() — fine for now, we test in
// preview/prod.
//
// Pricing: Basic tier (free on all plans) catches most automation.
// Deep Analysis ($1/1000 checks) needs to be enabled per-project in
// the Vercel dashboard → Firewall → Rules. Recommended for these two
// routes once we confirm Basic doesn't false-positive on real users.
import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    // Player application submission — creates a player_applications
    // row + KYC docs in storage. High-value target for automation
    // (fake players, KYC photo dumps). Called from
    // src/app/(onboarding)/onboarding/player/apply/ApplyFlow.tsx
    // → Step3Verify.tsx after the user uploads their docs.
    { path: "/api/onboarding/submit", method: "POST" },

    // Lead capture on public portfolios — anyone unlocking contact
    // on /[slug] leaves an email. Highest exposure (no auth, public
    // URL, every shared profile is a potential entry point for
    // email-collection bots). Called from
    // src/app/(public)/[slug]/components/modules/ContactPortfolioModule.tsx
    { path: "/api/portfolio/*/lead", method: "POST" },
  ],
});
